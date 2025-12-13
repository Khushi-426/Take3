"""
Flask application with API routes - OPTIMIZED & ACCURATE VERSION
"""
from flask import Flask, Response, jsonify, request
import cv2
import mediapipe as mp
import numpy as np
import time
import json
import os
import random
import string
import requests
import certifi 
from collections import deque
from datetime import datetime
from flask_cors import CORS
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from flask_mail import Mail, Message

# --- IMPORT CUSTOM AI MODULE (CRITICAL FOR ACCURACY) ---
# Ensure you have ai_engine.py in the same directory
from ai_engine import AIEngine

# --- 0. CONFIGURATION ---
load_dotenv()

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# --- 1. MAIL CONFIGURATION ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
mail = Mail(app)

# --- 2. DATABASE SETUP (ROBUST SSL) ---
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "physiocheck_db"

try:
    # Robust connection logic for MongoDB Atlas
    client = MongoClient(
        MONGO_URI, 
        serverSelectionTimeoutMS=5000, 
        tls=True,
        tlsCAFile=certifi.where(),       
        tlsAllowInvalidCertificates=True 
    )
    
    # Trigger a connection check
    client.admin.command('ping') 
    
    db = client[DB_NAME]
    users_collection = db['users']
    otp_collection = db['otps']
    sessions_collection = db['sessions']
    print(f"✅ Connected to MongoDB Cloud: {DB_NAME}")
except Exception as e:
    print(f"⚠️ DB Error: {e}")
    db = None
    users_collection = None
    otp_collection = None
    sessions_collection = None

# Global session instance
workout_session = None

def init_session():
    """Initialize workout session logic"""
    global workout_session
    from workout_session import WorkoutSession
    workout_session = WorkoutSession()

def generate_video_frames():
    """Generator for video streaming"""
    from constants import WorkoutPhase
    
    if workout_session is None: return
    
    while workout_session.phase != WorkoutPhase.INACTIVE:
        # process_frame handles MediaPipe inference and UI drawing
        frame, should_continue = workout_session.process_frame() 
        
        if not should_continue or frame is None:
            break
        
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

# --- 3. AUTHENTICATION ROUTES ---

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    if users_collection is None: return jsonify({'error': 'Database unavailable'}), 503
    data = request.json
    email = data.get('email')
    
    # Check if user already exists
    if users_collection.find_one({'email': email}):
        return jsonify({'error': 'Email is already registered. Please login.'}), 400

    # Generate OTP
    otp = ''.join(random.choices(string.digits, k=6))
    
    otp_collection.update_one(
        {'email': email}, 
        {'$set': {'otp': otp, 'created_at': time.time()}}, 
        upsert=True
    )

    try:
        msg = Message('PhysioCheck Verification Code', sender=app.config['MAIL_USERNAME'], recipients=[email])
        
        # --- HTML EMAIL TEMPLATE FOR BETTER UX ---
        msg.html = f"""
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F9F7F3;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 20px;">
                <tr>
                    <td align="center">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                            <tr>
                                <td style="background: linear-gradient(135deg, #1A3C34 0%, #2C5D31 100%); padding: 40px 20px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px;">PHYSIO<span style="color: #A5D6A7;">CHECK</span></h1>
                                    <p style="color: #E8F5E9; margin-top: 10px;">AI-Powered Rehabilitation</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="color: #1A3C34; text-align: center;">Verify Your Account</h2>
                                    <div style="background-color: #F1F8E9; border: 2px dashed #69B341; border-radius: 12px; padding: 25px; text-align: center; margin: 20px auto;">
                                        <span style="color: #1A3C34; font-size: 38px; font-weight: bold; letter-spacing: 10px; font-family: monospace;">{otp}</span>
                                    </div>
                                    <p style="color: #888888; text-align: center;">This code is valid for 10 minutes.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        msg.body = f"Your verification code is: {otp}"
        
        mail.send(msg)
        return jsonify({'message': 'OTP sent successfully'}), 200
    except Exception as e:
        print(f"Mail Error: {e}")
        return jsonify({'error': 'Failed to send email.'}), 500

@app.route('/api/auth/signup-verify', methods=['POST'])
def signup_verify():
    if users_collection is None: return jsonify({'error': 'Database unavailable'}), 503
    data = request.json
    email = data.get('email')
    otp_input = data.get('otp')
    
    record = otp_collection.find_one({'email': email})
    if not record or record['otp'] != otp_input:
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user = {
        'name': data['name'], 'email': email, 'password': hashed_password,
        'role': data.get('role', 'patient'), 'licenseId': data.get('licenseId', None),
        'created_at': time.time(), 'auth_method': 'email'
    }
    users_collection.insert_one(user)
    otp_collection.delete_one({'email': email}) 
    return jsonify({'message': 'User verified', 'user': {'name': user['name'], 'role': user['role']}}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    if users_collection is None: return jsonify({'error': 'Database unavailable'}), 503
    data = request.json
    user = users_collection.find_one({'email': data['email']})
    
    if user and user.get('auth_method') == 'google' and not user.get('password'):
        return jsonify({'error': 'Please sign in with Google'}), 400

    if user and bcrypt.check_password_hash(user['password'], data['password']):
        return jsonify({
            'message': 'Login successful', 'role': user['role'],
            'name': user['name'], 'email': user['email']
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    if users_collection is None: return jsonify({'error': 'Database unavailable'}), 503
    token = request.json.get('token')
    role = request.json.get('role', 'patient') 
    
    try:
        resp = requests.get(
            'https://www.googleapis.com/oauth2/v1/userinfo',
            params={'access_token': token, 'alt': 'json'}
        )
        if not resp.ok: return jsonify({'error': 'Invalid Google Token'}), 401
            
        google_user = resp.json()
        email = google_user['email']
        name = google_user['name']
        
        user = users_collection.find_one({'email': email})
        if not user:
            user = {
                'name': name, 'email': email, 'password': '', 
                'role': role, 'created_at': time.time(), 'auth_method': 'google'
            }
            users_collection.insert_one(user)
            
        return jsonify({
            'message': 'Google login successful',
            'role': user['role'], 'name': user['name'], 'email': user['email']
        }), 200
    except Exception as e:
        print(f"Google Auth Error: {e}")
        return jsonify({'error': 'Authentication failed'}), 500

# --- 4. ANALYTICS & AI ROUTES ---

@app.route('/api/user/stats', methods=['POST'])
def get_user_stats():
    # Quick stats for the dashboard summary
    if sessions_collection is None: return jsonify({'error': 'DB Error'}), 503
    email = request.json.get('email')
    
    user_sessions = list(sessions_collection.find({'email': email}))
    total_reps = sum(s.get('total_reps', 0) for s in user_sessions)
    total_duration = sum(s.get('duration', 0) for s in user_sessions)
    total_errors = sum(s.get('total_errors', 0) for s in user_sessions)
    
    # --- ACCURACY CALCULATION ---
    # This prevents division by zero and ensures accuracy doesn't go below 0
    accuracy = 100
    if total_reps > 0:
        accuracy = max(0, 100 - int((total_errors / total_reps) * 20))

    graph_data = []
    for s in user_sessions[-7:]:
        graph_data.append({
            'date': s.get('date', 'Unknown'),
            'reps': s.get('total_reps', 0)
        })

    return jsonify({
        'total_workouts': len(user_sessions),
        'total_reps': total_reps,
        'total_minutes': round(total_duration / 60, 1),
        'accuracy': accuracy,
        'graph_data': graph_data
    })

@app.route('/api/user/analytics_detailed', methods=['POST'])
def get_analytics_detailed():
    """Delegates complex analytics to AI Engine"""
    if sessions_collection is None: return jsonify({'error': 'DB Error'}), 503
    email = request.json.get('email')
    
    sessions = list(sessions_collection.find({'email': email}).sort('timestamp', 1))
    return jsonify(AIEngine.get_detailed_analytics(sessions))

@app.route('/api/user/ai_prediction', methods=['POST'])
def get_ai_prediction():
    """Delegates recovery prediction to AI Engine"""
    if sessions_collection is None: return jsonify({'error': 'DB Error'}), 503
    email = request.json.get('email')
    
    sessions = list(sessions_collection.find({'email': email}).sort('timestamp', 1))
    if not sessions:
        return jsonify({'error': 'No data'}), 404

    return jsonify(AIEngine.get_recovery_prediction(sessions))

# --- 5. TRACKING CONTROL ROUTES ---

@app.route('/start_tracking')
def start_tracking():
    global workout_session
    if workout_session:
        try: workout_session.stop()
        except: pass
    
    try:
        init_session()
        workout_session.start()
        return jsonify({'status': 'success', 'message': 'Session started'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Failed to start: {e}'}), 500

@app.route('/stop_tracking', methods=['POST'])
def stop_tracking():
    """Stop workout and save detailed data"""
    global workout_session
    
    if not workout_session:
        return jsonify({'status': 'inactive'})
    
    data = request.json
    user_email = data.get('email') if data else None
    
    # --- CRITICAL FOR ACCURACY ---
    # We must capture WHICH exercise was done (e.g., 'Squat')
    # If we default to 'Freestyle' for everything, accuracy stats become meaningless.
    exercise_name = data.get('exercise', 'Freestyle') 
    
    try:
        report = workout_session.get_final_report()
        workout_session.stop() 
        
        if user_email and sessions_collection is not None:
            right_summary = report['summary']['RIGHT']
            left_summary = report['summary']['LEFT']
            
            session_doc = {
                'email': user_email,
                'date': datetime.now().strftime("%Y-%m-%d"),
                'timestamp': time.time(),
                'exercise': exercise_name, # Storing the specific exercise type
                'duration': report.get('duration', 0),
                'total_reps': right_summary['total_reps'] + left_summary['total_reps'],
                'right_reps': right_summary['total_reps'],
                'left_reps': left_summary['total_reps'],
                'total_errors': right_summary['error_count'] + left_summary['error_count']
            }
            sessions_collection.insert_one(session_doc)
            print(f"💾 Saved '{exercise_name}' for {user_email}")

        return jsonify({'status': 'success', 'report': report})
    except Exception as e:
        print(f"Error stopping session: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/video_feed')
def video_feed():
    return Response(generate_video_frames(), 
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/data_feed')
def data_feed():
    if workout_session:
        return jsonify(workout_session.get_state_dict())
    return jsonify({'status': 'INACTIVE'})

@app.route('/report_data')
def report_data():
    if workout_session:
        return jsonify(workout_session.get_final_report())
    return jsonify({'error': 'No session data available'})

if __name__ == '__main__':
    init_session()
    app.run(host='0.0.0.0', port=5000, debug=True)