"""
Rep counting logic - STABILIZED AND ACCURACY-FOCUSED
"""
from collections import deque
from constants import ArmStage
import time
import random

class RepCounter:
    def __init__(self, calibration_data, min_rep_duration=0.5):
        self.calibration = calibration_data
        self.min_rep_duration = min_rep_duration 

        # Stability buffers for EACH arm independently
        self.angle_history = {
            'RIGHT': deque(maxlen=8),
            'LEFT': deque(maxlen=8)
        }

        # --- NEW STABILITY LOGIC: Prevents rapid color flickering ---
        self.color_lock_until = {'RIGHT': 0, 'LEFT': 0}
        self.color_hold_duration = 1.5 # Seconds to hold a color (e.g. Green) stable

        # State confirmation variables - INDEPENDENT
        self.state_hold_time = 0.1 
        self.pending_state = {'RIGHT': None, 'LEFT': None}
        self.pending_state_start = {'RIGHT': 0, 'LEFT': 0}
        
        self.rep_start_time = {'RIGHT': 0, 'LEFT': 0}
        self.last_rep_time = {'RIGHT': 0, 'LEFT': 0}
        
        # TRACKING PEAKS FOR ACCURACY
        self.rep_min_angle = {'RIGHT': 180, 'LEFT': 180}
        self.rep_max_angle = {'RIGHT': 0, 'LEFT': 0}
        
        # Compliments - USER CENTERED
        self.compliments = [
            "Perfect Form!", 
            "Great Control!", 
            "Nice and steady!", 
            "Excellent!"
        ]
        self.current_compliment = {'RIGHT': "Maintain Form", 'LEFT': "Maintain Form"}
        
        # Track last feedback to avoid spam
        self.last_feedback = {'RIGHT': "", 'LEFT': ""}
        self.feedback_cooldown = {'RIGHT': 0, 'LEFT': 0}

    def _calculate_rep_accuracy(self, arm):
        """Calculates 0-100% accuracy based on calibrated range of motion"""
        cal_ext = self.calibration.extended_threshold
        cal_con = self.calibration.contracted_threshold
        cal_range = abs(cal_ext - cal_con)
        
        if cal_range == 0: return 100
        
        user_range = abs(self.rep_max_angle[arm] - self.rep_min_angle[arm])
        accuracy = (user_range / cal_range) * 100
        return min(100, int(accuracy))

    def process_rep(self, arm, angle, metrics, current_time, history):
        """Process rep counting for a single arm independently"""
        metrics.angle = angle
        self.angle_history[arm].append(angle)

        # Track peaks during the current rep for accuracy calculation
        self.rep_min_angle[arm] = min(self.rep_min_angle[arm], angle)
        self.rep_max_angle[arm] = max(self.rep_max_angle[arm], angle)

        if len(self.angle_history[arm]) < 2:
            return

        prev_stage = metrics.stage
        
        # Get calibrated thresholds
        contracted = self.calibration.contracted_threshold
        extended = self.calibration.extended_threshold
        
        # --- 1. DETERMINE STATE ---
        target_state = self._determine_target_state(angle, contracted, extended, prev_stage)
        
        # --- 2. STATE SWITCHING WITH CONFIRMATION ---
        if target_state != prev_stage:
            if self.pending_state[arm] == target_state:
                if (current_time - self.pending_state_start[arm]) >= self.state_hold_time:
                    self._handle_state_transition(arm, prev_stage, target_state, metrics, current_time)
            else:
                self.pending_state[arm] = target_state
                self.pending_state_start[arm] = current_time
        else:
            self.pending_state[arm] = None

        # Update rep timing
        if metrics.stage == ArmStage.UP.value:
            metrics.curr_rep_time = current_time - self.rep_start_time[arm]

        # --- 3. STABILIZED FEEDBACK GENERATION ---
        self._provide_user_centered_feedback(arm, angle, metrics, current_time)

    def _determine_target_state(self, angle, contracted, extended, current_stage):
        """Determines state with buffer for easier rep counting"""
        buffer = 15 
        up_limit = contracted + buffer 
        down_limit = extended - buffer

        if angle <= up_limit:
            return ArmStage.UP.value
        elif angle >= down_limit:
            return ArmStage.DOWN.value
        
        # Hysteresis Transitions (prevents flickering)
        if current_stage == ArmStage.UP.value:
            return ArmStage.UP.value if angle < (up_limit + 5) else ArmStage.MOVING_DOWN.value
        elif current_stage == ArmStage.DOWN.value:
            return ArmStage.DOWN.value if angle > (down_limit - 5) else ArmStage.MOVING_UP.value
        elif current_stage == ArmStage.MOVING_UP.value:
            return ArmStage.UP.value if angle <= up_limit else ArmStage.MOVING_UP.value
        elif current_stage == ArmStage.MOVING_DOWN.value:
            return ArmStage.DOWN.value if angle >= down_limit else ArmStage.MOVING_DOWN.value
            
        return current_stage

    def _handle_state_transition(self, arm, prev_stage, new_stage, metrics, current_time):
        """Handle state transitions and rep counting"""
        metrics.stage = new_stage
        
        # DETECT REP COMPLETION (When moving from UP to DOWN)
        if prev_stage == ArmStage.UP.value and new_stage in [ArmStage.MOVING_DOWN.value, ArmStage.DOWN.value]:
            
            rep_duration = current_time - self.rep_start_time[arm]
            
            # Validate rep duration
            if rep_duration >= self.min_rep_duration:
                metrics.rep_count += 1
                metrics.rep_time = rep_duration
                
                # Calculate accuracy for this completed rep
                metrics.accuracy = self._calculate_rep_accuracy(arm)
                
                self.rep_start_time[arm] = 0 
                self.last_rep_time[arm] = current_time
                
                # Select random compliment
                self.current_compliment[arm] = random.choice(self.compliments)
                
                # NEW: Lock the success color for stability
                self.color_lock_until[arm] = current_time + self.color_hold_duration

                # Reset peaks for next rep
                self.rep_min_angle[arm], self.rep_max_angle[arm] = 180, 0

        elif new_stage == ArmStage.DOWN.value:
            self.rep_start_time[arm] = current_time 
            
        elif new_stage == ArmStage.UP.value:
            if self.rep_start_time[arm] == 0:
                self.rep_start_time[arm] = current_time

    def _provide_user_centered_feedback(self, arm, angle, metrics, current_time):
        """Encouraging feedback with stable UI colors"""
        
        # 1. PRIORITY: Show compliment after rep (Locked to prevent flickering)
        if (current_time - self.last_rep_time[arm]) < self.color_hold_duration:
            metrics.feedback = self.current_compliment[arm]
            metrics.feedback_color = "GREEN"
            return

        # 2. Check UI Color Lock: Don't change color if it's currently locked
        if current_time < self.color_lock_until[arm]:
            return

        # 3. Form Coaching (User-Centered Phrasing)
        new_feedback = ""
        if angle < 10.0:
            new_feedback = "Relax your grip slightly"
            metrics.feedback_color = "YELLOW"
        elif angle > 170.0:
            new_feedback = "Focus on a full extension"
            metrics.feedback_color = "GREEN"
        else:
            new_feedback = "Smooth movements"
            metrics.feedback_color = "GREEN"
            
        # Error states only for tracking loss
        if metrics.stage == ArmStage.LOST.value:
            new_feedback = "Adjust your position"
            metrics.feedback_color = "RED"
            self.color_lock_until[arm] = current_time + 2.0 # Lock error color slightly longer
        
        # Only update if feedback changed (reduces TTS spam)
        if new_feedback != self.last_feedback[arm]:
            metrics.feedback = new_feedback
            self.last_feedback[arm] = new_feedback
        else:
            metrics.feedback = new_feedback

    def reset_arm(self, arm):
        """Reset tracking for specific arm"""
        self.angle_history[arm].clear()
        self.pending_state[arm] = None
        self.rep_start_time[arm] = 0
        self.last_feedback[arm] = ""
        self.color_lock_until[arm] = 0