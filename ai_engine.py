"""
AI Engine & Analytics Logic
Handles data processing, statistical analysis, and recovery predictions.
"""
import random
import time
from datetime import datetime, timedelta

class AIEngine:
    
    @staticmethod
    def get_detailed_analytics(sessions):
        """Processes session history for the Analytics graphs."""
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
                acc = max(0, 100 - int((errors / reps) * 20))
            
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
        """Generates AI predictions for ROM, Asymmetry, Recommendations, and Session History."""
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

        # 2. ASYMMETRY
        total_right = sum(s.get('right_reps', 0) for s in sessions)
        total_left = sum(s.get('left_reps', 0) for s in sessions)
        total_limb = total_right + total_left
        asymmetry = 0
        if total_limb > 0:
            asymmetry = abs(total_right - total_left) / total_limb * 100

        # 3. AI METRICS & SESSION HISTORY
        recent_sessions = sessions[-5:]
        rom_progress = []
        stability_score = 0
        session_history = []

        # --- FIX: Ensure we have data for charts ---
        # If user has only 1 session, add a dummy "Baseline" point so the line chart works
        if len(recent_sessions) == 1:
            try:
                base_date = datetime.strptime(recent_sessions[0]['date'], "%Y-%m-%d")
                prev_date = (base_date - timedelta(days=1)).strftime("%Y-%m-%d")
                rom_progress.append({'date': prev_date[5:], 'rom': 70}) # Start at 70 deg baseline
            except:
                pass

        for s in sessions:
            reps = s.get('total_reps', 1) or 1
            errors = s.get('total_errors', 0)
            acc = max(0, 100 - int((errors / reps) * 20))
            
            # Simulate metrics based on data
            base_rom = 85 + (acc * 0.5) 
            rom_val = min(145, max(60, int(base_rom + random.uniform(-5, 5))))
            
            # Prepare data for charts
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
            acc = max(0, 100 - int((errors / reps) * 20))
            base_rom = 85 + (acc * 0.5)
            rom_val = min(145, max(60, int(base_rom + random.uniform(-5, 5))))
            
            # Date Formatting Safe Check
            date_str = s.get('date', 'Unknown')
            short_date = date_str[5:] if len(date_str) >= 10 else date_str

            rom_progress.append({
                'date': short_date, 
                'rom': rom_val
            })
            stability_score += acc
            
        avg_stability = int(stability_score / len(recent_sessions)) if recent_sessions else 0

        # 4. RECOMMENDATIONS
        recommendations = []
        if asymmetry > 15:
            weaker = "Left" if total_right > total_left else "Right"
            recommendations.append(f"Imbalance: {weaker} side lagging by {int(asymmetry)}%. Use unilateral exercises.")
        if avg_stability < 70:
            recommendations.append("Low Stability: Slow down rep tempo to improve control.")
        elif avg_stability > 90:
            recommendations.append("High Stability: Ready to increase resistance.")
        if adherence < 50:
            recommendations.append("Consistency: Aim for 4+ days/week.")

        # 5. HOTSPOTS
        severity = 100 - avg_stability
        hotspots = {
            'shoulder': int(severity * random.uniform(0.5, 1.0)),
            'elbow': int(severity * random.uniform(0.2, 0.6)),
            'hip': int(severity * random.uniform(0.1, 0.4))
        }

        session_history.reverse()

        return {
            'rom_chart': rom_progress,
            'asymmetry': {'right': total_right, 'left': total_left, 'score': int(asymmetry)},
            'stability_score': avg_stability,
            'compliance': {'streak': current_streak, 'weekly_adherence': adherence, 'days_trained': days_trained},
            'recommendations': recommendations,
            'hotspots': hotspots,
            'session_history': session_history
        }