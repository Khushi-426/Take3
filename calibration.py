"""
Calibration logic: Dynamically determines ROM thresholds with minimal voice spam
"""
import time
from typing import TYPE_CHECKING
from constants import CalibrationPhase, ExerciseConfig

if TYPE_CHECKING:
    from pose_processor import PoseProcessor
    from models import CalibrationData

class CalibrationManager:
    def __init__(self, pose_processor, data: 'CalibrationData', hold_time: int, safety_margin: int):
        self.pose_processor = pose_processor
        self.data = data
        self.hold_time = hold_time
        self.safety_margin = safety_margin
        
        self.exercise_config: ExerciseConfig = pose_processor.config
        self.joint_name = self.exercise_config.joint_to_track.value.title()
        self.exercise_name = self.exercise_config.name

        self.start_time = 0.0
        self.min_angle = 360  
        self.max_angle = 0    

    def start(self):
        """Initializes the calibration sequence with a stable instruction."""
        self.data.active = True
        self.data.phase = CalibrationPhase.EXTEND
        # SINGLE CLEAR MESSAGE: Only triggers speech once at phase start
        self.data.message = f"Please fully EXTEND your {self.joint_name} joint."
        self.data.progress = 0
        self.start_time = time.time()
        self.min_angle = 360
        self.max_angle = 0
        print(f"Starting calibration for: {self.exercise_name}")

    def process_frame(self, results, current_time: float) -> bool:
        """Processes pose data to determine range of motion limits."""
        if not self.data.active:
            return False

        angles = self.pose_processor.get_both_arm_angles(results)
        valid_angles = [a for a in angles.values() if a is not None]

        if not valid_angles:
            # Only update if the joint is actually lost to avoid voice spam
            if "ensure" not in self.data.message:
                self.data.message = f"Searching for your {self.joint_name} joint..."
            self.start_time = current_time 
            return False
            
        current_angle = sum(valid_angles) / len(valid_angles)
        self.min_angle = min(self.min_angle, current_angle)
        self.max_angle = max(self.max_angle, current_angle)
        
        elapsed_time = current_time - self.start_time
        self.data.progress = int((elapsed_time / self.hold_time) * 100)
        
        if self.data.phase == CalibrationPhase.EXTEND:
            # Transition to contraction phase after hold time
            if elapsed_time >= self.hold_time:
                self.data.extended_threshold = int(self.max_angle)
                self.data.phase = CalibrationPhase.CONTRACT
                # Update message once for the new phase
                self.data.message = "Great. Now fully CONTRACT that joint."
                self.start_time = current_time
                self.data.progress = 0
                self.min_angle = 360 
                self.max_angle = 0 
        
        elif self.data.phase == CalibrationPhase.CONTRACT:
            # Finalize calibration once contracted position is held
            if elapsed_time >= self.hold_time:
                self.data.contracted_threshold = int(self.min_angle)
                self._finalize_calibration()
                return True
                
        return False

    def _finalize_calibration(self):
        """Calculates final thresholds and sets the completion message."""
        self.data.safe_angle_min = max(20, self.data.contracted_threshold - self.safety_margin)
        self.data.safe_angle_max = min(175, self.data.extended_threshold + self.safety_margin)

        self.data.active = False
        self.data.phase = CalibrationPhase.COMPLETE
        # Final success message
        self.data.message = "Calibration successful. Ready to start!"
        self.data.progress = 100
        print(f"Calibration Finalized: {self.data.contracted_threshold} to {self.data.extended_threshold}")