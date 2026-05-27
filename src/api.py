from flask import Flask, render_template, send_file, jsonify, request, Response
import psycopg2
import os
import traceback

from werkzeug.security import generate_password_hash, check_password_hash
import re

app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

# Folder paths
THIS_DIR      = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(THIS_DIR, 'templates')
BASE_DIR      = os.path.dirname(THIS_DIR)
MUSIC_FOLDER  = os.path.join(BASE_DIR, 'music')
PHOTO_FOLDER  = os.path.join(BASE_DIR, 'photo')

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="popular",
        user="postgres",
        password="Yarik_Top1",
        port="5432"
    )

# ─── SPA shell ────────────────────────────────────────────────────────────────
# Every navigable URL returns spa.html. spa.js fetches /api/fragment/<page>
# separately to get the page content.

@app.route('/')
@app.route('/index')
@app.route('/tracks')
@app.route('/bio')
@app.route('/bio-miku')
@app.route('/bio-teto')
@app.route('/profile')
def spa_shell():
    return render_template('spa.html')


# ─── Fragment API ─────────────────────────────────────────────────────────────
FRAGMENT_FILES = {
    'index':    'index.html',
    'tracks':   'tracks.html',
    'bio':      'bio.html',
    'bio-miku': 'bio-miku.html',
    'bio-teto': 'bio-teto.html',
    'profile':  'profile.html',
}

@app.route('/api/fragment/<page>')
def get_fragment(page):
    print(f"[DEBUG] Requested fragment: {page}")
    filename = FRAGMENT_FILES.get(page)
    print(f"[DEBUG] Filename: {filename}")
    
    if not filename:
        print(f"[ERROR] Unknown page: {page}")
        return 'Page not found', 404

    file_path = os.path.join(TEMPLATES_DIR, filename)
    print(f"[DEBUG] Full path: {file_path}")
    print(f"[DEBUG] File exists: {os.path.exists(file_path)}")

    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return f'File not found: {filename}', 404

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html = f.read()
        print(f"[DEBUG] OK — {len(html)} chars")
        return Response(html, mimetype='text/html; charset=utf-8')
    except Exception as e:
        print(f"[ERROR] Reading file: {e}")
        traceback.print_exc()
        return f'Server error: {e}', 500


# reg

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()  # пока опционально, позже добавим

    # Простая валидация
    if not email or not password:
        return jsonify({"success": False, "error": "Email и пароль обязательны"}), 400

    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({"success": False, "error": "Некорректный email"}), 400

    if len(password) < 6:
        return jsonify({"success": False, "error": "Пароль должен быть минимум 6 символов"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Проверяем, не занят ли email
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"success": False, "error": "Email уже зарегистрирован"}), 409

        # Хешируем пароль
        hashed = generate_password_hash(password)

        # Вставляем нового пользователя
        cur.execute(
            "INSERT INTO users (email, password, name, avatar) VALUES (%s, %s, %s, %s) RETURNING id",
            (email, hashed, name if name else None, '/static/img/default.png')
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "user_id": user_id, "message": "Регистрация успешна"})
    except Exception as e:
        print(f"[ERROR] /api/register: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "Ошибка сервера"}), 500

# login

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"success": False, "error": "Email и пароль обязательны"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, email, password, name, avatar FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if not user or not check_password_hash(user[2], password):
            return jsonify({"success": False, "error": "Неверный email или пароль"}), 401

        return jsonify({
            "success": True,
            "user_id": user[0],
            "email": user[1],
            "name": user[3],
            "avatar": user[4] if user[4] else '/static/img/default.png',
            "message": "Вход выполнен"
        })
    except Exception as e:
        print(f"[ERROR] /api/login: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "Ошибка сервера"}), 500

# name

@app.route('/api/update_profile', methods=['POST'])
def update_profile():
    data = request.get_json()
    user_id = data.get('user_id')
    name = data.get('name', '').strip()

    if not user_id:
        return jsonify({"success": False, "error": "user_id обязателен"}), 400
    if not name:
        return jsonify({"success": False, "error": "Имя не может быть пустым"}), 400
    if len(name) > 10:
        return jsonify({"success": False, "error": "Имя слишком длинное (макс. 10 символов)"}), 400

    import re
    if not re.match(r'^[a-zA-Zа-яёА-ЯЁ0-9 _-]+$', name):
        return jsonify({"success": False, "error": "Имя может содержать только буквы, цифры, пробел, дефис и подчёркивание"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE users SET name = %s WHERE id = %s RETURNING id", (name, user_id))
        updated = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if not updated:
            return jsonify({"success": False, "error": "Пользователь не найден"}), 404

        return jsonify({"success": True, "message": "Имя обновлено", "name": name})
    except Exception as e:
        print(f"[ERROR] /api/update_profile: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "Ошибка сервера"}), 500

#avatar

@app.route('/api/update_avatar', methods=['POST'])
def update_avatar():
    data = request.get_json()
    user_id = data.get('user_id')
    avatar_url = data.get('avatar_url', '').strip()

    if not user_id:
        return jsonify({"success": False, "error": "user_id обязателен"}), 400
    if not avatar_url:
        return jsonify({"success": False, "error": "URL аватарки не может быть пустым"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE users SET avatar = %s WHERE id = %s RETURNING id", (avatar_url, user_id))
        updated = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if not updated:
            return jsonify({"success": False, "error": "Пользователь не найден"}), 404

        return jsonify({"success": True, "message": "Аватар обновлён", "avatar_url": avatar_url})
    except Exception as e:
        print(f"[ERROR] /api/update_avatar: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "Ошибка сервера"}), 500

# delete acc

@app.route('/api/delete_account', methods=['POST'])
def delete_account():
    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({"success": False, "error": "user_id обязателен"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
        deleted = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if not deleted:
            return jsonify({"success": False, "error": "Пользователь не найден"}), 404

        return jsonify({"success": True, "message": "Аккаунт удалён"})
    except Exception as e:
        print(f"[ERROR] /api/delete_account: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "Ошибка сервера"}), 500

# ─── Songs API ────────────────────────────────────────────────────────────────

@app.route('/api/songs')
def get_songs():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                s.id, s.song_name, s.road, s.photo, s.vocaloid_id,
                v.name  AS vocaloid_name,
                v.page_url AS vocaloid_url
            FROM popsongs s
            LEFT JOIN vocaloids v ON s.vocaloid_id = v.id
            ORDER BY s.id;
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        result = [
            {"id": r[0], "name": r[1], "file_path": r[2], "photo": r[3],
             "vocaloid_id": r[4], "vocaloid_name": r[5], "vocaloid_url": r[6]}
            for r in rows
        ]
        print(f"[OK] Loaded {len(result)} songs")
        return jsonify({"success": True, "count": len(result), "songs": result})
    except Exception as e:
        print(f"[ERROR] /api/songs: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ─── Photo ────────────────────────────────────────────────────────────────────

@app.route('/photo/<filename>')
def get_photo(filename):
    file_path = os.path.join(PHOTO_FOLDER, filename)
    if os.path.exists(file_path):
        ext  = filename.rsplit('.', 1)[-1].lower()
        mime = {'webp': 'image/webp', 'png': 'image/png',
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg'}.get(ext, 'image/webp')
        return send_file(file_path, mimetype=mime)
    print(f"[PHOTO] NOT FOUND: {file_path}")
    return "Photo not found", 404


# ─── Play ─────────────────────────────────────────────────────────────────────

@app.route('/play/<int:song_id>')
def play_song(song_id):
    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("SELECT road FROM popsongs WHERE id = %s;", (song_id,))
        row  = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return "Track not found", 404
        file_path = os.path.join(MUSIC_FOLDER, row[0])
        if os.path.exists(file_path):
            return send_file(file_path, mimetype="audio/mpeg")
        print(f"[PLAY] File missing: {file_path}")
        return "File not found", 404
    except Exception as e:
        print(f"[ERROR] /play: {e}")
        traceback.print_exc()
        return f"Server error: {e}", 500


# ─── FAVORITES (ЛАЙКИ) ────────────────────────────────────────────────────────

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"success": False, "error": "user_id обязателен"}), 400
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT song_id FROM user_favorites WHERE user_id = %s", (user_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        favorites = [row[0] for row in rows]
        return jsonify({"success": True, "favorites": favorites})
    except Exception as e:
        print(f"[ERROR] /api/favorites: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "Ошибка сервера"}), 500

@app.route('/api/favorites/toggle', methods=['POST'])
def toggle_favorite():
    data = request.get_json()
    user_id = data.get('user_id')
    song_id = data.get('song_id')
    if not user_id or not song_id:
        return jsonify({"success": False, "error": "user_id и song_id обязательны"}), 400
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Проверяем, есть ли уже лайк
        cur.execute("SELECT 1 FROM user_favorites WHERE user_id = %s AND song_id = %s", (user_id, song_id))
        exists = cur.fetchone()
        if exists:
            # Удаляем
            cur.execute("DELETE FROM user_favorites WHERE user_id = %s AND song_id = %s", (user_id, song_id))
            liked = False
        else:
            # Добавляем
            cur.execute("INSERT INTO user_favorites (user_id, song_id) VALUES (%s, %s)", (user_id, song_id))
            liked = True
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "liked": liked})
    except Exception as e:
        print(f"[ERROR] /api/favorites/toggle: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "Ошибка сервера"}), 500
        

if __name__ == '__main__':
    # Print which template files actually exist
    for name, fname in FRAGMENT_FILES.items():
        path = os.path.join(TEMPLATES_DIR, fname)
        print(f"[INFO] template '{name}': {'EXISTS' if os.path.exists(path) else 'MISSING'} -> {path}")
    app.run(debug=True, port=5000)
