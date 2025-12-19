import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Timer,
  ArrowLeft,
  StopCircle,
  Info,
  CheckCircle,
  Activity,
  AlertCircle,
  Play,
  Dumbbell,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  User,
  Loader,
  RefreshCw,
  Target, // New icon for Accuracy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import { io } from "socket.io-client";

import GhostModelOverlay from "./components/GhostModelOverlay";
import AICoach from "./components/AICoach";

// --- UTILITY: TTS ---
const speak = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
};

// --- API CONFIGURATION ---
const API_URL = "http://127.0.0.1:5001";

const Tracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- STATES ---
  const [viewMode, setViewMode] = useState("LIBRARY");
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const [active, setActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // <<< UPDATED DATA STATE TO INCLUDE ACCURACY >>>
  const [data, setData] = useState({
    RIGHT: {
      feedback_color: "GRAY",
      rep_count: 0,
      stage: "DOWN",
      angle: 0,
      feedback: "",
      accuracy: 100, // NEW field
    },
    LEFT: {
      feedback_color: "GRAY",
      rep_count: 0,
      stage: "DOWN",
      angle: 0,
      feedback: "",
      accuracy: 100, // NEW field
    },
    status: "INACTIVE",
    calibration: { message: "Waiting for camera...", progress: 0 },
    remaining: 0,
    exercise_name: "",
    tracked_joint_name: "",
    ghost_pose: {
      landmarks: {},
      color: "GRAY",
      instruction: "Initializing...",
      connections: [],
    },
  });

  const [sessionTime, setSessionTime] = useState(0);
  const [feedback, setFeedback] = useState("Initializing...");
  const [videoTimestamp, setVideoTimestamp] = useState(Date.now());
  const [connectionStatus, setConnectionStatus] = useState("DISCONNECTED");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [countdownValue, setCountdownValue] = useState(null);

  const [socket, setSocket] = useState(null);
  const timerRef = useRef(null);
  const stopTimeoutRef = useRef(null);

  // Ref to track the last spoken instruction to prevent word repetition
  const lastSpokenRef = useRef("");

  // --- 1. SETUP SOCKET CONNECTION & FETCH EXERCISES ---
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("WebSocket Connected");
      setConnectionStatus("CONNECTED");
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket Connection Error:", err);
      setConnectionStatus("DISCONNECTED");
    });

    newSocket.on("disconnect", () => {
      setConnectionStatus("DISCONNECTED");
    });

    newSocket.on("session_stopped", () => {
      handleExitNavigation();
    });

    newSocket.on("workout_update", (json) => {
      setData(json);
      handleWorkoutUpdate(json);
    });

    fetchExercises();

    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      newSocket.close();
      window.speechSynthesis.cancel();
    };
  }, [navigate]);

  const fetchExercises = async () => {
    setFetchError(false);
    try {
      const response = await fetch(`${API_URL}/api/exercises`);
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      } else {
        console.error("Failed to fetch exercises:", response.status);
        setFetchError(true);
      }
    } catch (error) {
      console.error("Network error fetching exercises:", error);
      setFetchError(true);
    }
  };

  const handleExitNavigation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    navigate("/report");
  };

  // --- 2. LOGIC HANDLER (RE-DESIGNED FOR USER CENTERED FEEDBACK) ---
  const handleWorkoutUpdate = (json) => {
    // 1. SILENCED CALIBRATION: Only speak when the message actually changes
    if (json.status === "CALIBRATION") {
      const calMsg = json.calibration?.message || "Calibrating...";
      setFeedback(calMsg);
      setCalibrationProgress(json.calibration?.progress || 0);
      setCountdownValue(null);

      if (calMsg && calMsg !== lastSpokenRef.current) {
        triggerSpeech(calMsg);
      }
    }
    // 2. COUNTDOWN
    else if (json.status === "COUNTDOWN") {
      setFeedback("Get Ready!");
      setCountdownValue(json.remaining);
      setCalibrationProgress(100);

      if (json.remaining <= 3 && json.remaining > 0) {
        triggerSpeech(json.remaining.toString());
      } else if (json.remaining === 0) {
        triggerSpeech("Start");
      }
    }
    // 3. ACTIVE: Stable non-repetitive coaching
    else if (json.status === "ACTIVE") {
      setCountdownValue(null);

      let msg = json.ghost_pose?.instruction || "MAINTAIN FORM";
      let alertMsg = "";

      // Overwrite primary message with error feedback if present
      if (json.RIGHT && json.RIGHT.feedback) {
        msg = json.RIGHT.feedback;
        alertMsg = json.RIGHT.feedback;
      } else if (json.LEFT && json.LEFT.feedback) {
        msg = json.LEFT.feedback;
        alertMsg = json.LEFT.feedback;
      }

      setFeedback(msg);

      // Only trigger speech if it's a NEW coaching instruction
      if (alertMsg && alertMsg !== lastSpokenRef.current) {
        triggerSpeech(alertMsg);
      }

      const fbBox = document.getElementById("feedback-box");
      const color = json.RIGHT?.feedback_color;
      if (fbBox && color) {
        fbBox.className = `active-feedback-box ${color.toLowerCase()}`;
      }
    }
  };

  const triggerSpeech = (text) => {
    if (!soundEnabled || !text) return;
    if (text !== lastSpokenRef.current) {
      speak(text);
      lastSpokenRef.current = text;
    }
  };

  // --- SESSION CONTROL ---
  const startSession = async () => {
    if (!selectedExercise) {
      alert("Please select an exercise first.");
      return;
    }

    setIsLoading(true);
    setConnectionStatus("CONNECTING");

    try {
      const res = await fetch(`${API_URL}/start_tracking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ exercise: selectedExercise.title }),
      });

      if (!res.ok) throw new Error("Server error");

      const json = await res.json();
      if (json.status === "started") {
        setVideoTimestamp(Date.now());
        setActive(true);
        setSessionTime(0);
        triggerSpeech("Initializing. Please align with the skeleton.");

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(
          () => setSessionTime((t) => t + 1),
          1000
        );
      } else {
        throw new Error("Failed to start session");
      }
    } catch (e) {
      alert(
        "Could not connect to AI Server. Please ensure 'app.py' is running."
      );
      console.error(e);
      setConnectionStatus("DISCONNECTED");
      setViewMode("LIBRARY");
    } finally {
      setIsLoading(false);
    }
  };

  const stopSession = () => {
    setActive(false);

    if (socket && socket.connected) {
      socket.emit("stop_session", {
        email: user?.email,
        exercise: selectedExercise?.title || "Freestyle",
      });
    } else {
      console.warn("Socket disconnected, forcing manual stop.");
    }

    stopTimeoutRef.current = setTimeout(() => {
      console.log("Forcing navigation (timeout)");
      handleExitNavigation();
    }, 1000);
  };

  const handleListeningChange = (isListening) => {
    if (socket) {
      socket.emit("toggle_listening", { active: isListening });
    }
  };

  const handleBotCommand = (action) => {
    console.log("Tracker Received Command:", action);
    if (action === "STOP") {
      stopSession();
    } else if (action === "RECALIBRATE") {
      startSession();
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // --- RENDER LIBRARY ---
  const renderLibrary = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "40px 5%",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "50px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2.5rem",
              color: "#1A3C34",
              fontWeight: "800",
              marginBottom: "10px",
            }}
          >
            Exercise Library
          </h1>
          <p style={{ color: "#4A635D", fontSize: "1.1rem" }}>
            Select a routine to start your guided recovery session.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            padding: "10px 20px",
            borderRadius: "30px",
            color: "#4A635D",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "600",
            transition: "all 0.2s",
          }}
        >
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "30px",
        }}
      >
        {fetchError ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "40px",
              color: "#D32F2F",
            }}
          >
            <AlertCircle size={48} style={{ margin: "0 auto 20px" }} />
            <h3>Cannot connect to AI Server</h3>
            <p>
              Please ensure the Python backend (app.py) is running on port 5001.
            </p>
            <button
              onClick={fetchExercises}
              style={{
                marginTop: "20px",
                padding: "10px 25px",
                background: "#D32F2F",
                color: "white",
                border: "none",
                borderRadius: "20px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <RefreshCw size={16} /> Retry Connection
            </button>
          </div>
        ) : exercises.length === 0 ? (
          <p
            style={{ gridColumn: "1 / -1", textAlign: "center", color: "#888" }}
          >
            Loading exercises...
          </p>
        ) : (
          exercises.map((ex) => (
            <motion.div
              key={ex.id}
              whileHover={{ y: -5, boxShadow: "0 15px 30px rgba(0,0,0,0.08)" }}
              onClick={() => {
                setSelectedExercise(ex);
                setViewMode("DEMO");
              }}
              style={{
                background: "#fff",
                borderRadius: "25px",
                padding: "30px",
                boxShadow: "0 5px 20px rgba(0,0,0,0.04)",
                cursor: "pointer",
                border: ex.recommended
                  ? "2px solid #69B341"
                  : "1px solid transparent",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {ex.recommended && (
                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    background: "#E8F5E9",
                    color: "#2C5D31",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <CheckCircle size={14} /> RECOMMENDED
                </div>
              )}

              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "18px",
                  background: ex.color,
                  marginBottom: "25px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Dumbbell color={ex.iconColor} size={28} />
              </div>

              <h3
                style={{
                  fontSize: "1.5rem",
                  color: "#1A3C34",
                  marginBottom: "8px",
                  fontWeight: "700",
                }}
              >
                {ex.title}
              </h3>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#888",
                  fontWeight: "600",
                  marginBottom: "20px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {ex.category}
              </div>

              <p
                style={{
                  color: "#555",
                  fontSize: "0.95rem",
                  marginBottom: "25px",
                  lineHeight: "1.6",
                }}
              >
                {ex.description}
              </p>

              <div
                style={{
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: "20px",
                  display: "flex",
                  gap: "20px",
                  fontSize: "0.9rem",
                  color: "#666",
                  fontWeight: "500",
                }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Timer size={16} /> {ex.duration}
                </span>
                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Activity size={16} /> {ex.difficulty}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );

  // --- RENDER DEMO ---
  const renderDemo = () => {
    if (!selectedExercise) return null;

    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        style={{ height: "100vh", display: "flex", background: "#F9F7F3" }}
      >
        <div
          style={{
            flex: "0 0 450px",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            background: "#fff",
            borderRight: "1px solid rgba(0,0,0,0.05)",
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setViewMode("LIBRARY")}
            style={{
              background: "transparent",
              border: "none",
              color: "#666",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "30px",
              fontWeight: "600",
              alignSelf: "flex-start",
            }}
          >
            <ArrowLeft size={18} /> Back to Library
          </button>

          <h1
            style={{
              fontSize: "2.5rem",
              color: "#1A3C34",
              fontWeight: "800",
              marginBottom: "10px",
            }}
          >
            {selectedExercise.title}
          </h1>
          <div
            style={{
              display: "inline-block",
              padding: "5px 12px",
              background: "#f0f0f0",
              borderRadius: "8px",
              fontSize: "0.85rem",
              color: "#666",
              fontWeight: "600",
              width: "fit-content",
              marginBottom: "30px",
            }}
          >
            {selectedExercise.category}
          </div>

          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#1A3C34",
                marginBottom: "15px",
                fontSize: "1.1rem",
              }}
            >
              <Info size={20} color="#69B341" /> Instructions
            </h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {selectedExercise.instructions.map((step, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: "15px",
                    marginBottom: "15px",
                    color: "#555",
                    lineHeight: "1.5",
                    fontSize: "0.95rem",
                  }}
                >
                  <span style={{ color: "#69B341", fontWeight: "bold" }}>
                    {i + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: "auto" }}>
            <button
              onClick={() => {
                if (!user) {
                  alert("Please login to start.");
                  navigate("/auth/login");
                  return;
                }
                setViewMode("SESSION");
                startSession();
              }}
              style={{
                width: "100%",
                padding: "18px",
                borderRadius: "50px",
                border: "none",
                background: "linear-gradient(135deg, #1A3C34 0%, #2C5D31 100%)",
                color: "#fff",
                fontSize: "1.1rem",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 10px 25px rgba(44, 93, 49, 0.3)",
                transition: "transform 0.1s",
              }}
              disabled={isLoading}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.98)")
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {isLoading ? (
                "Connecting..."
              ) : (
                <>
                  <Play size={20} fill="currentColor" /> Start Session
                </>
              )}
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            background: "#000",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <video
            src={selectedExercise.video || "/bicep_demo.mp4"}
            controls
            autoPlay
            loop
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      </motion.div>
    );
  };

  // --- RENDER SESSION ---
  const renderSession = () => {
    const jointName = data?.tracked_joint_name || "JOINT";
    const feedbackColor = data?.RIGHT.feedback_color || "GRAY";

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          height: "100vh",
          display: "flex",
          overflow: "hidden",
          background: "var(--bg-color)",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: "340px",
            background: "#fff",
            borderRight: "1px solid #eee",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: "30px",
              borderBottom: "1px solid #eee",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                color: "#888",
                fontWeight: "700",
                letterSpacing: "1px",
                marginBottom: "8px",
                textTransform: "uppercase",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{selectedExercise?.title}</span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: soundEnabled ? "#2C5D31" : "#ccc",
                  }}
                  title={soundEnabled ? "Mute Voice" : "Enable Voice"}
                >
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                {connectionStatus === "CONNECTED" ? (
                  <Wifi size={16} color="#69B341" title="Connected" />
                ) : (
                  <WifiOff size={16} color="#D32F2F" title="Disconnected" />
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                color: "#2C5D31",
                fontSize: "2.5rem",
                fontWeight: "800",
              }}
            >
              <Timer size={32} />
              {formatTime(sessionTime)}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "25px" }}>
            {["RIGHT", "LEFT"].map((arm) => {
              const metrics = data ? data[arm] : null;
              const cardColor =
                metrics?.feedback_color === "RED"
                  ? "#FFEBEE"
                  : metrics?.feedback_color === "GREEN"
                  ? "#E8F5E9"
                  : "#f8f9fa";

              return (
                <div
                  key={arm}
                  style={{
                    marginBottom: "25px",
                    background: cardColor,
                    borderRadius: "18px",
                    padding: "20px",
                    border:
                      metrics?.feedback_color === "RED"
                        ? "1px solid #D32F2F"
                        : metrics?.feedback_color === "GREEN"
                        ? "1px solid #69B341"
                        : "1px solid #eee",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      margin: "0 0 15px 0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(0,0,0,0.05)",
                      paddingBottom: "10px",
                    }}
                  >
                    <h3
                      style={{
                        color: "#444",
                        fontSize: "0.85rem",
                        fontWeight: "800",
                        margin: 0,
                      }}
                    >
                      {arm} {jointName.toUpperCase()}
                    </h3>

                    {/* NEW: DYNAMIC ACCURACY BADGE */}
                    <div
                      style={{
                        background:
                          metrics?.accuracy > 85 ? "#2C5D31" : "#D32F2F",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "0.65rem",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Target size={12} /> {metrics?.accuracy || 100}%
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "15px",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#aaa",
                          fontWeight: "700",
                        }}
                      >
                        REPS
                      </div>
                      <div
                        style={{
                          fontSize: "2.2rem",
                          fontWeight: "800",
                          color: "#222",
                        }}
                      >
                        {metrics ? metrics.rep_count : "--"}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#aaa",
                          fontWeight: "700",
                        }}
                      >
                        ANGLE
                      </div>
                      <div
                        style={{
                          fontSize: "2.2rem",
                          fontWeight: "800",
                          fontFamily: "monospace",
                          color: "#222",
                        }}
                      >
                        {metrics ? Math.round(metrics.angle) : "--"}°
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      background: "rgba(0,0,0,0.05)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      animate={{
                        width: metrics
                          ? `${(metrics.angle / 180) * 100}%`
                          : "0%",
                      }}
                      style={{ height: "100%", background: "#2C5D31" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: "25px", borderTop: "1px solid #eee" }}>
            <button
              onClick={stopSession}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "50px",
                border: "none",
                fontWeight: "800",
                cursor: "pointer",
                fontSize: "1rem",
                background: "#D32F2F",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 8px 20px rgba(211, 47, 47, 0.3)",
              }}
            >
              <StopCircle size={20} /> END SESSION
            </button>
          </div>
        </div>

        {/* Camera Feed Area */}
        <div
          className="video-container"
          style={{
            flex: 1,
            position: "relative",
            background: "#222",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            {active ? (
              <>
                <img
                  src={`${API_URL}/video_feed?t=${videoTimestamp}`}
                  className="video-feed"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                  alt="Stream"
                  onError={() => {
                    setFeedback("Camera Stream Failed");
                    setActive(false);
                  }}
                />
                <GhostModelOverlay ghostPoseData={data.ghost_pose} />
              </>
            ) : (
              <div
                style={{
                  color: "white",
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "20px",
                }}
              >
                {isLoading ? (
                  <Loader className="spin-animation" size={48} />
                ) : (
                  <AlertCircle size={48} />
                )}
                <div style={{ fontSize: "1.2rem", opacity: 0.8 }}>
                  {isLoading ? "Starting Camera..." : "Initializing Camera..."}
                </div>
              </div>
            )}

            <AnimatePresence>
              {/* CALIBRATION / COUNTDOWN OVERLAYS (No technical jargon boxes) */}
              {data?.status === "CALIBRATION" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.3)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: "50px",
                    zIndex: 30,
                  }}
                >
                  <h2
                    style={{
                      color: "#fff",
                      fontSize: "2rem",
                      marginBottom: "20px",
                      textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                    }}
                  >
                    {feedback}
                  </h2>
                  <div
                    style={{
                      width: "60%",
                      height: "12px",
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      animate={{ width: `${calibrationProgress}%` }}
                      style={{ height: "100%", background: "#00E676" }}
                    />
                  </div>
                </motion.div>
              )}

              {data?.status === "COUNTDOWN" && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  key={countdownValue}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 30,
                  }}
                >
                  <div
                    style={{
                      fontSize: "10rem",
                      fontWeight: "900",
                      color: "#fff",
                      textShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    }}
                  >
                    {countdownValue}
                  </div>
                </motion.div>
              )}

              {data?.status === "ACTIVE" && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  id="feedback-box"
                  className={`active-feedback-box ${feedbackColor.toLowerCase()}`}
                  style={{
                    position: "absolute",
                    bottom: "50px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(255,255,255,0.95)",
                    padding: "15px 40px",
                    borderRadius: "50px",
                    fontSize: "1.5rem",
                    fontWeight: "800",
                    color: "#222",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    zIndex: 30,
                  }}
                >
                  {feedback.includes("Form") ? (
                    <AlertCircle size={28} />
                  ) : (
                    <CheckCircle size={28} />
                  )}
                  {feedback}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AICoach Integration */}
        <div
          style={{
            width: "300px",
            borderLeft: "1px solid #eee",
            background: "#F9F7F3",
          }}
        >
          <AICoach
            data={data}
            feedback={feedback}
            exerciseName={selectedExercise?.title}
            active={active}
            gesture={data.gesture}
            onCommand={handleBotCommand}
            onListeningChange={handleListeningChange}
            userEmail={user?.email}
          />
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ background: "#F9F7F3", minHeight: "100vh" }}>
      <AnimatePresence mode="wait">
        {viewMode === "LIBRARY" && renderLibrary()}
        {viewMode === "DEMO" && renderDemo()}
        {viewMode === "SESSION" && renderSession()}
      </AnimatePresence>
    </div>
  );
};

export default Tracker;
