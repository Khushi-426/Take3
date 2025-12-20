import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AccuracyPolyline, SimpleBarChart, RadialProgress } from "../components/analytics/InteractiveCharts";
import PatientReportCard from "../components/analytics/PatientReportCard";

// --- THEME CONSTANTS ---
const THEME = {
  bg: "#F1F5F9", 
  surface: "#FFFFFF",
  primary: "#3B82F6", 
  secondary: "#64748B",
  textMain: "#0F172A",
  border: "#E2E8F0",
  success: "#10B981", 
  warning: "#F59E0B", 
  danger: "#EF4444", 
};

// --- DATA FETCHING SERVICE ---
const API_BASE_FLASK = "http://127.0.0.1:5001"; 

// --- HELPER: Prevent NaN Crash ---
// This ensures that even if data is missing or malformed, we render '0' instead of crashing
const safeDisplay = (val) => {
    const num = Number(val);
    if (isNaN(num)) return 0;
    return num;
};

const TherapistPatientDetail = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  
  const [patientProfile, setPatientProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            // 1. Fetch Basic Profile & Status
            const profileRes = await fetch(`${API_BASE_FLASK}/api/therapist/patients`);
            const profileData = await profileRes.json();
            const user = profileData.patients.find(p => p.email === email);
            
            if (user) {
                setPatientProfile(user);

                // 2. Fetch Detailed Analytics
                const analyticsRes = await fetch(`${API_BASE_FLASK}/api/user/analytics_detailed`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email })
                });
                
                if (analyticsRes.ok) {
                    const stats = await analyticsRes.json();
                    setAnalytics(stats);
                } else {
                    setAnalytics({
                        total_sessions: 0,
                        accuracy_trend: [],
                        history: []
                    });
                }
            }
        } catch (e) {
            console.error("Data Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [email]);

  if (loading) return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: THEME.bg, color: THEME.secondary }}>
        <div style={{ textAlign: "center" }}>
            <div className="spinner" style={{ marginBottom: "16px" }}>⏳</div>
            Loading Clinical Data...
        </div>
    </div>
  );

  if (!patientProfile) return <div style={{ padding: "40px" }}>Patient not found.</div>;

  // --- SAFE DATA PREPARATION ---
  const accuracyTrend = analytics?.accuracy_trend || [];
  const adherenceData = [60, 75, 80, 90, 85]; 
  
  // Safe Fallback for Consistency Score
  let consistencyScore = analytics?.consistency_score || (accuracyTrend.length > 0 ? 88 : 0);
  if (isNaN(Number(consistencyScore))) consistencyScore = 0; // Strict NaN Check

  const recentSessions = analytics?.history ? analytics.history.slice(-5).reverse() : [];
  
  const riskColor = patientProfile.status === "High Risk" ? THEME.danger : 
                    patientProfile.status === "Alert" ? THEME.warning : THEME.success;

  // Calculate Totals Safely
  const totalErrors = analytics?.history?.reduce((acc, sess) => acc + safeDisplay(sess.total_errors), 0) || 0;
  const totalReps = analytics?.history?.reduce((acc, sess) => acc + safeDisplay(sess.total_reps), 0) || 0;

  return (
    <div style={{ backgroundColor: THEME.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", paddingBottom: "60px" }}>
      
      {/* 1. TOP NAV CONTEXT BAR */}
      <div style={{ 
          background: "rgba(255, 255, 255, 0.9)", 
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${THEME.border}`, 
          padding: "12px 24px", 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button 
                onClick={() => navigate("/therapist/monitoring")}
                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.secondary, fontWeight: "600", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}
            >
                <span>&larr;</span> Roster
            </button>
            <div style={{ height: "20px", width: "1px", background: THEME.border }}></div>
            <span style={{ color: THEME.textMain, fontWeight: "700", fontSize: "1rem" }}>{patientProfile.name}</span>
            <span style={{ fontSize: "0.8rem", color: THEME.secondary, background: "#F1F5F9", padding: "2px 8px", borderRadius: "12px" }}>
                {patientProfile.email}
            </span>
        </div>
        <div>
            <button style={{ padding: "8px 16px", borderRadius: "8px", background: THEME.primary, color: "white", border: "none", fontSize: "0.85rem", fontWeight: "600", boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)" }}>
                Edit Protocol
            </button>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        
        {/* 2. ANALYTICS HERO */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr", gap: "24px", marginBottom: "32px" }}>
            
            {/* ZONE 1: Identity & Status */}
            <div style={{ background: THEME.surface, borderRadius: "16px", padding: "24px", border: `1px solid ${THEME.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ 
                        width: "64px", height: "64px", borderRadius: "20px", 
                        background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)", 
                        color: THEME.primary, 
                        display: "flex", alignItems: "center", justifyContent: "center", 
                        fontSize: "1.75rem", fontWeight: "700",
                        boxShadow: "0 4px 6px -2px rgba(59, 130, 246, 0.1)"
                    }}>
                        {patientProfile.name.charAt(0)}
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "1.25rem", color: THEME.textMain }}>{patientProfile.name}</h2>
                        <div style={{ color: THEME.secondary, fontSize: "0.9rem", marginTop: "4px" }}>Week 4 Recovery • ACL Rehab</div>
                    </div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", padding: "12px 16px", borderRadius: "12px", marginTop: "20px" }}>
                    <div>
                        <div style={{ fontSize: "0.75rem", color: THEME.secondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</div>
                        <div style={{ color: riskColor, fontWeight: "700", fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: riskColor }}></span>
                            {patientProfile.status}
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                         <div style={{ fontSize: "0.75rem", color: THEME.secondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Active</div>
                         <div style={{ color: THEME.textMain, fontWeight: "600" }}>
                            {patientProfile.last_session_ts ? new Date(patientProfile.last_session_ts * 1000).toLocaleDateString() : "N/A"}
                         </div>
                    </div>
                </div>
            </div>

            {/* ZONE 2: Interactive Charts */}
            <div style={{ background: THEME.surface, borderRadius: "16px", padding: "24px", border: `1px solid ${THEME.border}`, display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr", gap: "24px" }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: "0.85rem", color: THEME.secondary, fontWeight: "600" }}>Accuracy Trend</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "700", color: THEME.textMain }}>
                             {/* Safe display for accuracy trend text */}
                             {accuracyTrend.length > 0 ? `${safeDisplay(accuracyTrend[accuracyTrend.length-1])}%` : "N/A"}
                        </div>
                    </div>
                    <AccuracyPolyline data={accuracyTrend} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: "0.85rem", color: THEME.secondary, fontWeight: "600" }}>Weekly Adherence</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "700", color: THEME.textMain }}>85%</div>
                    </div>
                    <div style={{ height: "80px" }}>
                         <SimpleBarChart values={adherenceData} />
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <RadialProgress percent={consistencyScore} />
                    <div style={{ fontSize: "0.8rem", color: THEME.secondary, marginTop: "8px", fontWeight: "500" }}>Consistency</div>
                </div>
            </div>

            {/* ZONE 3: Focus & Protocol */}
            <div style={{ background: THEME.surface, borderRadius: "16px", padding: "24px", border: `1px solid ${THEME.border}` }}>
                <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "0.75rem", color: THEME.secondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Focus Area</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: THEME.textMain, marginTop: "4px" }}>Right Shoulder</div>
                </div>
                <div style={{ background: "#EFF6FF", padding: "16px", borderRadius: "12px", border: "1px solid #DBEAFE" }}>
                    <div style={{ fontSize: "0.75rem", color: "#1E40AF", fontWeight: "600", marginBottom: "4px" }}>ACTIVE PROTOCOL</div>
                    <div style={{ color: "#1E3A8A", fontWeight: "700", fontSize: "0.95rem" }}>Rotator Cuff Strenghening B</div>
                    <div style={{ fontSize: "0.8rem", color: "#3B82F6", marginTop: "8px" }}>
                        {/* Safe display for total sessions */}
                        Session {safeDisplay(analytics?.total_sessions)} of 24
                    </div>
                </div>
            </div>
        </div>

        {/* 3. ALERT STRIP */}
        {patientProfile.status !== "Normal" && (
             <div style={{ 
                background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", 
                padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px"
            }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#FEE2E2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>!</div>
                <div>
                    <div style={{ color: "#991B1B", fontWeight: "700", fontSize: "0.95rem" }}>Attention Required</div>
                    <div style={{ color: "#B91C1C", fontSize: "0.9rem" }}>Patient accuracy has dropped below 65% in the last 2 sessions. Check for fatigue or pain.</div>
                </div>
            </div>
        )}

        {/* 4. DEEP ANALYTICS & TIMELINE */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
            
            <PatientReportCard 
                romData={{ prev: 110, curr: 125 }} 
                correctionCount={totalErrors}
                totalReps={totalReps}
                onGeneratePDF={() => alert("Generating PDF Report...")}
            />

            {/* SESSION TIMELINE */}
            <div style={{ background: THEME.surface, borderRadius: "16px", padding: "24px", border: `1px solid ${THEME.border}`, height: "fit-content" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", color: THEME.textMain }}>Recent Sessions</h3>
                    <span style={{ fontSize: "0.8rem", color: THEME.primary, fontWeight: "600", cursor: "pointer" }}>View All</span>
                 </div>
                 
                 <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                    {recentSessions.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: THEME.secondary, fontSize: "0.9rem" }}>No sessions recorded yet.</div>
                    ) : (
                        recentSessions.map((session, idx) => (
                            <div key={idx} style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "16px", 
                                padding: "16px 0", 
                                borderBottom: idx !== recentSessions.length - 1 ? `1px solid ${THEME.border}` : "none",
                                transition: "transform 0.2s",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
                            >
                                <div style={{ 
                                    width: "40px", height: "40px", borderRadius: "10px", 
                                    background: THEME.bg, color: THEME.secondary, 
                                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                    fontSize: "0.75rem", fontWeight: "700", lineHeight: "1.1"
                                }}>
                                    <span>{new Date(session.timestamp * 1000).getDate()}</span>
                                    <span style={{ fontSize: "0.65rem", fontWeight: "500" }}>{new Date(session.timestamp * 1000).toLocaleString('default', { month: 'short' })}</span>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "0.95rem", color: THEME.textMain, fontWeight: "600" }}>{session.exercise || "Unknown Exercise"}</div>
                                    {/* --- FIX: WRAP THESE VALUES IN safeDisplay --- */}
                                    <div style={{ fontSize: "0.8rem", color: THEME.secondary }}>
                                        {safeDisplay(session.total_reps)} Reps • {safeDisplay(session.total_errors)} Corrections
                                    </div>
                                </div>

                                <div style={{ textAlign: "right" }}>
                                    {(() => {
                                        // SAFE ACCURACY CALCULATION
                                        const r = safeDisplay(session.total_reps);
                                        const e = safeDisplay(session.total_errors);
                                        const acc = r > 0 ? Math.max(0, 100 - Math.round((e / r) * 20)) : 0;
                                        
                                        return (
                                            <div style={{ 
                                                color: acc > 80 ? THEME.success : THEME.warning, 
                                                fontWeight: "700", fontSize: "0.9rem" 
                                            }}>
                                                {acc}%
                                            </div>
                                        );
                                    })()}
                                    <div style={{ fontSize: "0.75rem", color: THEME.secondary }}>Accuracy</div>
                                </div>
                            </div>
                        ))
                    )}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TherapistPatientDetail;