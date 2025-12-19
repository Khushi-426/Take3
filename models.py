"""
Data classes for state management - UPDATED FOR USER-CENTERED DESIGN & ACCURACY
"""
from dataclasses import dataclass, field
from typing import Dict, List
import time

# --- NEW MODELS FOR GHOST POSE ---
@dataclass
class Landmark2D:
    """Represents a normalized 2D coordinate (0.0 to 1.0)"""
    x: float = 0.0
    y: float = 0.0

@dataclass
class GhostPose:
    """
    Represents the target pose skeleton and instructions for the ghost model overlay.
    Coordinates are normalized (0.0 to 1.0).
    """
    # Key is MediaPipe index (converted to string on output), value is normalized [x, y]
    landmarks: Dict[int, Landmark2D] = field(default_factory=dict)
    color: str = "GRAY" # Will be "GREEN", "RED", "YELLOW", or "GRAY"
    instruction: str = "Calibrating..."
    connections: List[tuple] = field(default_factory=list)


@dataclass
class ArmMetrics:
    """Stores all metrics for a single arm including user-centered accuracy"""
    rep_count: int = 0
    stage: str = "DOWN"
    angle: int = 0
    accuracy: int = 100  # NEW: Tracks rep quality (0-100%)
    rep_time: float = 0.0
    min_rep_time: float = 0.0
    curr_rep_time: float = 0.0
    feedback: str = ""
    last_down_time: float = field(default_factory=time.time)
    stage_start_time: float = field(default_factory=time.time)
    feedback_color: str = "GRAY" 
    
    def to_dict(self) -> dict:
        """Returns session state for frontend communication including accuracy"""
        return {
            'rep_count': self.rep_count,
            'stage': self.stage,
            'angle': self.angle,
            'accuracy': self.accuracy, # Now sent to frontend
            'rep_time': round(self.rep_time, 2),
            'min_rep_time': round(self.min_rep_time, 2),
            'curr_rep_time': round(self.curr_rep_time, 2),
            'feedback': self.feedback,
            'feedback_color': self.feedback_color 
        }

@dataclass
class CalibrationData:
    """Manages calibration state and measurements"""
    active: bool = False
    phase: str = None # Now uses string phases like "EXTEND"
    phase_start_time: float = 0.0
    extended_angles: Dict[str, List[float]] = field(default_factory=lambda: {'RIGHT': [], 'LEFT': []})
    contracted_angles: Dict[str, List[float]] = field(default_factory=lambda: {'RIGHT': [], 'LEFT': []})
    message: str = "" # Holds the non-repeating calibration instructions
    progress: int = 0
    
    contracted_threshold: int = 50
    extended_threshold: int = 160
    safe_angle_min: int = 30
    safe_angle_max: int = 175
    
    def reset(self):
        """Reset calibration data for new session"""
        self.extended_angles = {'RIGHT': [], 'LEFT': []}
        self.contracted_angles = {'RIGHT': [], 'LEFT': []}
        self.progress = 0

@dataclass
class SessionHistory:
    """Tracks session data for analysis"""
    time: List[float] = field(default_factory=list)
    right_angle: List[int] = field(default_factory=list)
    left_angle: List[int] = field(default_factory=list)
    right_feedback_count: int = 0
    left_feedback_count: int = 0
    
    def reset(self):
        self.time.clear()
        self.right_angle.clear()
        self.left_angle.clear()
        self.right_feedback_count = 0
        self.left_feedback_count = 0