// frontend/src/pages/TherapistPatientDetail.jsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  ArrowLeft, Search, Filter, Activity, Clock, 
  AlertCircle, CheckCircle, TrendingUp, User, Calendar, Download 
} from 'lucide-react';
import '../TherapistDashboard.css';

const TherapistPatientDetail = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState(null);
  const [allPatients, setAllPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch detailed analytics
        const analyticsRes = await axios.post('http://localhost:5001/api/user/analytics_detailed', { email });
        // Fetch roster for quick switching
        const rosterRes = await axios.get('http://localhost:5001/api/therapist/patients');
        
        const analytics = analyticsRes.data;
        const rosterInfo = rosterRes.data.patients.find(p => p.email === email) || {};
        
        setPatient({
          ...analytics,
          ...rosterInfo, 
          name: rosterInfo.name || analytics.name || email.split('@')[0],
          status: rosterInfo.status || "Normal",
          age: "34", // Mock Data
          gender: "Male", // Mock Data
          id: rosterInfo.id || "PT-8821",
        });
        
        setAllPatients(rosterRes.data.patients || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchData();
  }, [email]);

  // --- PDF GENERATOR (Fixed) ---
  const handleDownloadReport = () => {
    if (!patient) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 42, 68); // Brand Blue
    doc.text(`Patient Report: ${patient.name}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ID: ${patient.id} | Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // Summary Section
    doc.autoTable({
      startY: 35,
      head: [['Metric', 'Value']],
      body: [
        ['Current Status', patient.status],
        ['Average Accuracy', `${patient.average_accuracy}%`],
        ['Total Reps', patient.total_reps],
        ['Total Sessions', patient.total_sessions || 0]
      ],
      theme: 'grid',
      headStyles: { fillColor: [47, 164, 169] }, // Brand Teal
      styles: { fontSize: 11 }
    });

    // History Section
    const historyData = patient.history ? patient.history.map(s => [
      s.date, s.exercise, s.reps, `${s.accuracy}%`
    ]) : [];

    doc.text("Session History", 14, doc.lastAutoTable.finalY + 15);
    
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Date', 'Exercise', 'Reps', 'Accuracy']],
      body: historyData,
      theme: 'striped',
      headStyles: { fillColor: [15, 42, 68] }
    });

    doc.save(`${patient.name.replace(/\s+/g, '_')}_Report.pdf`);
  };

  const handleSwitchPatient = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const match = allPatients.find(p => p.name.toLowerCase() === query || p.email.toLowerCase() === query);
    if (match) {
        navigate(`/therapist/patient-detail/${match.email}`);
        setSearchQuery("");
    }
  };

  const getStatusBadge = (status) => {
    if (status === "High Risk") return <span className="status-badge status-risk"><AlertCircle size={12}/> High Risk</span>;
    if (status === "Alert") return <span className="status-badge status-warn"><Activity size={12}/> Attention</span>;
    return <span className="status-badge status-good"><CheckCircle size={12}/> Normal</span>;
  };

  if (loading) return <div className="detail-page center-loading">Loading Patient Profile...</div>;
  if (!patient) return <div className="detail-page center-loading">Patient not found</div>;

  const completionRate = patient.total_reps > 0 ? 92 : 0;
  const consistency = patient.history?.length > 2 ? 88 : 50;

  return (
    <div className="detail-page fade-in">
      
      {/* HEADER */}
      <header className="detail-header slide-down">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/therapist/monitoring')}>
            <ArrowLeft size={18} /> Back to List
          </button>
        </div>

        <div className="header-center">
          <div className="patient-switcher">
            <Search size={16} className="switcher-icon" />
            <input 
              type="text" 
              className="switcher-input"
              placeholder="Quick switch patient..."
              value={searchQuery}
              onChange={handleSwitchPatient}
              list="patient-list"
            />
            <datalist id="patient-list">
                {allPatients.map(p => <option key={p.email} value={p.name} />)}
            </datalist>
          </div>
        </div>

        <div className="header-right">
           <button className="menu-btn" title="Filter View"><Filter size={18} /></button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="patient-hero stagger-1">
        <div className="hero-block identity-card">
           <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div className="avatar-circle">
                  {patient.name.substring(0,2).toUpperCase()}
              </div>
              <div>
                  <h1>{patient.name}</h1>
                  <span className="id-text">ID: {patient.id}</span>
              </div>
           </div>
           
           <div className="id-badges">
             <span className="status-badge phase-badge">Week 4 Recovery</span>
             {getStatusBadge(patient.status)}
           </div>

           <div className="meta-row">
             <span>{patient.age} Yrs, {patient.gender}</span>
             <span>•</span>
             <span>Last Active: {patient.history?.[patient.history.length-1]?.date || "Unknown"}</span>
           </div>
        </div>

        <div className="hero-metrics">
            <div className="mini-metric hover-scale">
                <div className="progress-circle" style={{background: `conic-gradient(#2FA4A9 ${patient.average_accuracy}%, #E2E8F0 0)`}}>
                    <div className="inner-circle">{patient.average_accuracy}%</div>
                </div>
                <span className="mini-label">Accuracy</span>
            </div>

            <div className="mini-metric hover-scale">
                <span className="mini-value text-blue">{completionRate}%</span>
                <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${completionRate}%` }}></div>
                </div>
                <span className="mini-label">Completion</span>
            </div>

            <div className="mini-metric hover-scale">
                <span className="mini-value text-amber">{consistency}</span>
                <span className="mini-label">Consistency</span>
            </div>
        </div>

        <div className="hero-block focus-area hover-lift">
           <div className="focus-icon-box">
             <User size={32} color="#0284C7" />
           </div>
           <div>
             <span className="focus-label">Focus Area</span>
             <h3 className="focus-title">Upper Body</h3>
             <p className="focus-subtitle">Protocol: Shoulder Rehab A</p>
           </div>
        </div>

        <div className="activity-strip">
            <div className="activity-item">
                <Clock size={16} color="#64748b" />
                <span>Last Session: <strong>14 Mins</strong></span>
            </div>
            <div className="activity-item">
                <TrendingUp size={16} color="#059669" />
                <span style={{ color: "#059669" }}>Accuracy Trending Up (+4%)</span>
            </div>
            {patient.status !== "Normal" && (
                <div className="activity-item alert-pill">
                    <AlertCircle size={14} />
                    <span>AI Alert: Form degradation detected</span>
                </div>
            )}
        </div>
      </section>

      {/* CONTENT & LOGS */}
      <div className="detail-content stagger-2">
         {/* Actions */}
         <div className="actions-column">
            <div className="card download-card">
                <h3 style={{ color: "#94A3B8", margin: "0 0 8px 0" }}>Detailed Analytics Report</h3>
                <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "0.9rem" }}>
                    Generate a deep-dive PDF report including Range of Motion (ROM) charts and compliance history.
                </p>
                <button className="download-btn" onClick={handleDownloadReport}>
                    <Download size={18} /> Download Full Report
                </button>
            </div>
         </div>

         {/* History */}
         <div className="history-card">
            <div className="history-header">
                <span>Recent Sessions</span>
                <span className="view-all-link">View All</span>
            </div>
            <div className="session-list">
                {patient.history?.slice().reverse().slice(0, 5).map((session, i) => (
                    <div key={i} className="session-row">
                        <div className="session-info">
                            <div className="session-date">
                                <Calendar size={14} color="#94A3B8" />
                                <span>{session.date}</span>
                            </div>
                            <h4>{session.exercise}</h4>
                            <p>{session.reps} Reps • {session.errors || 0} Corrections</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <span className={`status-badge ${session.accuracy > 80 ? 'status-good' : 'status-warn'}`}>
                                {session.accuracy}% Acc
                            </span>
                        </div>
                    </div>
                ))}
                {(!patient.history || patient.history.length === 0) && (
                    <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8" }}>No recent sessions found.</div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default TherapistPatientDetail;