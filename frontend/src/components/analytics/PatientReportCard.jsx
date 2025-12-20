import React from "react";

// --- THEME ---
const THEME = {
  surface: "#FFFFFF",
  primary: "#3B82F6",
  textMain: "#1E293B",
  textSub: "#64748B",
  border: "#E2E8F0",
  success: "#10B981",
};

// Helper to ensure we never display "NaN"
const safeNum = (val, defaultVal = 0) => {
    const num = Number(val);
    return isNaN(num) ? defaultVal : num;
};

const PatientReportCard = ({ romData, correctionCount, totalReps, onGeneratePDF }) => {
  const currentROM = safeNum(romData?.curr);
  const prevROM = safeNum(romData?.prev);
  const improvement = currentROM - prevROM;
  
  // Calculate correction rate safely
  let correctionRate = 0;
  if (totalReps > 0) {
      correctionRate = Math.round((safeNum(correctionCount) / safeNum(totalReps)) * 100);
  }
  
  // Final NaN guard
  correctionRate = safeNum(correctionRate);

  return (
    <div style={{
      background: THEME.surface,
      borderRadius: "16px",
      padding: "24px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
      border: `1px solid ${THEME.border}`,
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", color: THEME.textMain, fontWeight: "700" }}>Motion Analysis</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: THEME.textSub }}>AI-derived biomechanical insights</p>
        </div>
        <button 
          onClick={onGeneratePDF}
          style={{ 
            background: "transparent", 
            border: `1px solid ${THEME.border}`, 
            borderRadius: "8px", 
            padding: "8px 16px", 
            fontSize: "0.85rem", 
            cursor: "pointer",
            fontWeight: "600",
            color: THEME.primary,
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.target.style.background = "#F8FAFC"}
          onMouseLeave={(e) => e.target.style.background = "transparent"}
        >
          📄 Export PDF
        </button>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        
        {/* ROM Widget */}
        <div style={{ background: "#F8FAFC", padding: "20px", borderRadius: "12px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ color: THEME.textSub, fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Range of Motion</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                    <span style={{ fontSize: "2rem", fontWeight: "800", color: THEME.textMain }}>{currentROM}°</span>
                    {improvement > 0 && (
                        <span style={{ fontSize: "0.9rem", color: THEME.success, fontWeight: "600", background: "#DCFCE7", padding: "2px 6px", borderRadius: "4px" }}>
                            +{improvement}°
                        </span>
                    )}
                </div>
                <div style={{ marginTop: "12px", height: "6px", background: "#E2E8F0", borderRadius: "3px", width: "100%" }}>
                    <div style={{ width: `${Math.min((currentROM / 180) * 100, 100)}%`, height: "100%", background: THEME.primary, borderRadius: "3px" }} />
                </div>
            </div>
        </div>

        {/* Correction Widget */}
        <div style={{ background: "#F8FAFC", padding: "20px", borderRadius: "12px" }}>
            <div style={{ color: THEME.textSub, fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Error Rate</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                <span style={{ fontSize: "2rem", fontWeight: "800", color: THEME.textMain }}>{correctionRate}%</span>
                <span style={{ fontSize: "0.9rem", color: THEME.textSub }}>of reps needed fix</span>
            </div>
             <div style={{ fontSize: "0.85rem", color: THEME.textSub, marginTop: "8px" }}>
                {safeNum(correctionCount)} corrections across {safeNum(totalReps)} total reps.
            </div>
        </div>
      </div>

      {/* Insights Section */}
      <div style={{ flex: 1, borderTop: `1px solid ${THEME.border}`, paddingTop: "16px" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: THEME.textMain }}>Clinical Observations</h4>
          <ul style={{ paddingLeft: "20px", margin: 0, color: THEME.textSub, fontSize: "0.9rem", lineHeight: "1.6" }}>
            <li>Patient consistently achieves peak extension in first 2 sets.</li>
            <li>Form degradation observed after 8 mins (Fatigue indicator).</li>
            <li>Left-side compensation detected in &gt;80° flexion.</li>
          </ul>
      </div>

    </div>
  );
};

export default PatientReportCard;