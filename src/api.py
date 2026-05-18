from flask import Flask, render_template, send_file, jsonify, request, Response
import psycopg2
import os
import traceback

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
def spa_shell():
    return render_template('spa.html')


# ─── Fragment API ─────────────────────────────────────────────────────────────
FRAGMENT_FILES = {
    'index':    'index.html',
    'tracks':   'tracks.html',
    'bio':      'bio.html',
    'bio-miku': 'bio-miku.html',
    'bio-teto': 'bio-teto.html',
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


if __name__ == '__main__':
    print(f"[INFO] THIS_DIR:      {THIS_DIR}")
    print(f"[INFO] TEMPLATES_DIR: {TEMPLATES_DIR}")
    print(f"[INFO] MUSIC_FOLDER:  {MUSIC_FOLDER}")
    print(f"[INFO] PHOTO_FOLDER:  {PHOTO_FOLDER}")
    # Print which template files actually exist
    for name, fname in FRAGMENT_FILES.items():
        path = os.path.join(TEMPLATES_DIR, fname)
        print(f"[INFO] template '{name}': {'EXISTS' if os.path.exists(path) else 'MISSING'} -> {path}")
    app.run(debug=True, port=5000)
