"""
Flask application with API routes - EVENTLET STABLE VERSION
"""
import eventlet
# CRITICAL: Monkey patch must be called before other imports to ensure async compatibility
eventlet.monkey_patch()

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
from flask_mail import Mail, Message
from flask_socketio import SocketIO, emit
from bson.objectid import ObjectId

# --- IMPORT CUSTOM AI MODULE ---
from ai_engine import AIEngine
from constants import EXERCISE_PRESETS

# ----------------------------------------------------
# 0. CONFIGURATION
# ----------------------------------------------------
load_dotenv()

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# Use 'eventlet' async mode for stable WebSocket streaming
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# ----------------------------------------------------
# 1. MAIL CONFIGURATION
# ----------------------------------------------------
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
mail = Mail(app)

# ----------------------------------------------------
# 2. DATABASE SETUP
# ----------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "physiocheck_db"

try:
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,
        tls=True,
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=True,
    )
    # Trigger a connection verify
    client.admin.command("ping")
    db = client[DB_NAME]

    users_collection = db["users"]
    otp_collection = db["otps"]
    sessions_collection = db["sessions"]
    exercises_collection = db["exercises"]
    protocols_collection = db["protocols"]
    notifications_collection = db["notifications"]

    print(f"✅ Connected to MongoDB Cloud: {DB_NAME}")
except Exception as e:
    print(f"⚠️ DB Error: {e}")
    users_collection = None
    otp_collection = None
    sessions_collection = None
    notifications_collection = None

# ----------------------------------------------------
# 3. WORKOUT SESSION MANAGEMENT
# ----------------------------------------------------
workout_session = None

def init_session(exercise_name="Bicep Curl"):
    """Initialize a new workout session, ensuring the old one is closed."""
    global workout_session
    
    # 1. Force close existing session to release camera
    if workout_session:
        try:
            print("🛑 Stopping previous session...")
            workout_session.stop()
        except Exception as e:
            print(f"⚠️ Error stopping previous session: {e}")
        finally:
            workout_session = None

    # 2. Start new session
    print(f"🎥 Initializing Camera for {exercise_name}...")
    from workout_session import WorkoutSession
    workout_session = WorkoutSession(exercise_name)

def generate_video_frames():
    """Generator function to stream video frames."""
    from constants import WorkoutPhase
    global workout_session
    
    if workout_session is None:
        return

    # Loop to capture frames
    while workout_session.phase != WorkoutPhase.INACTIVE:
        try:
            frame, should_continue = workout_session.process_frame()
            
            if not should_continue or frame is None:
                break

            # Emit real-time data to frontend via WebSocket
            socketio.emit("workout_update", workout_session.get_state_dict())
            
            # Allow eventlet to switch contexts (Critical for async)
            socketio.sleep(0.01) 

            # Encode frame for HTTP Stream
            ret, buffer = cv2.imencode(".jpg", frame)
            if ret:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    + buffer.tobytes()
                    + b"\r\n"
                )
        except Exception as e:
            print(f"Stream Error: {e}")
            break

# ----------------------------------------------------
# 4. EXERCISES (FRONTEND DATA)
# ----------------------------------------------------
def _get_frontend_exercise_list():
    meta_map = {
        "Bicep Curl": {
            "category": "Strength",
            "description": "A fundamental exercise for building arm strength and definition. Focuses on the biceps brachii.",
            "instructions": [
                "Stand tall with feet shoulder-width apart.",
                "Hold dumbbells with palms facing forward.",
                "Keep elbows close to your torso at all times.",
                "Curl the weights up while contracting biceps.",
                "Lower the weights slowly to the starting position."
            ],
            "difficulty": "Beginner",
            "duration": "5 Mins",
            "color": "#E3F2FD",
            "iconColor": "#1565C0",
            "recommended": True
        },
        "Knee Lift": {
            "category": "Mobility",
            "description": "Improves hip mobility and balance. Great for warm-ups and rehabilitation.",
            "instructions": [
                "Stand straight with feet together.",
                "Lift one knee up towards your chest.",
                "Hold for a second, maintaining balance.",
                "Lower slowly and switch legs.",
                "Keep your back straight throughout."
            ],
            "difficulty": "Beginner",
            "duration": "5 Mins",
            "color": "#E8F5E9",
            "iconColor": "#2E7D32",
            "recommended": False
        },
        "Shoulder Press": {
            "category": "Strength",
            "description": "Builds shoulder and upper arm strength. Enhances overhead stability.",
            "instructions": [
                "Hold dumbbells at shoulder height, palms forward.",
                "Press weights upwards until arms are extended.",
                "Avoid locking your elbows at the top.",
                "Lower back down to shoulder level with control."
            ],
            "difficulty": "Intermediate",
            "duration": "8 Mins",
            "color": "#FFF3E0",
            "iconColor": "#EF6C00",
            "recommended": True
        },
        "Squat": {
            "category": "Lower Body",
            "description": "Compound movement for legs and core. Essential for functional strength.",
            "instructions": [
                "Stand with feet shoulder-width apart.",
                "Push hips back and bend knees as if sitting.",
                "Keep chest up and back straight.",
                "Lower until thighs are parallel to the floor.",
                "Push through heels to return to start."
            ],
            "difficulty": "Intermediate",
            "duration": "10 Mins",
            "color": "#F3E5F5",
            "iconColor": "#7B1FA2",
            "recommended": False
        },
        "Standing Row": {
            "category": "Back & Core",
            "description": "Strengthens the upper back and improves posture.",
            "instructions": [
                "Stand with slight bend in knees, hinging forward.",
                "Pull weights towards your waist.",
                "Squeeze shoulder blades together at the top.",
                "Lower weights with control."
            ],
            "difficulty": "Intermediate",
            "duration": "7 Mins",
            "color": "#FFEBEE",
            "iconColor": "#C62828",
            "recommended": False
        }
    }

    result = []
    for name in EXERCISE_PRESETS:
        details = meta_map.get(name, {
            "category": "General",
            "description": "Standard rehabilitation exercise.",
            "instructions": ["Maintain good form.", "Follow the visual guide."],
            "difficulty": "General",
            "duration": "5 Mins",
            "color": "#F5F5F5",
            "iconColor": "#616161",
            "recommended": False
        })
        
        result.append({
            "id": name.lower().replace(" ", "_"),
            "title": name,
            **details 
        })
    return result

# ----------------------------------------------------
# 5. SOCKET EVENTS
# ----------------------------------------------------
@socketio.on("connect")
def handle_connect():
    print("🟢 Client connected to WebSocket")

@socketio.on("disconnect")
def handle_disconnect():
    print("🔴 Client disconnected")

@socketio.on("stop_session")
def handle_stop_session(data):
    global workout_session
    if not workout_session:
        return

    data = data or {}
    email = data.get("email")
    exercise = data.get("exercise", "Freestyle")

    try:
        print("🛑 Stop session command received")
        report = workout_session.get_final_report()
        workout_session.stop()
        workout_session = None 

        if email and sessions_collection:
            r = report["summary"]["RIGHT"]
            l = report["summary"]["LEFT"]
            
            sessions_collection.insert_one({
                "email": email,
                "exercise": exercise,
                "timestamp": time.time(),
                "date": datetime.now().strftime("%Y-%m-%d"),
                "total_reps": r["total_reps"] + l["total_reps"],
                "total_errors": r["error_count"] + l["error_count"],
            })

        emit("session_stopped", {"status": "success"})
    except Exception as e:
        print(f"Stop session error: {e}")

# ----------------------------------------------------
# 6. AUTH ROUTES
# ----------------------------------------------------
@app.route("/api/auth/send-otp", methods=["POST"])
def send_otp():
    data = request.get_json(silent=True) or {}
    email = data.get("email")

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400

    otp = "".join(random.choices(string.digits, k=6))
    otp_collection.update_one(
        {"email": email},
        {"$set": {"otp": otp, "created_at": time.time()}},
        upsert=True,
    )

    try:
        msg = Message("PhysioCheck OTP", sender=app.config["MAIL_USERNAME"], recipients=[email])
        msg.body = f"Your verification code is: {otp}"
        mail.send(msg)
        return jsonify({"message": "OTP sent"}), 200
    except Exception as e:
        print(f"Mail Error: {e}")
        return jsonify({"error": "Failed to send email. Check server logs."}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    user = users_collection.find_one({"email": data.get("email")})

    if user and bcrypt.check_password_hash(user["password"], data.get("password")):
        return jsonify({
            "email": user["email"],
            "role": user["role"],
            "name": user["name"]
        })

    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/api/auth/signup-verify", methods=["POST"])
def signup_verify():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    otp_input = data.get("otp")
    password = data.get("password")
    name = data.get("name")
    role = data.get("role", "patient")

    if not all([email, otp_input, password, name]):
        return jsonify({"error": "Missing required fields"}), 400

    otp_record = otp_collection.find_one({"email": email})
    if not otp_record or otp_record.get("otp") != otp_input:
        return jsonify({"error": "Invalid OTP"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = {
        "email": email, 
        "password": hashed_pw, 
        "name": name, 
        "role": role, 
        "created_at": time.time()
    }
    users_collection.insert_one(new_user)
    otp_collection.delete_one({"email": email})

    return jsonify({"user": {"email": email, "name": name, "role": role}}), 201

# ----------------------------------------------------
# 7. EXERCISE ROUTES
# ----------------------------------------------------
@app.route("/api/exercises", methods=["GET"])
def get_exercises():
    return jsonify(_get_frontend_exercise_list())

# ----------------------------------------------------
# 8. ANALYTICS ROUTES
# ----------------------------------------------------
@app.route("/api/user/analytics_detailed", methods=["POST"])
def analytics_detailed():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    if not email: return jsonify({"error": "Email required"}), 400

    sessions = list(sessions_collection.find({"email": email}).sort("timestamp", -1))
    if not sessions: return jsonify({"total_sessions": 0, "history": []})

    history = []
    total_acc = 0
    for s in sessions:
        reps = s.get("total_reps", 0)
        errors = s.get("total_errors", 0)
        acc = max(0, 100 - int((errors / max(reps, 1)) * 20))
        total_acc += acc
        history.append({
            "date": datetime.fromtimestamp(s["timestamp"]).strftime("%Y-%m-%d"),
            "exercise": s.get("exercise"),
            "reps": reps,
            "accuracy": acc
        })

    return jsonify({
        "total_sessions": len(sessions),
        "average_accuracy": total_acc // len(sessions),
        "history": history
    })

@app.route("/api/therapist/patients", methods=["GET"])
def therapist_patients():
    if users_collection is None: return jsonify({"patients": []}), 200

    patients = list(users_collection.find({"role": "patient"}, {"_id": 0, "name": 1, "email": 1, "created_at": 1}))
    enriched = []
    for p in patients:
        last = sessions_collection.find_one({"email": p["email"]}, sort=[("timestamp", -1)])
        status = "Normal"
        if last:
            reps = last.get("total_reps", 0)
            errors = last.get("total_errors", 0)
            accuracy = max(0, 100 - int((errors / max(reps, 1)) * 20))
            if accuracy < 60: status = "High Risk"
            elif accuracy < 80: status = "Alert"
        enriched.append({
            "name": p.get("name", "Unknown"),
            "email": p["email"],
            "date_joined": datetime.fromtimestamp(p.get("created_at", time.time())).strftime("%Y-%m-%d"),
            "status": status,
            "hasActiveProtocol": False
        })
    return jsonify({"patients": enriched}), 200

@app.route("/api/therapist/notifications", methods=["GET"])
def therapist_notifications():
    if notifications_collection is None: return jsonify([]), 200
    notifs = list(notifications_collection.find({}).sort("timestamp", -1).limit(10))
    response = []
    for n in notifs:
        response.append({
            "id": str(n.get("_id")),
            "type": n.get("type", "Info"),
            "title": n.get("title", "System"),
            "message": n.get("message", ""),
            "time": n.get("time", "Recently")
        })
    return jsonify(response), 200

# ----------------------------------------------------
# 9. TRACKING + STREAM
# ----------------------------------------------------
@app.route("/start_tracking", methods=["POST"])
def start_tracking():
    data = request.get_json(silent=True) or {}
    exercise = data.get("exercise", "Bicep Curl")

    init_session(exercise)
    
    if workout_session:
        workout_session.start()
        return jsonify({"status": "started", "exercise": exercise})
    else:
        return jsonify({"error": "Failed to initialize camera"}), 500

@app.route("/video_feed")
def video_feed():
    """Route that the <img> tag points to."""
    return Response(
        generate_video_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/report_data")
def report_data():
    if workout_session:
        return jsonify(workout_session.get_final_report())
    return jsonify({"error": "No session data"})

# ----------------------------------------------------
# 10. RUN SERVER
# ----------------------------------------------------
if __name__ == "__main__":
    print("🚀 Starting Server with EVENTLET on Port 5001...")
    socketio.run(app, host="0.0.0.0", port=5001, debug=True)