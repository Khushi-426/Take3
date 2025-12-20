import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  FileText,
  AlertCircle,
  Heart,
  Thermometer,
  Pill,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  Ruler,
  Weight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import "./MedicalRecord.css";

// --- STATIC MOCK DATA ---
const MEDICAL_DATA = {
  patient: {
    bloodType: "A+",
    height: "182 cm",
    weight: "78 kg",
    dob: "1995-08-24",
    allergies: ["Penicillin", "Peanuts"],
  },
  diagnosis: {
    condition: "Post-Op ACL Reconstruction (Right Knee)",
    date: "Oct 12, 2024",
    doctor: "Dr. Sarah Lin, Orthopedic Surgeon",
    status: "Recovery Phase 2",
    notes:
      "Patient is showing good stability. Focus on increasing flexion to 120° and strengthening quadriceps.",
  },
  pain_history: [
    { week: "Wk 1", pain: 8, mobility: 20 },
    { week: "Wk 2", pain: 6, mobility: 35 },
    { week: "Wk 3", pain: 5, mobility: 50 },
    { week: "Wk 4", pain: 3, mobility: 65 },
    { week: "Wk 5", pain: 2, mobility: 80 },
    { week: "Wk 6", pain: 1, mobility: 95 },
  ],
  rom_data: [
    { subject: "Flexion", A: 110, B: 135, fullMark: 150 }, // A=Current, B=Goal
    { subject: "Extension", A: 0, B: 0, fullMark: 10 },
    { subject: "Rotation", A: 25, B: 40, fullMark: 50 },
    { subject: "Stability", A: 70, B: 90, fullMark: 100 },
    { subject: "Strength", A: 60, B: 85, fullMark: 100 },
  ],
  medications: [
    {
      name: "Ibuprofen",
      dosage: "400mg",
      freq: "As needed for pain",
      active: true,
    },
    { name: "Vitamin D3", dosage: "2000 IU", freq: "Daily", active: true },
    { name: "Oxycodone", dosage: "5mg", freq: "Discontinued", active: false },
  ],
};

const MedicalRecord = () => {
  const [expandedNote, setExpandedNote] = useState(true);

  // COLORS (Matching your theme)
  const COLORS = {
    primary: "#69B341",
    secondary: "#1A3C34",
    bg: "#F9F7F3",
    red: "#EF4444",
    blue: "#3B82F6",
    grid: "#E5E7EB",
  };

  return (
    <div className="medical-container">
      <div className="medical-wrapper">
        {/* 1. HEADER & DIAGNOSIS */}
        <div className="medical-header">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="page-title">Medical Record</h1>
            <p className="page-subtitle">
              Patient ID: <span className="mono">PT-482910</span>
            </p>
          </motion.div>

          <div className="emergency-badge">
            <Phone size={16} />
            <span>Emergency Contact: Jane Doe (Wife) - 555-0192</span>
          </div>
        </div>

        {/* 2. DIAGNOSIS CARD (HERO) */}
        <motion.div
          className="card diagnosis-card"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="diagnosis-header">
            <div className="diagnosis-icon">
              <Activity size={32} color="#fff" />
            </div>
            <div className="diagnosis-info">
              <span className="label">Current Diagnosis</span>
              <h2>{MEDICAL_DATA.diagnosis.condition}</h2>
            </div>
            <div className="status-pill">{MEDICAL_DATA.diagnosis.status}</div>
          </div>

          <div className="diagnosis-details">
            <div className="detail-item">
              <Calendar size={18} className="icon-muted" />
              <div>
                <span className="detail-label">Diagnosed</span>
                <span className="detail-value">
                  {MEDICAL_DATA.diagnosis.date}
                </span>
              </div>
            </div>
            <div className="detail-item">
              <Heart size={18} className="icon-muted" />
              <div>
                <span className="detail-label">Physician</span>
                <span className="detail-value">
                  {MEDICAL_DATA.diagnosis.doctor}
                </span>
              </div>
            </div>
          </div>

          <div className="doctor-notes">
            <div
              className="notes-header"
              onClick={() => setExpandedNote(!expandedNote)}
            >
              <span className="notes-title">
                <FileText size={16} /> Physician's Latest Notes
              </span>
              {expandedNote ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </div>
            {expandedNote && (
              <p className="notes-content">{MEDICAL_DATA.diagnosis.notes}</p>
            )}
          </div>
        </motion.div>

        {/* 3. GRID LAYOUT */}
        <div className="medical-grid">
          {/* LEFT COL: Vitals & History Chart */}
          <div className="grid-left">
            {/* Vitals Row */}
            <div className="vitals-row">
              <VitalCard
                label="Height"
                value={MEDICAL_DATA.patient.height}
                icon={Ruler}
              />
              <VitalCard
                label="Weight"
                value={MEDICAL_DATA.patient.weight}
                icon={Weight}
              />
              <VitalCard
                label="Blood Type"
                value={MEDICAL_DATA.patient.bloodType}
                icon={Activity}
              />
            </div>

            {/* Pain vs Recovery Chart */}
            <motion.div
              className="card chart-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="card-title">
                <h3>
                  <Thermometer size={20} /> Pain vs. Mobility Progress
                </h3>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={MEDICAL_DATA.pain_history}
                    margin={{ top: 5, right: 30, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={COLORS.grid}
                    />
                    <XAxis
                      dataKey="week"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                      domain={[0, 10]}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend iconType="circle" />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="pain"
                      name="Pain Level (0-10)"
                      stroke={COLORS.red}
                      strokeWidth={3}
                      dot={{ r: 4, fill: COLORS.red }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="mobility"
                      name="Mobility Score (%)"
                      stroke={COLORS.primary}
                      strokeWidth={3}
                      dot={{ r: 4, fill: COLORS.primary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COL: ROM Radar & Meds */}
          <div className="grid-right">
            {/* Range of Motion Radar */}
            <motion.div
              className="card chart-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="card-title">
                <h3>
                  <Activity size={20} /> Range of Motion
                </h3>
              </div>
              <div className="chart-wrapper" style={{ height: "250px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    data={MEDICAL_DATA.rom_data}
                  >
                    <PolarGrid stroke={COLORS.grid} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "#4B5563", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 150]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="Current"
                      dataKey="A"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.4}
                    />
                    <Radar
                      name="Goal"
                      dataKey="B"
                      stroke={COLORS.secondary}
                      fill={COLORS.secondary}
                      fillOpacity={0.1}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", marginTop: "10px" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Medications List */}
            <motion.div
              className="card meds-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="card-title">
                <h3>
                  <Pill size={20} /> Medications
                </h3>
              </div>
              <ul className="meds-list">
                {MEDICAL_DATA.medications.map((med, idx) => (
                  <li
                    key={idx}
                    className={`med-item ${!med.active ? "inactive" : ""}`}
                  >
                    <div className="med-icon">
                      <Pill size={16} />
                    </div>
                    <div className="med-info">
                      <div className="med-header">
                        <span className="med-name">{med.name}</span>
                        {!med.active && (
                          <span className="badge-discontinued">Stopped</span>
                        )}
                      </div>
                      <span className="med-dosage">
                        {med.dosage} • {med.freq}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="allergies-box">
                <span className="allergies-label">
                  <AlertCircle size={14} /> Allergies:
                </span>
                <span className="allergies-list">
                  {MEDICAL_DATA.patient.allergies.join(", ")}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---
const VitalCard = ({ label, value, icon: Icon }) => (
  <div className="vital-card">
    <div className="vital-icon">
      <Icon size={20} />
    </div>
    <div className="vital-data">
      <span className="vital-value">{value}</span>
      <span className="vital-label">{label}</span>
    </div>
  </div>
);

export default MedicalRecord;
