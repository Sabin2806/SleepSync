from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import sqlite3
import hashlib
from collections import Counter

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sleepsync-secret-key-2024'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-key-2024'
CORS(app)
JWTManager(app)

DB_PATH = 'sleepsync.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS sleep_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        bed_time TIMESTAMP NOT NULL,
        wake_time TIMESTAMP NOT NULL,
        sleep_quality INTEGER NOT NULL,
        notes TEXT,
        caffeine INTEGER DEFAULT 0,
        exercise INTEGER DEFAULT 0,
        screen_time INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS sleep_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        target_bed_time TEXT NOT NULL,
        target_wake_time TEXT NOT NULL,
        target_hours REAL NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ============ AUTH ROUTES ============
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not username or not email or not password:
        return jsonify({'error': 'All fields required'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    hashed_pw = hashlib.sha256(password.encode()).hexdigest()
    
    conn = get_db()
    try:
        conn.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                    [username, email, hashed_pw])
        conn.commit()
        user_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        token = create_access_token(identity=str(user_id))
        return jsonify({
            'message': 'Account created!',
            'token': token,
            'user': {'id': user_id, 'username': username, 'email': email}
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username or email already exists'}), 409
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    hashed_pw = hashlib.sha256(password.encode()).hexdigest()
    
    conn = get_db()
    user = conn.execute(
        'SELECT * FROM users WHERE (username=? OR email=?) AND password=?',
        [username, username, hashed_pw]
    ).fetchone()
    conn.close()
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = create_access_token(identity=str(user['id']))
    return jsonify({
        'message': 'Login successful!',
        'token': token,
        'user': {'id': user['id'], 'username': user['username'], 'email': user['email']}
    })

# ============ SLEEP SESSIONS ============
@app.route('/api/sleep', methods=['POST'])
@jwt_required()
def add_sleep():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    bed_time = data.get('bed_time')
    wake_time = data.get('wake_time')
    quality = data.get('sleep_quality')
    notes = data.get('notes', '')
    caffeine = 1 if data.get('caffeine') else 0
    exercise = 1 if data.get('exercise') else 0
    screen_time = data.get('screen_time', 0)
    
    if not bed_time or not wake_time or not quality:
        return jsonify({'error': 'Bed time, wake time, and quality required'}), 400
    
    conn = get_db()
    conn.execute('''INSERT INTO sleep_sessions 
        (user_id, bed_time, wake_time, sleep_quality, notes, caffeine, exercise, screen_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        [user_id, bed_time, wake_time, quality, notes, caffeine, exercise, screen_time])
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Sleep logged!'}), 201

@app.route('/api/sleep', methods=['GET'])
@jwt_required()
def get_sleep():
    user_id = int(get_jwt_identity())
    
    conn = get_db()
    sessions = conn.execute(
        'SELECT * FROM sleep_sessions WHERE user_id=? ORDER BY bed_time DESC LIMIT 50',
        [user_id]
    ).fetchall()
    conn.close()
    
    result = []
    for s in sessions:
        result.append({
            'id': s['id'],
            'bed_time': s['bed_time'],
            'wake_time': s['wake_time'],
            'sleep_quality': s['sleep_quality'],
            'notes': s['notes'],
            'caffeine': bool(s['caffeine']),
            'exercise': bool(s['exercise']),
            'screen_time': s['screen_time'],
            'created_at': s['created_at']
        })
    
    return jsonify({'sessions': result})

@app.route('/api/sleep/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_sleep(id):
    user_id = int(get_jwt_identity())
    conn = get_db()
    conn.execute('DELETE FROM sleep_sessions WHERE id=? AND user_id=?', [id, user_id])
    conn.commit()
    conn.close()
    return jsonify({'message': 'Deleted!'})

# ============ GOALS ============
@app.route('/api/goals', methods=['POST'])
@jwt_required()
def add_goal():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    bed_time = data.get('target_bed_time')
    wake_time = data.get('target_wake_time')
    hours = data.get('target_hours')
    
    if not bed_time or not wake_time or not hours:
        return jsonify({'error': 'All fields required'}), 400
    
    conn = get_db()
    conn.execute('UPDATE sleep_goals SET is_active=0 WHERE user_id=?', [user_id])
    conn.execute('''INSERT INTO sleep_goals (user_id, target_bed_time, target_wake_time, target_hours)
        VALUES (?, ?, ?, ?)''', [user_id, bed_time, wake_time, hours])
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Goal set!'}), 201

@app.route('/api/goals', methods=['GET'])
@jwt_required()
def get_goals():
    user_id = int(get_jwt_identity())
    conn = get_db()
    goals = conn.execute(
        'SELECT * FROM sleep_goals WHERE user_id=? ORDER BY created_at DESC',
        [user_id]
    ).fetchall()
    conn.close()
    
    result = []
    for g in goals:
        result.append({
            'id': g['id'],
            'target_bed_time': g['target_bed_time'],
            'target_wake_time': g['target_wake_time'],
            'target_hours': g['target_hours'],
            'is_active': bool(g['is_active'])
        })
    
    return jsonify({'goals': result})

# ============ ANALYTICS ============
@app.route('/api/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    user_id = int(get_jwt_identity())
    
    conn = get_db()
    sessions = conn.execute(
        'SELECT * FROM sleep_sessions WHERE user_id=? ORDER BY bed_time DESC',
        [user_id]
    ).fetchall()
    conn.close()
    
    if not sessions:
        return jsonify({'message': 'No data yet'})
    
    durations = []
    qualities = []
    caffeine_count = 0
    exercise_count = 0
    total_screen = 0
    
    for s in sessions:
        bed = datetime.fromisoformat(s['bed_time'])
        wake = datetime.fromisoformat(s['wake_time'])
        duration = (wake - bed).total_seconds() / 3600
        durations.append(duration)
        qualities.append(s['sleep_quality'])
        if s['caffeine']: caffeine_count += 1
        if s['exercise']: exercise_count += 1
        total_screen += s['screen_time'] or 0
    
    avg_duration = sum(durations) / len(durations)
    avg_quality = sum(qualities) / len(qualities)
    
    best_idx = qualities.index(max(qualities))
    worst_idx = qualities.index(min(qualities))
    
    streak = 0
    for s in sessions:
        if s['sleep_quality'] >= 3:
            streak += 1
        else:
            break
    
    return jsonify({
        'total_sessions': len(sessions),
        'avg_duration_hours': round(avg_duration, 1),
        'avg_quality': round(avg_quality, 1),
        'current_streak': streak,
        'caffeine_days': caffeine_count,
        'exercise_days': exercise_count,
        'avg_screen_time': round(total_screen / len(sessions)),
        'best_night': {
            'date': sessions[best_idx]['bed_time'][:10],
            'quality': sessions[best_idx]['sleep_quality'],
            'duration': round(durations[best_idx], 1)
        },
        'worst_night': {
            'date': sessions[worst_idx]['bed_time'][:10],
            'quality': sessions[worst_idx]['sleep_quality'],
            'duration': round(durations[worst_idx], 1)
        }
    })

# ============ AI RECOMMENDATIONS ============
@app.route('/api/ai/recommendations', methods=['GET'])
@jwt_required()
def ai_recommendations():
    user_id = int(get_jwt_identity())
    
    conn = get_db()
    sessions = conn.execute(
        'SELECT * FROM sleep_sessions WHERE user_id=? ORDER BY bed_time DESC LIMIT 30',
        [user_id]
    ).fetchall()
    conn.close()
    
    if len(sessions) < 3:
        return jsonify({
            'message': 'Need at least 3 sleep logs for recommendations',
            'recommendations': [{'icon': '📝', 'title': 'Log More Sleep', 'description': 'Log at least 3 sleep sessions to get personalized AI recommendations!', 'action': 'Start logging your sleep daily'}]
        })
    
    recommendations = []
    qualities = [s['sleep_quality'] for s in sessions]
    avg_quality = sum(qualities) / len(qualities)
    
    bed_times = []
    for s in sessions:
        try:
            bed = datetime.fromisoformat(s['bed_time'])
            bed_times.append(bed.hour * 60 + bed.minute)
        except:
            pass
    
    caffeine_sessions = [s for s in sessions if s['caffeine']]
    non_caffeine = [s for s in sessions if not s['caffeine']]
    
    if caffeine_sessions and non_caffeine:
        caffeine_quality = sum(s['sleep_quality'] for s in caffeine_sessions) / len(caffeine_sessions)
        non_caffeine_quality = sum(s['sleep_quality'] for s in non_caffeine) / len(non_caffeine)
        if caffeine_quality < non_caffeine_quality:
            recommendations.append({
                'icon': '☕', 'title': 'Reduce Caffeine',
                'description': f'Your sleep quality drops from {non_caffeine_quality:.1f} to {caffeine_quality:.1f}/5 with caffeine.',
                'action': 'Avoid caffeine 8 hours before bedtime'
            })
    
    exercise_sessions = [s for s in sessions if s['exercise']]
    non_exercise = [s for s in sessions if not s['exercise']]
    
    if exercise_sessions and non_exercise:
        exercise_quality = sum(s['sleep_quality'] for s in exercise_sessions) / len(exercise_sessions)
        non_exercise_quality = sum(s['sleep_quality'] for s in non_exercise) / len(non_exercise)
        if exercise_quality > non_exercise_quality:
            recommendations.append({
                'icon': '🏃', 'title': 'Keep Exercising!',
                'description': f'Exercise boosts your sleep quality from {non_exercise_quality:.1f} to {exercise_quality:.1f}/5.',
                'action': 'Continue regular exercise, avoid intense workouts 2 hours before bed'
            })
    
    high_screen = [s for s in sessions if s['screen_time'] and s['screen_time'] > 60]
    low_screen = [s for s in sessions if s['screen_time'] and s['screen_time'] <= 60]
    
    if high_screen and low_screen:
        high_quality = sum(s['sleep_quality'] for s in high_screen) / len(high_screen)
        low_quality = sum(s['sleep_quality'] for s in low_screen) / len(low_screen)
        if high_quality < low_quality:
            recommendations.append({
                'icon': '📱', 'title': 'Digital Sunset',
                'description': f'High screen time drops quality to {high_quality:.1f} vs {low_quality:.1f}/5.',
                'action': 'Reduce screen time to less than 30 minutes before bedtime'
            })
    
    if len(bed_times) >= 3:
        avg_bed_time = sum(bed_times) / len(bed_times)
        variations = [abs(t - avg_bed_time) for t in bed_times]
        avg_variation = sum(variations) / len(variations)
        
        if avg_variation > 60:
            rounded_times = [round(t/30)*30 for t in bed_times]
            most_common = Counter(rounded_times).most_common(1)[0][0]
            ideal_hour = most_common // 60
            ideal_minute = most_common % 60
            recommendations.append({
                'icon': '🕐', 'title': 'Consistent Bedtime',
                'description': f'Your bedtime varies by {avg_variation:.0f} minutes.',
                'action': f'Aim for {ideal_hour:02d}:{ideal_minute:02d} every night'
            })
    
    durations = []
    for s in sessions:
        try:
            bed = datetime.fromisoformat(s['bed_time'])
            wake = datetime.fromisoformat(s['wake_time'])
            durations.append((wake - bed).total_seconds() / 3600)
        except:
            pass
    
    if durations:
        avg_duration = sum(durations) / len(durations)
        if avg_duration < 7:
            recommendations.append({
                'icon': '😴', 'title': 'Increase Sleep Duration',
                'description': f'You average {avg_duration:.1f} hours. Aim for 7-9 hours.',
                'action': 'Go to bed 30 minutes earlier'
            })
    
    mood_keywords = {
        'stressed': ['stress', 'anxious', 'worried', 'anxiety'],
        'energetic': ['energ', 'refresh', 'great', 'amazing'],
        'tired': ['tired', 'exhaust', 'fatigue', 'drained'],
        'restless': ['restless', 'woke up', 'toss', 'turn'],
        'happy': ['happy', 'good', 'nice', 'calm', 'peaceful']
    }
    
    mood_counts = {mood: 0 for mood in mood_keywords}
    for s in sessions:
        if s['notes']:
            notes_lower = s['notes'].lower()
            for mood, keywords in mood_keywords.items():
                if any(keyword in notes_lower for keyword in keywords):
                    mood_counts[mood] += 1
    
    dominant_mood = max(mood_counts, key=mood_counts.get)
    if mood_counts[dominant_mood] > 0:
        mood_messages = {
            'stressed': 'Try meditation or deep breathing before bed.',
            'energetic': 'Great sleep! Maintain your current routine.',
            'tired': 'Consider checking sleep duration or quality.',
            'restless': 'Avoid heavy meals and alcohol before bed.',
            'happy': 'Positive sleep mood! Keep up the good habits.'
        }
        recommendations.append({
            'icon': '🧠', 'title': f'Mood Pattern: {dominant_mood.capitalize()}',
            'description': f'Your notes often mention feeling {dominant_mood}.',
            'action': mood_messages.get(dominant_mood, '')
        })
    
    if bed_times:
        avg_bed = sum(bed_times) / len(bed_times)
        wind_down_minutes = avg_bed - 45
        wind_down_hour = int(wind_down_minutes // 60) % 24
        wind_down_min = int(wind_down_minutes % 60)
        optimal_bed_hour = int(avg_bed // 60) % 24
        optimal_bed_min = int(avg_bed % 60)
        
        recommendations.append({
            'icon': '🌅', 'title': 'Optimal Wind-Down Time',
            'description': f'Start winding down at {wind_down_hour:02d}:{wind_down_min:02d} for {optimal_bed_hour:02d}:{optimal_bed_min:02d} bedtime.',
            'action': f'Begin bedtime routine at {wind_down_hour:02d}:{wind_down_min:02d}'
        })
    
    hygiene_tips = []
    if avg_quality < 3:
        hygiene_tips.append('Keep your bedroom cool (18-20°C)')
        hygiene_tips.append('Avoid large meals 2-3 hours before bed')
    if any(s['caffeine'] for s in sessions):
        hygiene_tips.append('Switch to herbal tea after 2 PM')
    if any(s['screen_time'] and s['screen_time'] > 60 for s in sessions):
        hygiene_tips.append('Use blue light filters after sunset')
    
    return jsonify({
        'recommendations': recommendations,
        'summary': {
            'avg_quality': round(avg_quality, 1),
            'total_sessions_analyzed': len(sessions),
            'dominant_mood': dominant_mood if mood_counts[dominant_mood] > 0 else 'neutral',
            'sleep_hygiene_tips': hygiene_tips
        }
    })

if __name__ == '__main__':
    init_db()
    print("✅ SleepSync Backend Running on http://localhost:5000")
    app.run(debug=True, port=5000)
