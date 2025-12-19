import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchAICommentary } from "../services/aiService";
import { Mic, Eye, EyeOff, Volume2, VolumeX, Ghost, Zap } from "lucide-react";

// --- 3D IMPORTS ---
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  ContactShadows,
  Sphere,
  MeshDistortMaterial,
} from "@react-three/drei";
import * as THREE from "three";

const Avatar3D = ({ state }) => {
  const mesh = useRef();
  const light = useRef();

  useFrame((state, delta) => {
    if (!mesh.current) return;

    if (state === "THINKING") {
      mesh.current.distort = THREE.MathUtils.lerp(
        mesh.current.distort,
        0.85,
        0.1
      );
      mesh.current.speed = THREE.MathUtils.lerp(mesh.current.speed, 5, 0.1);
    } else {
      mesh.current.distort = THREE.MathUtils.lerp(
        mesh.current.distort,
        0.5,
        0.1
      );
      mesh.current.speed = THREE.MathUtils.lerp(mesh.current.speed, 3, 0.1);
    }
  });

  const colors = {
    IDLE: "#69B341",
    LISTENING: "#2196F3",
    SPEAKING: "#00E676",
    THINKING: "#FF9800",
    ERROR: "#D32F2F",
  };

  const activeColor = new THREE.Color(colors[state] || colors.IDLE);

  return (
    <group>
      <Float speed={2.5} rotationIntensity={1.5} floatIntensity={1.5}>
        <Sphere args={[1.2, 64, 64]} ref={mesh}>
          <MeshDistortMaterial
            color={activeColor}
            envMapIntensity={1.0}
            clearcoat={1}
            clearcoatRoughness={0.2}
            metalness={0.2}
            roughness={0.3}
            distort={0.5}
            speed={3}
          />
        </Sphere>
        <pointLight
          ref={light}
          position={[0, 0, 0]}
          intensity={2.5}
          distance={6}
          color={activeColor}
        />
      </Float>
      <ContactShadows
        opacity={0.4}
        scale={12}
        blur={3.5}
        far={10}
        resolution={256}
        color="#1A3C34"
      />
    </group>
  );
};

const AICoach = ({
  data,
  feedback,
  exerciseName,
  active,
  gesture,
  onCommand,
  onListeningChange,
  userEmail,
}) => {
  const [message, setMessage] = useState("Standing by...");
  const [botState, setBotState] = useState("IDLE");
  const [micError, setMicError] = useState(false);

  // --- CONTROLS ---
  const [showVisuals, setShowVisuals] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [ghostEnabled, setGhostEnabled] = useState(false);

  const recognitionRef = useRef(null);
  const isListeningForWakeWord = useRef(true);
  const isBotSpeaking = useRef(false);
  const lastGestureRef = useRef(null);
  const listenTimeoutRef = useRef(null);
  const lastFeedbackRef = useRef("");

  // --- SIMPLIFIED WAKE WORDS ---
  const WAKE_WORDS = ["hey coach", "coach", "physio"];
  const STOP_WORDS = ["stop", "quit", "end", "finish", "done"];

  // --- Toggle Ghost Overlay Function ---
  const toggleGhostOverlay = async () => {
    try {
      await fetch("http://localhost:5000/toggle_ghost", { method: "POST" });
      setGhostEnabled(!ghostEnabled);
    } catch (error) {
      console.error("Failed to toggle ghost overlay:", error);
    }
  };

  // --- 1. SEAMLESS TTS LOGIC ---
  const speak = (text, onEndCallback = null) => {
    if (!window.speechSynthesis) return;

    if (isMuted) {
      if (onEndCallback) onEndCallback();
      return;
    }

    isBotSpeaking.current = true;
    window.speechSynthesis.cancel();
    setBotState("SPEAKING");

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      isBotSpeaking.current = false;
      setBotState((prevState) => {
        if (prevState === "SPEAKING") return "IDLE";
        return prevState;
      });
      if (onEndCallback) onEndCallback();
      else if (!listenTimeoutRef.current) isListeningForWakeWord.current = true;
    };

    utterance.onerror = () => {
      isBotSpeaking.current = false;
      setBotState("IDLE");
    };

    window.speechSynthesis.speak(utterance);
  };

  // --- 2. ACTIVATION MODES ---
  const activateListeningMode = () => {
    console.log("🎤 Listening Mode ACTIVATED");
    if (isBotSpeaking.current) {
      window.speechSynthesis.cancel();
      isBotSpeaking.current = false;
    }

    isListeningForWakeWord.current = false;
    if (onListeningChange) onListeningChange(true);

    setBotState("LISTENING");
    setMessage("Listening...");

    speak("Yes?", () => {
      setBotState("LISTENING");
      startSilenceTimer();
    });
  };

  const deactivateListeningMode = () => {
    console.log("🚫 Listening Mode OFF");
    if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    listenTimeoutRef.current = null;

    isListeningForWakeWord.current = true;
    setBotState("IDLE");
    if (onListeningChange) onListeningChange(false);
  };

  const startSilenceTimer = () => {
    if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    listenTimeoutRef.current = setTimeout(() => {
      speak("Resuming exercise.", () => deactivateListeningMode());
    }, 7000);
  };

  // --- 3. SPEECH RECOGNITION ---
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError(true);
      setMessage("No Voice Support");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setMicError(false);
    recognition.onerror = (e) => {
      if (e.error === "not-allowed") {
        setMicError(true);
        setBotState("ERROR");
        setMessage("Mic Access Denied");
      }
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .trim()
        .toLowerCase();
      console.log("🎤 Heard:", transcript);

      const isPriority = isStopCommand(transcript);

      if (isPriority) {
        if (isBotSpeaking.current) {
          window.speechSynthesis.cancel();
          isBotSpeaking.current = false;
        }
      } else {
        if (isBotSpeaking.current) return;
      }

      if (!isListeningForWakeWord.current) {
        if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
      }

      if (isStopCommand(transcript)) {
        await executeCommand("stop", "Stopping session.");
        return;
      }

      if (isListeningForWakeWord.current) {
        // Check for any wake word
        if (WAKE_WORDS.some((word) => transcript.includes(word))) {
          activateListeningMode();
        }
      } else {
        await processSmartQuery(transcript);
      }
    };

    recognition.onend = () => {
      if (active && !micError) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    if (active) {
      try {
        recognition.start();
      } catch (e) {}
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    };
  }, [active]);

  // --- 4. GESTURE TRIGGER ---
  useEffect(() => {
    if (gesture === "V_SIGN" && lastGestureRef.current !== "V_SIGN") {
      activateListeningMode();
    }
    lastGestureRef.current = gesture;
  }, [gesture]);

  const isStopCommand = (text) =>
    STOP_WORDS.some((word) => text.includes(word));

  const executeCommand = async (cmd, reply) => {
    if (onCommand) onCommand(cmd.toUpperCase());
    speak(reply, () => deactivateListeningMode());
  };

  const processSmartQuery = async (text) => {
    setBotState("THINKING");

    try {
      // Get BOTH arms data
      const rightReps = data?.RIGHT?.rep_count || 0;
      const leftReps = data?.LEFT?.rep_count || 0;
      const totalReps = rightReps + leftReps;

      const context = {
        email: userEmail,
        exercise: exerciseName,
        reps: totalReps,
        right_reps: rightReps,
        left_reps: leftReps,
        feedback: feedback,
      };

      const aiResponse = await fetchAICommentary(context, text);

      if (aiResponse.includes("ACTION: RECALIBRATE")) {
        executeCommand("recalibrate", "Recalibrating.");
      } else if (aiResponse.includes("ACTION: STOP")) {
        executeCommand("stop", "Stopping.");
      } else {
        speak(aiResponse, () => deactivateListeningMode());
      }
    } catch (error) {
      speak("Connection error.", () => deactivateListeningMode());
    }
  };

  // --- AUTO-FEEDBACK (BALANCED FOR BOTH ARMS) ---
  useEffect(() => {
    if (
      !active ||
      botState !== "IDLE" ||
      !isListeningForWakeWord.current ||
      isBotSpeaking.current
    )
      return;

    // Prioritize feedback from EITHER arm
    const rightFeedback = data?.RIGHT?.feedback;
    const leftFeedback = data?.LEFT?.feedback;

    // Check which arm has actionable feedback
    let currentFeedback = null;
    if (
      rightFeedback &&
      !rightFeedback.includes("MAINTAIN") &&
      !rightFeedback.includes("Initializing")
    ) {
      currentFeedback = `Right: ${rightFeedback}`;
    } else if (
      leftFeedback &&
      !leftFeedback.includes("MAINTAIN") &&
      !leftFeedback.includes("Initializing")
    ) {
      currentFeedback = `Left: ${leftFeedback}`;
    }

    if (currentFeedback && currentFeedback !== lastFeedbackRef.current) {
      lastFeedbackRef.current = currentFeedback;
      setMessage(currentFeedback);
      speak(currentFeedback);
    }
  }, [data, feedback, active, botState]);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: "linear-gradient(180deg, #F0F8FF 0%, #E6F4EA 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderTop: "2px solid #eee",
      }}
    >
      {/* --- CONTROL BUTTONS (Top Right) --- */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          display: "flex",
          gap: "8px",
          zIndex: 20,
        }}
      >
        {/* 1. Ghost Toggle */}
        <button
          onClick={toggleGhostOverlay}
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "none",
            borderRadius: "50%",
            padding: "10px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "all 0.2s",
          }}
          title={ghostEnabled ? "Switch to CV Dots" : "Show Ghost Skeleton"}
        >
          <Ghost size={18} color={ghostEnabled ? "#2196F3" : "#888"} />
        </button>

        {/* 2. Visual Toggle (Iron Man) */}
        <button
          onClick={() => setShowVisuals(!showVisuals)}
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "none",
            borderRadius: "50%",
            padding: "10px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "all 0.2s",
          }}
          title={showVisuals ? "Switch to Simple Mode" : "Show 3D Avatar"}
        >
          {showVisuals ? (
            <Eye size={18} color="#555" />
          ) : (
            <EyeOff size={18} color="#888" />
          )}
        </button>

        {/* 3. Mute Toggle */}
        <button
          onClick={() => {
            const newState = !isMuted;
            setIsMuted(newState);
            if (newState) window.speechSynthesis.cancel();
          }}
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "none",
            borderRadius: "50%",
            padding: "10px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "all 0.2s",
          }}
          title={isMuted ? "Unmute Voice" : "Mute Voice"}
        >
          {isMuted ? (
            <VolumeX size={18} color="#D32F2F" />
          ) : (
            <Volume2 size={18} color="#555" />
          )}
        </button>
      </div>

      {/* --- AVATAR DISPLAY --- */}
      <div
        style={{
          width: "250px",
          height: "250px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showVisuals ? (
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [0, 0, 4.5], fov: 50 }}
          >
            <ambientLight intensity={0.7} />
            <spotLight
              position={[10, 10, 10]}
              angle={0.15}
              penumbra={1}
              intensity={1.5}
              castShadow
            />
            <Environment preset="city" />
            <Avatar3D state={micError ? "ERROR" : botState} />
          </Canvas>
        ) : (
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: micError
                ? "#D32F2F"
                : botState === "LISTENING"
                ? "#2196F3"
                : botState === "SPEAKING"
                ? "#00E676"
                : "#69B341",
              boxShadow: "0 0 20px rgba(0,0,0,0.2)",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={28} color="white" />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            background: "#fff",
            padding: "14px 22px",
            borderRadius: "24px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            marginTop: "10px",
            maxWidth: "90%",
            border: "1px solid #e1e1e1",
            zIndex: 10,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#1A3C34",
              fontWeight: "600",
              fontSize: "0.95rem",
              textAlign: "center",
            }}
          >
            {message}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Voice Commands Help */}
      <div
        style={{
          position: "absolute",
          bottom: "50px",
          background: "rgba(255,255,255,0.95)",
          padding: "12px 18px",
          borderRadius: "16px",
          fontSize: "0.75rem",
          color: "#555",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          maxWidth: "85%",
          textAlign: "center",
        }}
      >
        <div
          style={{ fontWeight: "700", marginBottom: "6px", color: "#2C5D31" }}
        >
          💬 Voice Commands
        </div>
        <div style={{ lineHeight: "1.6" }}>
          Say <strong>"Hey Coach"</strong> or make ✌️ to activate
          <br />
          Ask: "How am I doing?" • "Stop"
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          fontSize: "0.7rem",
          color: micError ? "#D32F2F" : "#aaa",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(255,255,255,0.9)",
          padding: "6px 12px",
          borderRadius: "12px",
        }}
      >
        <Mic size={12} color={botState === "LISTENING" ? "#2196F3" : "#aaa"} />
        {micError
          ? "MIC DISABLED"
          : botState === "LISTENING"
          ? "LISTENING"
          : "AI READY"}
      </div>

      {gesture === "V_SIGN" && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "#E3F2FD",
            color: "#2196F3",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(33, 150, 243, 0.3)",
          }}
        >
          ✌️ V-Sign Detected
        </div>
      )}
    </div>
  );
};

export default AICoach;
