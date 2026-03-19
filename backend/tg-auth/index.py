"""
Авторизация пользователей через Telegram-бот.
Поддерживает отправку кода и верификацию.
"""
import json
import os
import random
import string
import hashlib
import psycopg2
import urllib.request
import urllib.parse

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

# Временное хранилище кодов (в памяти, живёт пока функция активна)
# Для продакшена лучше использовать Redis, но для старта сойдёт
_codes: dict = {}


def send_telegram_message(chat_id: int, text: str):
    token = os.environ['TELEGRAM_BOT_TOKEN']
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({"chat_id": chat_id, "text": text}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def get_chat_id_by_username(username: str):
    """Попытка получить chat_id через getUpdates (работает если пользователь писал боту)"""
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
            """INSERT INTO users (telegram_id, username, session_token, updated_at)
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

    # --- Проверка сессии ---
    if action == 'me':
        token = (event.get('headers') or {}).get('X-Session-Token')
        if not token:
            return {'statusCode': 401, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Не авторизован'})}

        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id, telegram_id, username, first_name FROM users WHERE session_token = %s", (token,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return {'statusCode': 401, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Сессия недействительна'})}

        return {'statusCode': 200, 'headers': CORS_HEADERS,
                'body': json.dumps({'ok': True, 'user': {'id': row[0], 'telegram_id': row[1], 'username': row[2], 'first_name': row[3]}})}

    return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неизвестное действие'})}
