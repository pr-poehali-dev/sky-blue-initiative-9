"""
Авторизация пользователей через Telegram-бот и профиль пользователя.
"""
import json
import os
import random
import string
import hashlib
import psycopg2
import urllib.request

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
    data = json.dumps({"chat_id": chat_id, "text": text}).encode()
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


def get_user_by_token(token: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, telegram_id, username, first_name, created_at FROM {SCHEMA}.users WHERE session_token = %s",
        (token,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    # --- Отправка кода ---
    if action == 'send_code':
        username = body.get('username', '').strip()
        if not username:
            return {'statusCode': 400, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Укажите username Telegram'})}

        chat_id = get_chat_id_by_username(username)
        if not chat_id:
            return {'statusCode': 404, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Пользователь не найден. Сначала напишите боту любое сообщение.'})}

        code = generate_code()
        _codes[username.lower().lstrip('@')] = {'code': code, 'chat_id': chat_id}
        send_telegram_message(chat_id, f"🔐 Ваш код для входа в FlavorClouds: {code}\n\nКод действителен 5 минут.")

        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({'ok': True, 'message': 'Код отправлен в Telegram'})}

    # --- Верификация кода ---
    if action == 'verify_code':
        username = body.get('username', '').strip().lower().lstrip('@')
        code = body.get('code', '').strip()

        stored = _codes.get(username)
        if not stored or stored['code'] != code:
            return {'statusCode': 400, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Неверный код'})}

        chat_id = stored['chat_id']
        token = generate_token()

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.users (telegram_id, username, session_token, updated_at)
               VALUES (%s, %s, %s, NOW())
               ON CONFLICT (telegram_id) DO UPDATE
               SET username = EXCLUDED.username, session_token = EXCLUDED.session_token, updated_at = NOW()
               RETURNING id, telegram_id, username, first_name""",
            (chat_id, username, token)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        del _codes[username]

        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({
                    'ok': True,
                    'token': token,
                    'user': {'id': row[0], 'telegram_id': row[1], 'username': row[2], 'first_name': row[3]}
                })}

    # --- Профиль пользователя ---
    if action == 'profile':
        token = (event.get('headers') or {}).get('X-Session-Token')
        if not token:
            return {'statusCode': 401, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Не авторизован'})}

        row = get_user_by_token(token)
        if not row:
            return {'statusCode': 401, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Сессия недействительна'})}

        user_id, telegram_id, username, first_name, created_at = row

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders WHERE user_id = %s", (user_id,))
        orders_count = cur.fetchone()[0]
        cur.close()
        conn.close()

        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({
                    'ok': True,
                    'user': {
                        'id': user_id,
                        'username': username,
                        'first_name': first_name,
                        'created_at': created_at.isoformat() if created_at else None,
                        'orders_count': orders_count,
                    }
                })}

    # --- История заказов ---
    if action == 'orders':
        token = (event.get('headers') or {}).get('X-Session-Token')
        if not token:
            return {'statusCode': 401, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Не авторизован'})}

        row = get_user_by_token(token)
        if not row:
            return {'statusCode': 401, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Сессия недействительна'})}

        user_id = row[0]

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, status, total, items, note, created_at FROM {SCHEMA}.orders WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
            (user_id,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        orders = [
            {
                'id': r[0],
                'status': r[1],
                'total': r[2],
                'items': r[3] if r[3] else [],
                'note': r[4],
                'created_at': r[5].isoformat() if r[5] else None,
            }
            for r in rows
        ]

        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({'ok': True, 'orders': orders})}

    # --- Фото профиля из Telegram ---
    if action == 'get_avatar':
        token = (event.get('headers') or {}).get('X-Session-Token')
        if not token:
            return {'statusCode': 401, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Не авторизован'})}

        row = get_user_by_token(token)
        if not row:
            return {'statusCode': 401, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Сессия недействительна'})}

        telegram_id = row[1]
        tg_token = os.environ['TELEGRAM_BOT_TOKEN']

        photos_url = f"https://api.telegram.org/bot{tg_token}/getUserProfilePhotos?user_id={telegram_id}&limit=1"
        req = urllib.request.Request(photos_url)
        with urllib.request.urlopen(req) as resp:
            photos_data = json.loads(resp.read())

        photos = photos_data.get('result', {}).get('photos', [])
        if not photos:
            return {'statusCode': 200, 'headers': CORS_HEADERS,
                    'body': json.dumps({'ok': True, 'avatar_url': None})}

        file_id = photos[0][-1]['file_id']
        file_url = f"https://api.telegram.org/bot{tg_token}/getFile?file_id={file_id}"
        req2 = urllib.request.Request(file_url)
        with urllib.request.urlopen(req2) as resp2:
            file_data = json.loads(resp2.read())

        file_path = file_data['result']['file_path']
        avatar_url = f"https://api.telegram.org/file/bot{tg_token}/{file_path}"

        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({'ok': True, 'avatar_url': avatar_url})}

    return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неизвестное действие'})}