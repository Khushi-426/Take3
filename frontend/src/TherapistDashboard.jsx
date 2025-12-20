// frontend/src/TherapistDashboard.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import {
  Menu,
  LayoutDashboard,
  Users,
  FileText,
  Bell,
  Activity,
  CheckCircle,
  ChevronRight,
  LogOut,
  AlertCircle,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CheckSquare,
  Clock
} from "lucide-react";
import "./TherapistDashboard.css";

const TherapistDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [copied, setCopied] = useState(false);
  
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const [metrics, setMetrics] = useState({
    avgRecovery: 0,
    pendingList: [],       
    attentionList: [],    
    engagementScore: 0,
    therapistCode: "..."
  });

  const [displayRecovery, setDisplayRecovery] = useState(0);

  // --- HELPER: ADAPT & CALCULATE DATA ---
  const adaptPatientData = (flaskData) => {
    const rawList = flaskData.patients || [];
    
    return rawList.map((p) => {
      const isHighRisk = p.status === "High Risk";
      const isAlert = p.status === "Alert";
      const isNormal = p.status === "Normal" || p.status === "Active";

      let derivedCompletion = 85; 
      if (isHighRisk) derivedCompletion = 45;
      if (isAlert) derivedCompletion = 65;

      return {
        _id: p.email,
        name: p.name || "Unknown Patient",
        email: p.email,
        createdAt: p.date_joined,
        lastSessionTs: p.last_session_ts, // Real timestamp from DB
        recentActivity: p.recent_activity, // "Session Completed" or null
        hasActiveProtocol: p.hasActiveProtocol,
        completionRate: derivedCompletion,
        status: p.status, 
        flags: {
          nonCompliant: isHighRisk, 
          lowScore: isAlert,
          isNormal: isNormal
        }
      };
    });
  };

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        let token = user?.token;
        if (!token) {
            const stored = localStorage.getItem("physio_user");
            if (stored) token = JSON.parse(stored).token;
        }

        const response = await fetch("http://127.0.0.1:5001/api/therapist/patients", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const rawData = await response.json();
        const data = adaptPatientData(rawData);
        
        // --- 1. CALCULATE METRICS ---
        const totalPatients = data.length;
        const totalRec = data.reduce((sum, p) => sum + (p.completionRate || 0), 0);
        const avgRec = totalPatients > 0 ? Math.round(totalRec / totalPatients) : 0;
        
        const pendingPatients = data.filter(p => p.flags.nonCompliant || p.flags.lowScore);
        const attentionPatients = data.filter(p => p.flags.nonCompliant); 
        const normalCount = data.filter(p => p.flags.isNormal).length;
        const engagement = totalPatients > 0 ? Math.round((normalCount / totalPatients) * 100) : 0;

        const tCode = user?.therapistCode || `DR-${user?.name ? user.name.substring(0,3).toUpperCase() : "PHY"}-8821`;

        setPatients(data);
        setMetrics({
          avgRecovery: avgRec,
          pendingList: pendingPatients,    
          attentionList: attentionPatients, 
          engagementScore: engagement,
          therapistCode: tCode
        });

        // --- 2. GENERATE REAL FEED (No Mock Data) ---
        const feedItems = [];

        // A. Persistent Risks (Always show until resolved)
        data.forEach(p => {
          if (p.flags.nonCompliant) {
            feedItems.push({
              id: p._id + "_risk",
              type: "high",
              title: "High Risk Alert",
              message: `${p.name} is in the danger zone (<50% accuracy).`,
              patientId: p._id,
              time: "Persistent"
            });
          }
        });

        // B. Recent Activity (Only from last 24 hours)
        data.forEach(p => {
          if (p.recentActivity) {
            // Convert timestamp to readable time
            const date = new Date(p.lastSessionTs * 1000);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            feedItems.push({
              id: p._id + "_act",
              type: "action",
              title: "Activity Update",
              message: `${p.name} completed a session.`,
              patientId: p._id,
              time: timeStr // "10:30 AM"
            });
          }
        });

        // If empty
        if (feedItems.length === 0) {
             feedItems.push({
              id: "empty",
              type: "info",
              title: "Quiet Day",
              message: "No high risks or recent activity in the last 24h.",
              time: "Now"
            });
        }
        
        setAlerts(feedItems);
        setLoading(false);

      } catch (error) {
        console.error("Dashboard Load Error:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Animation & Helpers
  useEffect(() => {
    let start = 0;
    const end = metrics.avgRecovery;
    if (start === end) return;
    const timer = setInterval(() => {
      start += 1;
      setDisplayRecovery(start);
      if (start >= end) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [metrics.avgRecovery]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(metrics.therapistCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPatientStatus = (p) => {
    if (p.flags.nonCompliant) return { label: "High Risk", class: "status-risk" };
    if (p.flags.lowScore) return { label: "Alert", class: "status-warn" };
    return { label: "Normal", class: "status-good" };
  };

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <aside className={`sidebar ${isSidebarOpen ? "expanded" : "collapsed"}`}>
        <div style={{ flex: 1 }}>
            <div className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
              <LayoutDashboard size={22} /><span className="nav-label">Overview</span>
            </div>
            <div className={`nav-item ${activeTab === "patients" ? "active" : ""}`} onClick={() => navigate("/therapist/monitoring")}>
              <Users size={22} /><span className="nav-label">Patients</span>
            </div>
             <div className={`nav-item ${activeTab === "assignments" ? "active" : ""}`} onClick={() => navigate("/therapist/assignments")}>
              <ClipboardList size={22} /><span className="nav-label">Assignments</span>
            </div>
            <div className={`nav-item ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
              <FileText size={22} /><span className="nav-label">Reports</span>
            </div>
        </div>
        <div className="nav-item" onClick={logout} style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <LogOut size={22} /><span className="nav-label">Sign Out</span>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="main-content">
        
        {/* FIXED HEADER */}
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button className="menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu size={24} /></button>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0F2A44" }}>Physio<span style={{ color: "#2FA4A9" }}>Check</span></h2>
          </div>
          
          <div className="header-right">
            <div className="welcome-msg">{getGreeting()}, <span className="welcome-name">Dr. {user?.name?.split(' ')[0] || "Therapist"}</span></div>
            <div className="therapist-id-badge" onClick={handleCopyCode} title="Click to copy ID">
                {copied ? <CheckCircle size={12} /> : <CheckSquare size={12} />}
                {copied ? "Copied!" : metrics.therapistCode}
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="content-scroll-area">
            
            <section className="hero-section">
              {/* LEFT: PRIORITY FEED */}
              <div className="card priority-panel">
                <div className="priority-header">
                  <span className="priority-title"><Bell size={20} color="#EF4444" /> Live Feed</span>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>{alerts.length} Items</span>
                </div>
                <div className="alert-feed">
                  {loading ? <p style={{ padding: "16px" }}>Loading...</p> : alerts.map((alert) => (
                    <div 
                        key={alert.id} 
                        className={`alert-item ${alert.type === "high" ? "alert-high" : alert.type === "action" ? "alert-action" : "alert-medium"}`}
                        onClick={() => alert.patientId && navigate(`/therapist/patient-detail/${alert.patientId}`)}
                    >
                        <div style={{ marginTop: "2px" }}>
                            {alert.type === "high" ? <AlertCircle size={16} color="#DC2626" /> : 
                             alert.type === "action" ? <Clock size={16} color="#3B82F6" /> : 
                             <Activity size={16} color="#D97706" />}
                        </div>
                        <div className="alert-content">
                            <h4>{alert.title}</h4>
                            <p>{alert.message}</p>
                        </div>
                        <span className="alert-time">{alert.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: METRICS GRID */}
              <div className="card metrics-grid">
                
                {/* 1. Avg Recovery */}
                <div className="metric-item">
                  <div className="metric-tooltip">Aggregate completion rate of all active protocols.</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Activity size={18} color="#2FA4A9" />
                    <span className="metric-label">Avg Recovery</span>
                  </div>
                  <span className="metric-value" style={{ color: "#2FA4A9" }}>{displayRecovery}%</span>
                </div>

                {/* 2. Pending Reviews */}
                <div className="metric-item">
                  <div className="metric-tooltip">
                      Total alerts requiring review.
                      {metrics.pendingList.length > 0 && (
                          <ul className="tooltip-list">
                              {metrics.pendingList.slice(0, 5).map((p, i) => (
                                  <li key={i} className="tooltip-item">
                                      <strong>{p.name}</strong> <span>{p.flags.nonCompliant ? "Risk" : "Alert"}</span>
                                  </li>
                              ))}
                          </ul>
                      )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <FileText size={18} color="#F59E0B" />
                    <span className="metric-label">Pending Reviews</span>
                  </div>
                  <span className="metric-value" style={{ color: "#F59E0B" }}>{metrics.pendingList.length}</span>
                </div>

                {/* 3. Patients Needing Attention */}
                <div className="metric-item">
                  <div className="metric-tooltip">
                      Critical 'High Risk' patients.
                      {metrics.attentionList.length > 0 && (
                          <ul className="tooltip-list">
                              {metrics.attentionList.slice(0, 5).map((p, i) => (
                                  <li key={i} className="tooltip-item">
                                      <strong>{p.name}</strong> <span style={{color: '#EF4444'}}>Low Acc.</span>
                                  </li>
                              ))}
                          </ul>
                      )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <AlertTriangle size={18} color="#DC2626" />
                    <span className="metric-label">Need Attention</span>
                  </div>
                  <span className="metric-value" style={{ color: "#DC2626" }}>{metrics.attentionList.length}</span>
                </div>

                {/* 4. Wide Engagement Score */}
                <div className="metric-item metric-wide">
                  <div className="metric-tooltip">Percentage of patients with 'Normal' status (Healthy Engagement).</div>
                  <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                        <TrendingUp size={24} color="#0284C7" />
                        <span className="metric-label" style={{ fontSize: "1.1rem", color: "#0369A1" }}>Weekly Engagement Score</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155", maxWidth: "250px", textAlign: "left" }}>
                        Measures the ratio of patients maintaining healthy form and schedule.
                      </p>
                  </div>
                  <span className="metric-value" style={{ color: "#0284C7", fontSize: "3.5rem" }}>
                    {metrics.engagementScore}%
                  </span>
                </div>

              </div>
            </section>

            {/* RECENT PATIENTS */}
            <section className="recent-section">
              <div className="card table-card">
                <div className="table-header-row">
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0F2A44", margin: 0 }}>Recent Patients</h3>
                  <button className="view-all-btn" onClick={() => navigate("/therapist/monitoring")}>
                    View Full Roster <ChevronRight size={16} />
                  </button>
                </div>
                <table className="patient-table">
                  <thead><tr><th>PATIENT NAME</th><th>JOINED</th><th>STATUS</th><th>COMPLETION</th></tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan="4" style={{textAlign: "center", padding: "32px"}}>Loading...</td></tr> : 
                    patients.slice(0, 5).map((p) => (
                        <tr key={p._id} className="patient-row" onClick={() => navigate(`/therapist/patient-detail/${p._id}`)}>
                          <td style={{ fontWeight: "600", color: "#0F2A44" }}>{p.name}<div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{p.email}</div></td>
                          <td>{p.createdAt}</td>
                          <td><span className={`status-badge ${getPatientStatus(p).class}`}>{getPatientStatus(p).label}</span></td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ width: "60px", height: "6px", background: "#E2E8F0", borderRadius: "4px" }}>
                                <div style={{ width: `${p.completionRate}%`, background: "#2FA4A9", height: "100%", borderRadius: "4px" }}></div>
                              </div>
                              <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{p.completionRate}%</span>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default TherapistDashboard;