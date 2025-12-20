import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Calendar,
  CheckCircle,
  Clock,
  Award,
  ChevronRight,
  BarChart2,
  List,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";
import "./MyPrograms.css";

// --- STATIC MOCK DATA ---
const PROGRAM_DATA = {
  active: {
    id: 1,
    title: "Post-Op ACL Recovery",
    phase: "Phase 2: Strengthening & Mobility",
    therapist: "Dr. Sarah Lin",
    progress: 42, // Percentage
    totalWeeks: 12,
    currentWeek: 5,
    nextSession: "Quad Focus & Balance",
    duration: "45 min",
    schedule: ["Mon", "Wed", "Fri"],
  },
  phases: [
    { id: 1, name: "Phase 1: Protection", status: "completed" },
    { id: 2, name: "Phase 2: Strengthening", status: "active" },
    { id: 3, name: "Phase 3: Agility", status: "locked" },
    { id: 4, name: "Phase 4: Return to Sport", status: "locked" },
  ],
  adherence: [
    { day: "Mon", completed: true, score: 92 },
    { day: "Tue", completed: false, score: 0 }, // Rest day
    { day: "Wed", completed: true, score: 88 },
    { day: "Thu", completed: false, score: 0 },
    { day: "Fri", completed: true, score: 95 },
    { day: "Sat", completed: false, score: 0 },
    { day: "Sun", completed: false, score: 0 },
  ],
  upcoming: [
    { id: 101, title: "Quadriceps Sets", sets: "3x10", type: "Strength" },
    { id: 102, title: "Heel Slides", sets: "3x15", type: "Mobility" },
    { id: 103, title: "Single Leg Stance", sets: "3x30s", type: "Balance" },
  ],
};

const MyPrograms = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // COLORS
  const COLORS = {
    primary: "#69B341",
    secondary: "#1A3C34",
    bg: "#F9F7F3",
    completed: "#10B981",
    missed: "#E5E7EB",
  };

  return (
    <div className="programs-container">
      <div className="programs-wrapper">
        {/* 1. HEADER */}
        <div className="programs-header">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="page-title">My Programs</h1>
            <p className="page-subtitle">Track your recovery roadmap.</p>
          </motion.div>

          <button
            className="create-btn"
            onClick={() => navigate("/programs/custom")}
          >
            + Custom Routine
          </button>
        </div>

        {/* 2. ACTIVE PROGRAM HERO CARD */}
        <motion.div
          className="card hero-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="hero-content">
            <div className="program-badge">Active Plan</div>
            <h2 className="hero-title">{PROGRAM_DATA.active.title}</h2>
            <p className="hero-therapist">
              Assigned by {PROGRAM_DATA.active.therapist}
            </p>

            <div className="progress-section">
              <div className="progress-labels">
                <span>{PROGRAM_DATA.active.phase}</span>
                <span>{PROGRAM_DATA.active.progress}% Complete</span>
              </div>
              <div className="progress-bar-bg">
                <motion.div
                  className="progress-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${PROGRAM_DATA.active.progress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <Calendar size={18} />
                <span>
                  Week {PROGRAM_DATA.active.currentWeek} of{" "}
                  {PROGRAM_DATA.active.totalWeeks}
                </span>
              </div>
              <div className="hero-stat">
                <Clock size={18} />
                <span>~{PROGRAM_DATA.active.duration} / session</span>
              </div>
            </div>
          </div>

          <div className="hero-action">
            <div className="next-session-box">
              <span className="next-label">Up Next Today</span>
              <h3 className="next-title">{PROGRAM_DATA.active.nextSession}</h3>
              <button className="start-btn" onClick={() => navigate("/track")}>
                <Play size={20} fill="white" /> Start Session
              </button>
            </div>
          </div>
        </motion.div>

        {/* 3. MAIN CONTENT GRID */}
        <div className="programs-grid">
          {/* LEFT: Timeline & Adherence */}
          <div className="grid-left">
            {/* Phase Timeline */}
            <motion.div
              className="card timeline-card"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="card-header">
                <h3>
                  <List size={20} /> Recovery Phases
                </h3>
              </div>
              <div className="phase-list">
                {PROGRAM_DATA.phases.map((phase, idx) => (
                  <div key={idx} className={`phase-item ${phase.status}`}>
                    <div className="phase-marker">
                      {phase.status === "completed" && (
                        <CheckCircle size={16} />
                      )}
                      {phase.status === "active" && (
                        <div className="dot active" />
                      )}
                      {phase.status === "locked" && (
                        <div className="dot locked" />
                      )}
                    </div>
                    <div className="phase-info">
                      <span className="phase-name">{phase.name}</span>
                      <span className="phase-status">{phase.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Adherence Chart */}
            <motion.div
              className="card chart-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="card-header">
                <h3>
                  <BarChart2 size={20} /> Weekly Adherence
                </h3>
                <span className="badge-good">High Consistency</span>
              </div>
              <div style={{ height: "200px", width: "100%" }}>
                <ResponsiveContainer>
                  <BarChart data={PROGRAM_DATA.adherence}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E5E7EB"
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                      dy={10}
                    />
                    <Tooltip
                      cursor={{ fill: "#F3F4F6" }}
                      contentStyle={{
                        borderRadius: "10px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={30}>
                      {PROGRAM_DATA.adherence.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.score > 0 ? COLORS.primary : "#E5E7EB"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Session Details */}
          <div className="grid-right">
            <motion.div
              className="card session-list-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="card-header">
                <h3>Session Breakdown</h3>
                <Info size={18} color="#9CA3AF" />
              </div>

              <div className="exercises-list">
                {PROGRAM_DATA.upcoming.map((ex) => (
                  <div key={ex.id} className="exercise-item">
                    <div className="ex-icon">
                      {ex.type === "Strength"
                        ? "💪"
                        : ex.type === "Mobility"
                        ? "🧘"
                        : "⚖️"}
                    </div>
                    <div className="ex-details">
                      <h4>{ex.title}</h4>
                      <span className="ex-meta">
                        {ex.sets} • {ex.type}
                      </span>
                    </div>
                    <ChevronRight size={16} color="#D1D5DB" />
                  </div>
                ))}
              </div>

              <div className="streak-box">
                <Award size={24} color="#F59E0B" />
                <div>
                  <span className="streak-val">5 Day Streak!</span>
                  <span className="streak-desc">
                    You haven't missed a session this week.
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPrograms;
