"""
MediaPipe pose detection and landmark extraction - AGNOSTIC
"""
import mediapipe as mp
from typing import Dict, Optional
# [Change] Import the new ExerciseConfig for type hinting and configuration
from constants import ExerciseConfig 


class PoseProcessor:
    """Handles MediaPipe pose detection and landmark extraction"""
    
    # [Change] Remove hardcoded ARM_CONFIG
    
    def __init__(self, angle_calculator, exercise_config: ExerciseConfig): # << MODIFIED
        self.angle_calculator = angle_calculator
        self.config = exercise_config # Store the current exercise configuration
    
    def extract_arm_angle(self, landmarks, arm: str) -> Optional[float]:
        """Extract angle for the specified joint using the current exercise config"""
        try:
            # 1. Select the correct landmark index list based on arm/side
            if arm == 'RIGHT':
                indices = self.config.right_landmarks
            elif arm == 'LEFT':
                indices = self.config.left_landmarks
            else:
                return None
            
            # Indices are (A, B, C) where B is the vertex
            A_idx, B_idx, C_idx = indices
            
            # 2. Extract Coordinates
            A = [landmarks[A_idx].x, landmarks[A_idx].y] 
            B = [landmarks[B_idx].x, landmarks[B_idx].y] 
            C = [landmarks[C_idx].x, landmarks[C_idx].y] 
            
            # 3. Check landmark visibility
            if (landmarks[A_idx].visibility < 0.6 or
                landmarks[B_idx].visibility < 0.6 or
                landmarks[C_idx].visibility < 0.6):
                return None

            # 4. Calculate and smooth the angle
            raw_angle = self.angle_calculator.calculate_angle(A, B, C)
            return self.angle_calculator.get_smoothed_angle(arm, raw_angle)
            
        except (KeyError, IndexError, AttributeError):
            return None
    
    def get_both_arm_angles(self, results) -> Dict[str, Optional[int]]:
        """Get angles for both sides defined in the config"""
        if not results.pose_landmarks:
            return {'RIGHT': None, 'LEFT': None}
        
        landmarks = results.pose_landmarks.landmark
        return {
            'RIGHT': self.extract_arm_angle(landmarks, 'RIGHT'),
            'LEFT': self.extract_arm_angle(landmarks, 'LEFT')
        }