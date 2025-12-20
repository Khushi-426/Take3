import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// --- THEME CONSTANTS ---
const THEME = {
  bg: "#F1F5F9", // Soft sky gray
  surface: "#FFFFFF",
  primary: "#3B82F6", // Medical Blue
  textMain: "#1E293B",
  textSub: "#64748B",
  border: "#E2E8F0",
  success: "#10B981", // Teal-green
  warning: "#F59E0B", // Amber
  danger: "#EF4444", // Soft Red
  hover: "#F8FAFC",
};

const TherapistPatientMonitoring = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Normal, High Risk

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5001/api/therapist/patients");
        if (response.ok) {
          const data = await response.json();
          setPatients(data.patients || []);
        }
      } catch (error) {
        console.error("Failed to fetch patients", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // --- FILTER LOGIC ---
  const filteredPatients = patients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "High Risk" && p.status === "High Risk") ||
      (statusFilter === "Normal" && p.status !== "High Risk");
    return matchesSearch && matchesStatus;
  });

  // --- SUB-COMPONENTS ---
  const StatusBadge = ({ status }) => {
    const isRisk = status === "High Risk";
    const isAlert = status === "Alert";
    
    let bg = "#ECFDF5"; // green-50
    let color = THEME.success;
    
    if (isRisk) {
        bg = "#FEF2F2"; // red-50
        color = THEME.danger;
    } else if (isAlert) {
        bg = "#FFFBEB"; // amber-50
        color = THEME.warning;
    }

    return (
      <span
        style={{
          backgroundColor: bg,
          color: color,
          padding: "4px 12px",
          borderRadius: "16px",
          fontSize: "0.75rem",
          fontWeight: "600",
          display: "inline-block",
        }}
      >
        {status}
      </span>
    );
  };

  const ComplianceBar = ({ value }) => {
    // 0 to 100
    const color = value < 50 ? THEME.danger : value < 80 ? THEME.warning : THEME.success;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "120px" }}>
        <div style={{ flex: 1, height: "6px", background: THEME.border, borderRadius: "3px", overflow: 'hidden' }}>
            <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: "3px" }} />
        </div>
        <span style={{ fontSize: "0.75rem", color: THEME.textSub, width: "30px" }}>{value}%</span>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: THEME.bg, minHeight: "100vh", padding: "32px", fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER & CONTEXT */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", color: THEME.textMain, margin: 0, letterSpacing: "-0.5px" }}>
            Patient Roster
          </h1>
          <p style={{ color: THEME.textSub, marginTop: "8px", fontSize: "0.95rem" }}>
            Monitoring <strong style={{ color: THEME.textMain }}>{patients.length} active patients</strong> under your care.
          </p>
        </div>
        <button
          onClick={() => navigate("/therapist-dashboard")}
          style={{
            background: "transparent",
            border: `1px solid ${THEME.border}`,
            color: THEME.textSub,
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {/* CONTROLS BAR (Updated Layout) */}
      <div
        style={{
          backgroundColor: THEME.surface,
          borderRadius: "12px",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between", // Spread items apart
          gap: "24px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          marginBottom: "24px",
          border: `1px solid ${THEME.border}`
        }}
      >
        {/* Search - Fixed Width so it doesn't hog space */}
        <div style={{ width: "320px", position: "relative" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: THEME.textSub }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 10px 10px 40px",
              border: `1px solid ${THEME.border}`,
              borderRadius: "8px",
              outline: "none",
              fontSize: "0.9rem",
              color: THEME.textMain
            }}
          />
        </div>

        {/* Right Side Group: Status Tabs + Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            {/* Status Tabs */}
            <div style={{ display: "flex", gap: "4px", background: THEME.bg, padding: "4px", borderRadius: "8px" }}>
            {["All", "Normal", "High Risk"].map((status) => (
                <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                    border: "none",
                    background: statusFilter === status ? THEME.surface : "transparent",
                    color: statusFilter === status ? THEME.primary : THEME.textSub,
                    padding: "6px 16px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: statusFilter === status ? "600" : "500",
                    cursor: "pointer",
                    boxShadow: statusFilter === status ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    transition: "all 0.2s"
                }}
                >
                {status}
                </button>
            ))}
            </div>

            {/* Filter Trigger */}
            <button style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textSub, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚙️</span>
                <span style={{fontSize: "0.85rem", fontWeight: "500"}}>Filters</span>
            </button>
        </div>
      </div>

      {/* PATIENT TABLE/LIST */}
      <div style={{ backgroundColor: THEME.surface, borderRadius: "12px", border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
        {/* Table Header */}
        <div style={{ 
            display: "grid", 
            gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr", 
            padding: "16px 24px", 
            borderBottom: `1px solid ${THEME.border}`,
            background: "#F8FAFC",
            fontSize: "0.75rem",
            fontWeight: "700",
            color: THEME.textSub,
            textTransform: "uppercase",
            letterSpacing: "0.5px"
        }}>
            <div>Patient Name</div>
            <div>Risk Status</div>
            <div>Adherence</div>
            <div>Last Activity</div>
            <div style={{textAlign: "right"}}>Action</div>
        </div>

        {/* Table Body */}
        {loading ? (
             <div style={{ padding: "40px", textAlign: "center", color: THEME.textSub }}>Loading patients...</div>
        ) : filteredPatients.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: THEME.textSub }}>No patients found matching your criteria.</div>
        ) : (
            filteredPatients.map((patient) => (
                <div 
                    key={patient.id || patient.email}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 1fr",
                        padding: "20px 24px",
                        borderBottom: `1px solid ${THEME.border}`,
                        alignItems: "center",
                        transition: "background 0.2s",
                        cursor: "pointer"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.hover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = THEME.surface}
                    onClick={() => navigate(`/therapist/patient-detail/${patient.email}`)}
                >
                    {/* Name Col */}
                    <div>
                        <div style={{ fontWeight: "600", color: THEME.textMain, fontSize: "0.95rem" }}>{patient.name}</div>
                        <div style={{ fontSize: "0.8rem", color: THEME.textSub }}>{patient.email}</div>
                    </div>

                    {/* Status Col */}
                    <div>
                        <StatusBadge status={patient.status} />
                    </div>

                    {/* Compliance Col */}
                    <div>
                        <ComplianceBar value={patient.status === 'High Risk' ? 45 : patient.status === 'Alert' ? 70 : 92} />
                    </div>

                    {/* Last Activity */}
                    <div style={{ fontSize: "0.85rem", color: THEME.textMain }}>
                        {patient.last_session_ts ? new Date(patient.last_session_ts * 1000).toLocaleDateString() : "Never"}
                        <div style={{ fontSize: "0.75rem", color: THEME.textSub }}>
                            {patient.recent_activity || "No recent activity"}
                        </div>
                    </div>

                    {/* Action */}
                    <div style={{ textAlign: "right" }}>
                        <span style={{ 
                            color: THEME.primary, 
                            fontWeight: "600", 
                            fontSize: "0.85rem",
                            paddingBottom: "2px",
                            borderBottom: "1px solid transparent" 
                        }}>
                            View Report &rarr;
                        </span>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default TherapistPatientMonitoring;