import React, { useState } from "react";

const THEME = {
  primary: "#3B82F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  textMain: "#1E293B",
  textSub: "#64748B",
  tooltipBg: "#1E293B",
  grid: "#E2E8F0"
};

// --- TOOLTIP COMPONENT ---
const Tooltip = ({ x, y, value, label }) => (
  <div style={{
    position: "absolute",
    left: x,
    top: y,
    transform: "translate(-50%, -120%)",
    backgroundColor: THEME.tooltipBg,
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    pointerEvents: "none",
    zIndex: 20,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    whiteSpace: "nowrap"
  }}>
    <div style={{ fontWeight: "600" }}>{value}</div>
    {label && <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>{label}</div>}
    <div style={{
      position: "absolute",
      bottom: "-4px",
      left: "50%",
      transform: "translateX(-50%)",
      width: 0, 
      height: 0, 
      borderLeft: "5px solid transparent",
      borderRight: "5px solid transparent",
      borderTop: `5px solid ${THEME.tooltipBg}`
    }} />
  </div>
);

// --- 1. INTERACTIVE ACCURACY TREND (Line Chart) ---
export const AccuracyPolyline = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) return <div style={{height: 60, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', color: THEME.textSub}}>No Data</div>;

  const height = 80;
  const width = 200; 
  const max = 100;

  const points = data.map((val, i) => {
    // Safety check for NaN values in data
    const safeVal = isNaN(Number(val)) ? 0 : Number(val);
    const x = (i / (data.length - 1)) * width;
    const y = height - (safeVal / max) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ position: "relative", width: "100%", height: "100px" }}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`-5 -5 ${width + 10} ${height + 20}`} 
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={THEME.primary} stopOpacity={0.2} />
            <stop offset="100%" stopColor={THEME.primary} stopOpacity={0} />
          </linearGradient>
        </defs>

        <path
          d={`M0,${height} ${points.replace(/ /g, " L")} L${width},${height} Z`}
          fill="url(#lineGradient)"
          stroke="none"
        />

        <polyline
          points={points}
          fill="none"
          stroke={THEME.primary}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((val, i) => {
          const safeVal = isNaN(Number(val)) ? 0 : Number(val);
          const x = (i / (data.length - 1)) * width;
          const y = height - (safeVal / max) * height;
          const isHovered = hoveredPoint === i;

          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 6 : 3.5}
                fill="#fff"
                stroke={THEME.primary}
                strokeWidth={isHovered ? 3 : 2}
                style={{ transition: "all 0.2s ease", cursor: "pointer" }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parentRect = e.currentTarget.closest("div").getBoundingClientRect();
                  setHoveredPoint({
                    index: i,
                    val: safeVal,
                    x: rect.left - parentRect.left + rect.width / 2,
                    y: rect.top - parentRect.top
                  });
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          );
        })}
      </svg>

      {hoveredPoint && (
        <Tooltip 
            x={hoveredPoint.x} 
            y={hoveredPoint.y} 
            value={`${hoveredPoint.val}%`} 
            label={`Session ${hoveredPoint.index + 1}`} 
        />
      )}
    </div>
  );
};

// --- 2. INTERACTIVE COMPLIANCE BAR ---
export const SimpleBarChart = ({ values }) => {
    const [hoveredBar, setHoveredBar] = useState(null);
    if (!values || values.length === 0) return null;

    return (
        <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "flex-end", gap: "6px" }}>
            {values.map((v, i) => {
                const safeV = isNaN(Number(v)) ? 0 : Number(v);
                const heightPercent = Math.max(safeV, 10);
                let color = THEME.grid;
                if(i === values.length - 1) color = THEME.success; 
                else if (safeV < 50) color = THEME.danger;
                
                return (
                    <div 
                        key={i}
                        onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const parentRect = e.currentTarget.parentElement.getBoundingClientRect();
                            setHoveredBar({
                                val: safeV,
                                x: rect.left - parentRect.left + rect.width / 2,
                                y: rect.top - parentRect.top
                            });
                        }}
                        onMouseLeave={() => setHoveredBar(null)}
                        style={{ 
                            flex: 1, 
                            background: color, 
                            height: `${heightPercent}%`, 
                            borderRadius: '3px',
                            transition: "height 0.4s ease, background 0.2s",
                            cursor: "pointer",
                            opacity: hoveredBar && hoveredBar.val !== v ? 0.6 : 1
                        }} 
                    />
                )
            })}
             {hoveredBar && (
                <Tooltip 
                    x={hoveredBar.x} 
                    y={hoveredBar.y} 
                    value={`${hoveredBar.val}%`} 
                    label="Adherence"
                />
            )}
        </div>
    )
};

// --- 3. ANIMATED RADIAL PROGRESS ---
export const RadialProgress = ({ percent }) => {
    // SAFETY CHECK: Ensure percent is a number
    const safePercent = isNaN(Number(percent)) ? 0 : Number(percent);

    const r = 24;
    const c = 2 * Math.PI * r;
    const offset = c - (safePercent / 100) * c;
    
    return (
        <svg width="70" height="70" viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="30" cy="30" r={r} fill="none" stroke={THEME.grid} strokeWidth="5" />
            <circle 
                cx="30" cy="30" r={r} 
                fill="none" 
                stroke={safePercent > 80 ? THEME.success : safePercent > 50 ? THEME.warning : THEME.danger} 
                strokeWidth="5" 
                strokeDasharray={c} 
                strokeDashoffset={offset} 
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
            {/* THIS TEXT WAS A LIKELY CULPRIT FOR THE ERROR */}
            <text 
                x="30" y="30" 
                textAnchor="middle" 
                dy="4" 
                transform="rotate(90 30 30)" 
                fill={THEME.textMain} 
                fontSize="12" 
                fontWeight="700"
            >
                {safePercent}
            </text>
        </svg>
    );
};