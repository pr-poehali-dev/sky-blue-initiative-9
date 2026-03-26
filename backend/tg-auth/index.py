"""
Авторизация, профиль, товары, заказы, разделы страниц и управление для магазина FlavorClouds.
"""
import json
import os
import random
import string
import hashlib
import base64
import psycopg2
import urllib.request
import boto3
import uuid

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

_codes: dict = {}

SCHEMA = 't_p1532187_sky_blue_initiative_'


def send_telegram_message(chat_id: int, text: str):
    token = os.environ['TELEGRAM_BOT_TOKEN']
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def get_chat_id_by_username(username: str):
    token = os.environ['TELEGRAM_BOT_TOKEN']
    url = f"https://api.telegram.org/bot{token}/getUpdates?limit=100"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())

    username_clean = username.lstrip('@').lower()
    for update in data.get('result', []):
        msg = update.get('message') or update.get('my_chat_member', {})
        user = msg.get('from', {}) if isinstance(msg, dict) else {}
        if user.get('username', '').lower() == username_clean:
            return user.get('id')
    return None


def generate_code():
    return ''.join(random.choices(string.digits, k=5))


def generate_token():
    return hashlib.sha256(os.urandom(32)).hexdigest()


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def get_user_by_token(token: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, telegram_id, username, first_name, created_at, position FROM {SCHEMA}.users WHERE session_token = %s",
        (token,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row


def require_auth(event):
    token = (event.get('headers') or {}).get('X-Session-Token')
    if not token:
        return None, {'statusCode': 401, 'headers': CORS_HEADERS,
                      'body': json.dumps({'error': 'Не авторизован'})}
    row = get_user_by_token(token)
    if not row:
        return None, {'statusCode': 401, 'headers': CORS_HEADERS,
                      'body': json.dumps({'error': 'Сессия недействительна'})}
    return row, None


def ok(data: dict):
    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(data, ensure_ascii=False)}


def err(msg: str, code: int = 400):
    return {'statusCode': code, 'headers': CORS_HEADERS, 'body': json.dumps({'error': msg})}


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    # ── Отправка кода ────────────────────────────────────────────
    if action == 'send_code':
        username = body.get('username', '').strip()
        if not username:
            return err('Укажите username Telegram')

        chat_id = get_chat_id_by_username(username)
        if not chat_id:
            return err('Пользователь не найден. Сначала напишите боту любое сообщение.', 404)

        code = generate_code()
        _codes[username.lower().lstrip('@')] = {'code': code, 'chat_id': chat_id}
        send_telegram_message(chat_id, f"🔐 Ваш код для входа в FlavorClouds: <b>{code}</b>\n\nКод действителен 5 минут.")
        return ok({'ok': True, 'message': 'Код отправлен в Telegram'})

    # ── Верификация кода ─────────────────────────────────────────
    if action == 'verify_code':
        username = body.get('username', '').strip().lower().lstrip('@')
        code = body.get('code', '').strip()

        stored = _codes.get(username)
        if not stored or stored['code'] != code:
            return err('Неверный код')

        chat_id = stored['chat_id']
        token = generate_token()

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.users (telegram_id, username, session_token, updated_at)
               VALUES (%s, %s, %s, NOW())
               ON CONFLICT (telegram_id) DO UPDATE
               SET username = EXCLUDED.username, session_token = EXCLUDED.session_token, updated_at = NOW()
               RETURNING id, telegram_id, username, first_name, position""",
            (chat_id, username, token)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        del _codes[username]

        return ok({
            'ok': True,
            'token': token,
            'user': {
                'id': row[0], 'telegram_id': row[1],
                'username': row[2], 'first_name': row[3],
                'position': row[4],
            }
        })

    # ── Профиль ──────────────────────────────────────────────────
    if action == 'profile':
        row, error = require_auth(event)
        if error:
            return error
        user_id, telegram_id, username, first_name, created_at, position = row

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders WHERE user_id = %s AND status = 'done'", (user_id,))
        orders_count = cur.fetchone()[0]
        cur.close()
        conn.close()

        return ok({'ok': True, 'user': {
            'id': user_id, 'username': username, 'first_name': first_name,
            'created_at': created_at.isoformat() if created_at else None,
            'orders_count': orders_count,
            'position': position,
        }})

    # ── История заказов ───────────────────────────────────────────
    if action == 'orders':
        row, error = require_auth(event)
        if error:
            return error
        user_id = row[0]

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, status, total, items, note, created_at, address FROM {SCHEMA}.orders WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
            (user_id,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        orders = [
            {'id': r[0], 'status': r[1], 'total': r[2], 'items': r[3] if r[3] else [],
             'note': r[4], 'created_at': r[5].isoformat() if r[5] else None, 'address': r[6]}
            for r in rows
        ]
        return ok({'ok': True, 'orders': orders})

    # ── Фото профиля ──────────────────────────────────────────────
    if action == 'get_avatar':
        row, error = require_auth(event)
        if error:
            return error
        telegram_id = row[1]
        tg_token = os.environ['TELEGRAM_BOT_TOKEN']

        photos_url = f"https://api.telegram.org/bot{tg_token}/getUserProfilePhotos?user_id={telegram_id}&limit=1"
        req = urllib.request.Request(photos_url)
        with urllib.request.urlopen(req) as resp:
            photos_data = json.loads(resp.read())

        photos = photos_data.get('result', {}).get('photos', [])
        if not photos:
            return ok({'ok': True, 'avatar_url': None})

        file_id = photos[0][-1]['file_id']
        file_url = f"https://api.telegram.org/bot{tg_token}/getFile?file_id={file_id}"
        req2 = urllib.request.Request(file_url)
        with urllib.request.urlopen(req2) as resp2:
            file_data = json.loads(resp2.read())

        file_path = file_data['result']['file_path']
        avatar_url = f"https://api.telegram.org/file/bot{tg_token}/{file_path}"
        return ok({'ok': True, 'avatar_url': avatar_url})

    # ── Список товаров ────────────────────────────────────────────
    if action == 'get_products':
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, name, description, price, category, icon, active, brand, image_url, sort_order FROM {SCHEMA}.products ORDER BY category, brand NULLS LAST, sort_order, name"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        products = [
            {'id': r[0], 'name': r[1], 'description': r[2], 'price': r[3],
             'category': r[4], 'icon': r[5], 'active': r[6],
             'brand': r[7], 'image_url': r[8], 'sort_order': r[9]}
            for r in rows
        ]
        return ok({'ok': True, 'products': products})

    # ── Добавить товар (admin) ─────────────────────────────────────
    if action == 'add_product':
        row, error = require_auth(event)
        if error:
            return error
        if row[5] != 'admin':
            return err('Нет прав', 403)

        name = body.get('name', '').strip()
        description = body.get('description', '').strip()
        price = int(body.get('price', 0))
        category = body.get('category', '').strip()
        icon = body.get('icon', 'Package').strip()
        brand = body.get('brand', '').strip() or None
        sort_order = int(body.get('sort_order', 0))

        if not name or price <= 0:
            return err('Укажите название и цену')

        # Загрузка фото
        image_url = None
        image_b64 = body.get('image_b64')
        image_mime = body.get('image_mime', 'image/jpeg')
        if image_b64:
            image_data = base64.b64decode(image_b64)
            ext = 'jpg' if 'jpeg' in image_mime else image_mime.split('/')[-1]
            key = f"products/{uuid.uuid4()}.{ext}"
            s3 = get_s3()
            s3.put_object(Bucket='files', Key=key, Body=image_data, ContentType=image_mime)
            image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.products (name, description, price, category, icon, brand, image_url, sort_order) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (name, description, price, category, icon, brand, image_url, sort_order)
        )
        product_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return ok({'ok': True, 'id': product_id, 'image_url': image_url})

    # ── Обновить товар (admin) ─────────────────────────────────────
    if action == 'update_product':
        row, error = require_auth(event)
        if error:
            return error
        if row[5] != 'admin':
            return err('Нет прав', 403)

        product_id = body.get('id')
        if not product_id:
            return err('Нет id товара')

        # Загрузка фото если передан base64
        image_b64 = body.get('image_b64')
        image_mime = body.get('image_mime', 'image/jpeg')
        if image_b64:
            image_data = base64.b64decode(image_b64)
            ext = 'jpg' if 'jpeg' in image_mime else image_mime.split('/')[-1]
            key = f"products/{uuid.uuid4()}.{ext}"
            s3 = get_s3()
            s3.put_object(Bucket='files', Key=key, Body=image_data, ContentType=image_mime)
            body['image_url'] = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        fields = []
        values = []
        for field in ['name', 'description', 'price', 'category', 'icon', 'brand', 'image_url', 'sort_order']:
            if field in body:
                fields.append(f"{field} = %s")
                values.append(body[field])
        if not fields:
            return err('Нечего обновлять')

        values.append(product_id)
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.products SET {', '.join(fields)} WHERE id = %s", values)
        conn.commit()
        cur.close()
        conn.close()
        return ok({'ok': True, 'image_url': body.get('image_url')})

    # ── Удалить товар (admin) ──────────────────────────────────────
    if action == 'delete_product':
        row, error = require_auth(event)
        if error:
            return error
        if row[5] != 'admin':
            return err('Нет прав', 403)

        product_id = body.get('id')
        if not product_id:
            return err('Нет id товара')

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.products SET active = false WHERE id = %s", (product_id,))
        conn.commit()
        cur.close()
        conn.close()
        return ok({'ok': True})

    # ── Восстановить товар (admin) ─────────────────────────────────
    if action == 'restore_product':
        row, error = require_auth(event)
        if error:
            return error
        if row[5] != 'admin':
            return err('Нет прав', 403)

        product_id = body.get('id')
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.products SET active = true WHERE id = %s", (product_id,))
        conn.commit()
        cur.close()
        conn.close()
        return ok({'ok': True})

    # ── Разделы страницы (доставка / поддержка) ────────────────────
    if action == 'get_sections':
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT section_key, title, content FROM {SCHEMA}.page_sections")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        sections = {r[0]: {'title': r[1], 'content': r[2]} for r in rows}
        return ok({'ok': True, 'sections': sections})

    # ── Обновить раздел (admin) ────────────────────────────────────
    if action == 'update_section':
        row, error = require_auth(event)
        if error:
            return error
        if row[5] != 'admin':
            return err('Нет прав', 403)

        section_key = body.get('section_key', '').strip()
        title = body.get('title')
        content = body.get('content')

        if not section_key:
            return err('Нет section_key')

        conn = get_db()
        cur = conn.cursor()

        fields = []
        values = []
        if title is not None:
            fields.append("title = %s")
            values.append(title)
        if content is not None:
            fields.append("content = %s")
            values.append(json.dumps(content, ensure_ascii=False))
        fields.append("updated_at = NOW()")
        values.append(section_key)

        cur.execute(
            f"UPDATE {SCHEMA}.page_sections SET {', '.join(fields)} WHERE section_key = %s",
            values
        )
        if cur.rowcount == 0:
            cur.execute(
                f"INSERT INTO {SCHEMA}.page_sections (section_key, title, content) VALUES (%s, %s, %s)",
                (section_key, title or section_key, json.dumps(content or [], ensure_ascii=False))
            )
        conn.commit()
        cur.close()
        conn.close()
        return ok({'ok': True})

    # ── Назначить должность (admin) ────────────────────────────────
    if action == 'set_position':
        row, error = require_auth(event)
        if error:
            return error
        if row[5] != 'admin':
            return err('Нет прав', 403)

        target_username = body.get('username', '').strip().lstrip('@').lower()
        new_position = body.get('position', 'client')
        if new_position not in ('client', 'admin', 'courier'):
            return err('Неверная должность')
        if not target_username:
            return err('Укажите username')

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.users SET position = %s WHERE username = %s RETURNING id, username",
            (new_position, target_username)
        )
        updated = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if not updated:
            return err('Пользователь не найден. Он должен сначала войти на сайт.', 404)
        return ok({'ok': True, 'username': updated[1]})

    # ── Оформить заказ ─────────────────────────────────────────────
    if action == 'create_order':
        row, error = require_auth(event)
        if error:
            return error
        user_id, telegram_id, username, first_name, created_at, position = row

        items = body.get('items', [])
        address = body.get('address', '').strip()
        note = body.get('note', '').strip()

        if not items:
            return err('Корзина пуста')
        if not address:
            return err('Укажите адрес доставки')

        total = sum(i.get('price', 0) * i.get('qty', 1) for i in items)

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.orders (user_id, status, total, items, note, address) VALUES (%s, 'new', %s, %s, %s, %s) RETURNING id",
            (user_id, total, json.dumps(items, ensure_ascii=False), note, address)
        )
        order_id = cur.fetchone()[0]

        cur.execute(f"SELECT telegram_id, position FROM {SCHEMA}.users WHERE position IN ('admin', 'courier')")
        staff = cur.fetchall()
        conn.commit()
        cur.close()
        conn.close()

        display_name = first_name or f"@{username}"
        items_text = "\n".join(f"  • {i['name']} x{i.get('qty',1)} — {i['price']*i.get('qty',1)} ₽" for i in items)
        msg_text = (
            f"🛍 <b>Новый заказ #{order_id}</b>\n\n"
            f"Клиент: {display_name} (@{username})\n"
            f"Адрес: {address}\n\n"
            f"Состав:\n{items_text}\n\n"
            f"Итого: <b>{total} ₽</b>"
        )
        if note:
            msg_text += f"\nКомментарий: {note}"

        for staff_row in staff:
            try:
                send_telegram_message(staff_row[0], msg_text)
            except Exception:
                pass

        return ok({'ok': True, 'order_id': order_id})

    # ── Все заказы (admin/courier) ─────────────────────────────────
    if action == 'all_orders':
        row, error = require_auth(event)
        if error:
            return error
        if row[5] not in ('admin', 'courier'):
            return err('Нет прав', 403)

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT o.id, o.status, o.total, o.items, o.note, o.created_at, o.address,
                       u.username, u.first_name, u.telegram_id
                FROM {SCHEMA}.orders o
                JOIN {SCHEMA}.users u ON u.id = o.user_id
                ORDER BY o.created_at DESC LIMIT 100"""
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        orders = [
            {
                'id': r[0], 'status': r[1], 'total': r[2],
                'items': r[3] if r[3] else [], 'note': r[4],
                'created_at': r[5].isoformat() if r[5] else None,
                'address': r[6], 'username': r[7], 'first_name': r[8],
                'telegram_id': r[9],
            }
            for r in rows
        ]
        return ok({'ok': True, 'orders': orders})

    # ── Завершить заказ (courier/admin) ────────────────────────────
    if action == 'complete_order':
        row, error = require_auth(event)
        if error:
            return error
        if row[5] not in ('admin', 'courier'):
            return err('Нет прав', 403)

        order_id = body.get('order_id')
        if not order_id:
            return err('Нет order_id')

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.orders SET status = 'done' WHERE id = %s AND status != 'done' RETURNING user_id",
            (order_id,)
        )
        updated = cur.fetchone()
        conn.commit()

        if updated:
            cur.execute(f"SELECT telegram_id FROM {SCHEMA}.users WHERE id = %s", (updated[0],))
            client = cur.fetchone()
            if client:
                try:
                    send_telegram_message(
                        client[0],
                        f"✅ Ваш заказ #{order_id} доставлен! Спасибо за покупку в FlavorClouds 🌬"
                    )
                except Exception:
                    pass

        cur.close()
        conn.close()
        return ok({'ok': True})

    # ── Список пользователей (admin) ───────────────────────────────
    if action == 'get_users':
        row, error = require_auth(event)
        if error:
            return error
        if row[5] != 'admin':
            return err('Нет прав', 403)

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT id, username, first_name, position, created_at FROM {SCHEMA}.users ORDER BY created_at DESC")
        rows = cur.fetchall()
        cur.close()
        conn.close()

        users = [
            {'id': r[0], 'username': r[1], 'first_name': r[2], 'position': r[3],
             'created_at': r[4].isoformat() if r[4] else None}
            for r in rows
        ]
        return ok({'ok': True, 'users': users})

    return err('Неизвестное действие')
