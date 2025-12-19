"""
AI Engine with BALANCED focus on both arms
"""
import random
import os
import joblib
import requests
import numpy as np
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class AIEngine:
    
    _model = None
    
    @classmethod
    def load_model(cls):
        """Loads the trained Random Forest model"""
        if cls._model is None:
            try:
                model_path = os.path.join(os.path.dirname(__file__), "rehab_model.pkl")
                if os.path.exists(model_path):
                    cls._model = joblib.load(model_path)
                    print(f"✅ AI Model Loaded: {model_path}")
                else:
                    print("⚠️ AI Model not found. Using heuristics.")
            except Exception as e:
                print(f"❌ Error loading AI model: {e}")
                cls._model = None

    @classmethod
    def predict_form(cls, features: list) -> int:
        """
        Predicts form quality using ML model
        Returns: 1 for Good Form, 0 for Bad Form
        """
        if cls._model is None:
            return 1
        
        try:
            input_vector = np.array(features).reshape(1, -1)
            prediction = cls._model.predict(input_vector)[0]
            return int(prediction)
        except Exception as e:
            return 1

    @staticmethod
    def get_detailed_analytics(sessions):
        """Processes session history for analytics"""
        history = []
        exercise_counts = {}
        total_acc_sum = 0
        count_acc = 0

        for s in sessions:
            reps = s.get('total_reps', 0)
            errors = s.get('total_errors', 0)
            exercise = s.get('exercise', 'Freestyle') 
            
            acc = 100
            if reps > 0:
                acc = max(0, int((reps - errors) / reps * 100)) 
            
            date_str = s.get('date', 'Unknown')
            history.append({
                'date': date_str,
                'date_short': date_str[5:] if len(date_str) >= 10 else date_str,
                'reps': reps,
                'accuracy': acc,
                'duration': s.get('duration', 0)
            })
            
            if exercise in exercise_counts:
                exercise_counts[exercise] += reps
            else:
                exercise_counts[exercise] = reps
                
            if reps > 0:
                total_acc_sum += acc
                count_acc += 1

        exercise_stats = [{'name': k, 'total_reps': v} for k, v in exercise_counts.items()]
        avg_accuracy = round(total_acc_sum / count_acc) if count_acc > 0 else 100

        return {
            'history': history,
            'exercise_stats': exercise_stats,
            'average_accuracy': avg_accuracy
        }

    @staticmethod
    def get_recovery_prediction(sessions):
        """Generates AI predictions for recovery metrics"""
        if not sessions:
            return None

        # 1. COMPLIANCE & STREAK
        dates = [s['date'] for s in sessions]
        today = datetime.now().date()
        date_set = set(dates)
        
        loop_date = today
        current_streak = 0
        if loop_date.strftime("%Y-%m-%d") not in date_set:
             yesterday = loop_date - timedelta(days=1)
             if yesterday.strftime("%Y-%m-%d") in date_set:
                 loop_date = yesterday

        while loop_date.strftime("%Y-%m-%d") in date_set:
            current_streak += 1
            loop_date -= timedelta(days=1)
        
        last_7_days = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
        days_trained = sum(1 for d in last_7_days if d in date_set)
        adherence = int((days_trained / 7) * 100)

        # 2. BALANCED ASYMMETRY CALCULATION
        total_right = sum(s.get('right_reps', 0) for s in sessions)
        total_left = sum(s.get('left_reps', 0) for s in sessions)
        total_limb = total_right + total_left
        asymmetry = 0
        if total_limb > 0:
            asymmetry = abs(total_right - total_left) / total_limb * 100

        # 3. AI METRICS
        recent_sessions = sessions[-5:]
        rom_progress = []
        stability_score = 0
        session_history = []

        for s in sessions:
            reps = s.get('total_reps', 1) or 1
            errors = s.get('total_errors', 0)
            acc = max(0, int((reps - errors) / reps * 100)) 
            base_rom = 85 + (acc * 0.5) 
            rom_val = min(145, max(60, int(base_rom))) 
            date_label = s.get('date', 'Unknown')
            
            session_history.append({
                'date': date_label,
                'accuracy': acc,
                'reps': reps,
                'rom': rom_val,
                'errors': errors
            })

        for s in recent_sessions:
            reps = s.get('total_reps', 1) or 1
            errors = s.get('total_errors', 0)
            acc = max(0, int((reps - errors) / reps * 100)) 
            base_rom = 85 + (acc * 0.5)
            rom_val = min(145, max(60, int(base_rom)))
            
            date_str = s.get('date', 'Unknown')
            short_date = date_str[5:] if len(date_str) >= 10 else date_str

            rom_progress.append({
                'date': short_date, 
                'rom': rom_val
            })
            stability_score += acc
            
        avg_stability = int(stability_score / len(recent_sessions)) if recent_sessions else 0

        # 4. BALANCED RECOMMENDATIONS
        recommendations = []
        if asymmetry > 15:
            weaker = "Left" if total_right > total_left else "Right"
            recommendations.append(f"⚖️ Balance Alert: {weaker} side needs {int(asymmetry)}% more work. Focus on unilateral exercises.")
        
        if avg_stability < 70:
            recommendations.append("📊 Form Focus: AI detected recurring form issues. Slow down your movements.")
        elif avg_stability > 90:
            recommendations.append("🎯 Excellent Form! Consider increasing resistance or rep count.")
        
        if adherence < 50:
            recommendations.append("📅 Consistency Tip: Aim for 4+ days/week to prevent regression.")
        else:
            recommendations.append("✅ Great Consistency! Keep up the excellent routine.")

        # 5. HOTSPOTS
        severity = 100 - avg_stability
        hotspots = {
            'shoulder': int(severity * 0.7),
            'elbow': int(severity * 0.3),
            'hip': int(severity * 0.1)
        }

        session_history.reverse()

        return {
            'rom_chart': rom_progress,
            'asymmetry': {
                'right': total_right, 
                'left': total_left, 
                'score': int(asymmetry),
                'message': f"{'Balanced' if asymmetry < 10 else 'Needs Attention'}"
            },
            'stability_score': avg_stability,
            'compliance': {
                'streak': current_streak, 
                'weekly_adherence': adherence, 
                'days_trained': days_trained
            },
            'recommendations': recommendations,
            'hotspots': hotspots,
            'session_history': session_history
        }

    def generate_commentary(self, context, query, history):
        """
        Generates BALANCED contextual AI feedback using Google Gemini API
        Falls back to rule-based logic if API fails
        """
        api_key = os.getenv("GEMINI_API_KEY")
        
        # 1. API CALL TO GEMINI
        if api_key:
            print(f"🤖 Connecting to Gemini... Query: {query}")
            try:
                # BALANCED context for both arms
                reps = context.get('reps', 0)
                right_reps = context.get('right_reps', 0)
                left_reps = context.get('left_reps', 0)
                errors = context.get('errors', 0)
                feedback = context.get('feedback', 'None')
                exercise = context.get('exercise', 'Workout')
                
                # Calculate balance
                balance_msg = ""
                if right_reps > 0 or left_reps > 0:
                    if right_reps > left_reps + 2:
                        balance_msg = f"Note: Right arm is {right_reps - left_reps} reps ahead."
                    elif left_reps > right_reps + 2:
                        balance_msg = f"Note: Left arm is {left_reps - right_reps} reps ahead."
                
                system_prompt = (
                    f"You are a Physio AI Coach. The user is doing {exercise}. "
                    f"Total Reps: {reps} (Right: {right_reps}, Left: {left_reps}). "
                    f"{balance_msg} "
                    f"Recent Form Feedback: {feedback}. "
                    "Answer briefly (max 2 sentences) and motivate the user. "
                    "Focus on balanced training for both arms/sides."
                )
                
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={api_key}"
                headers = {'Content-Type': 'application/json'}
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": f"{system_prompt}\nUser Question: {query}"
                        }]
                    }]
                }
                
                response = requests.post(url, headers=headers, json=payload, timeout=5)
                
                if response.status_code == 200:
                    data = response.json()
                    ai_text = data['candidates'][0]['content']['parts'][0]['text']
                    print("✅ Gemini Response Received")
                    return ai_text
                else:
                    print(f"⚠️ Gemini API Error {response.status_code}: {response.text}")

            except Exception as e:
                print(f"❌ Gemini Connection Failed: {e}")

        # 2. FALLBACK LOGIC
        print("⚠️ Using Rule-Based Fallback")
        return self._rule_based_commentary(context, query)

    def _rule_based_commentary(self, context, query):
        """BALANCED fallback method for offline mode"""
        query = query.lower()
        
        reps = context.get('reps', 0)
        right_reps = context.get('right_reps', 0)
        left_reps = context.get('left_reps', 0)
        feedback = str(context.get('feedback', ''))
        exercise = context.get('exercise', 'Exercise')

        # BALANCED RESPONSES
        if "form" in query or "doing" in query or "correct" in query:
            if "bad" in feedback.lower() or "fix" in feedback.lower():
                return f"I see some form issues. {feedback}. Focus on controlled movements."
            return f"Your form is solid! Total: {reps} reps (Right: {right_reps}, Left: {left_reps})."
            
        elif "reps" in query or "count" in query or "how many" in query:
            if abs(right_reps - left_reps) > 2:
                weaker = "left" if right_reps > left_reps else "right"
                return f"Total: {reps} reps. Right: {right_reps}, Left: {left_reps}. Focus on your {weaker} side!"
            return f"You've completed {reps} reps! Right: {right_reps}, Left: {left_reps}. Well balanced!"
            
        elif "balance" in query or "even" in query or "equal" in query:
            diff = abs(right_reps - left_reps)
            if diff < 2:
                return "Excellent balance between both sides!"
            weaker = "left" if right_reps > left_reps else "right"
            return f"Your {weaker} side needs {diff} more reps to balance out."
            
        elif "tired" in query or "hard" in query or "difficult" in query:
            return "You're doing amazing! Take a breath and give me 3 more controlled reps on each side."
        
        elif "stop" in query or "quit" in query or "end" in query:
            return "ACTION: STOP"
            
        return f"Great work on your {exercise}! You're at {reps} total reps. Keep the momentum!"

# Initial load
AIEngine.load_model()