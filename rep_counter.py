"""
Rep counting logic - BALANCED FOR BOTH ARMS
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

        # State confirmation variables - INDEPENDENT
        self.state_hold_time = 0.1 
        self.pending_state = {'RIGHT': None, 'LEFT': None}
        self.pending_state_start = {'RIGHT': 0, 'LEFT': 0}
        
        self.rep_start_time = {'RIGHT': 0, 'LEFT': 0}
        self.last_rep_time = {'RIGHT': 0, 'LEFT': 0}
        
        # Compliments - BALANCED
        self.compliments = [
            "Great Rep!", 
            "Excellent Form!", 
            "Perfect!", 
            "Nice Work!",
            "Keep It Up!",
            "Fantastic!"
        ]
        self.current_compliment = {'RIGHT': "Maintain Form", 'LEFT': "Maintain Form"}
        
        # Track last feedback to avoid spam
        self.last_feedback = {'RIGHT': "", 'LEFT': ""}
        self.feedback_cooldown = {'RIGHT': 0, 'LEFT': 0}

    def process_rep(self, arm, angle, metrics, current_time, history):
        """Process rep counting for a single arm independently"""
        metrics.angle = angle
        self.angle_history[arm].append(angle)

        if len(self.angle_history[arm]) < 2:
            return

        prev_stage = metrics.stage
        
        # Get calibrated thresholds
        contracted = self.calibration.contracted_threshold
        extended = self.calibration.extended_threshold
        
        # --- 1. DETERMINE STATE (Independent for each arm) ---
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

        # --- 3. BALANCED FEEDBACK GENERATION ---
        self._provide_form_feedback(arm, angle, metrics, current_time)

    def _determine_target_state(self, angle, contracted, extended, current_stage):
        """
        Determines state with buffer for easier rep counting
        """
        # Generous buffer to make reaching targets easier
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
                
                self.rep_start_time[arm] = 0 
                self.last_rep_time[arm] = current_time
                
                # Select random compliment
                self.current_compliment[arm] = random.choice(self.compliments)
                
                # Reset feedback cooldown on successful rep
                self.feedback_cooldown[arm] = current_time + 2.0

        elif new_stage == ArmStage.DOWN.value:
            self.rep_start_time[arm] = current_time 
            
        elif new_stage == ArmStage.UP.value:
            if self.rep_start_time[arm] == 0:
                self.rep_start_time[arm] = current_time

    def _provide_form_feedback(self, arm, angle, metrics, current_time):
        """
        BALANCED Feedback Logic:
        1. Show compliment after successful rep (2s)
        2. Critical form errors ONLY (extreme angles)
        3. Default to "Maintain Form"
        """
        # 1. PRIORITY: Show compliment after rep
        if (current_time - self.last_rep_time[arm]) < 2.0:
            metrics.feedback = self.current_compliment[arm]
            metrics.feedback_color = "GREEN"
            return

        # 2. Check if we're in cooldown (prevents feedback spam)
        if current_time < self.feedback_cooldown[arm]:
            metrics.feedback = "Maintain Form"
            metrics.feedback_color = "GREEN"
            return

        # 3. CRITICAL ERRORS ONLY (Extreme angles)
        new_feedback = ""
        if angle < 5.0:
            new_feedback = "Too Much Curl"
            metrics.feedback_color = "RED"
        elif angle > 175.0:
            new_feedback = "Over Extended"
            metrics.feedback_color = "RED"
        else:
            # 4. DEFAULT: Good form
            new_feedback = "Maintain Form"
            if metrics.stage == ArmStage.UP.value:
                metrics.feedback_color = "GREEN"
            elif metrics.stage in [ArmStage.MOVING_UP.value, ArmStage.MOVING_DOWN.value]:
                metrics.feedback_color = "YELLOW"
            else:
                metrics.feedback_color = "GREEN"
        
        # Only update if feedback changed (reduces TTS spam)
        if new_feedback != self.last_feedback[arm]:
            metrics.feedback = new_feedback
            self.last_feedback[arm] = new_feedback
            
            # Set cooldown for error messages
            if metrics.feedback_color == "RED":
                self.feedback_cooldown[arm] = current_time + 3.0
        else:
            metrics.feedback = new_feedback

    def reset_arm(self, arm):
        """Reset tracking for specific arm"""
        self.angle_history[arm].clear()
        self.pending_state[arm] = None
        self.rep_start_time[arm] = 0
        self.last_feedback[arm] = ""
        self.feedback_cooldown[arm] = 0