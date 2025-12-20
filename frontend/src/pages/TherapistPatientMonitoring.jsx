// frontend/src/pages/TherapistPatientMonitoring.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Filter, SlidersHorizontal } from 'lucide-react';
import '../TherapistDashboard.css';

const TherapistPatientMonitoring = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
        const res = await axios.get("http://localhost:5001/api/therapist/patients");
        setPatients(res.data.patients || []);
        setLoading(false);
    } catch(e) { console.error(e); setLoading(false); }
  };

  // --- FILTER LOGIC FIX ---
  const filteredPatients = patients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    
    // Logic: 'High Risk' filter should include 'High Risk' AND 'Alert' statuses
    if (filter === "All") return matchesSearch;
    
    if (filter === "High Risk") {
        return matchesSearch && (p.status === "High Risk" || p.status === "Alert");
    }
    
    if (filter === "Normal") {
        return matchesSearch && (p.status === "Normal" || p.status === "Active");
    }
    
    return matchesSearch;
  });

  const getStatusClass = (status) => {
    if (status === "High Risk") return "status-risk";
    if (status === "Alert") return "status-warn";
    return "status-good";
  };

  if (loading) return <div className="center-loading">Loading Roster...</div>;

  return (
    <div className="monitoring-container fade-in">
      
      {/* HEADER */}
      <div className="monitoring-header slide-down">
         <div>
            <h1 style={{ fontSize: "1.8rem", color: "#0F2A44", marginBottom: "4px" }}>Patient Roster</h1>
            <p style={{ color: "#64748b", margin: 0 }}>Monitoring {filteredPatients.length} active patients</p>
         </div>
         <button className="back-btn-primary" onClick={() => navigate("/therapist-dashboard")}>
             <ArrowLeft size={18} /> Dashboard
         </button>
      </div>

      {/* CONTROLS */}
      <div className="monitoring-controls stagger-1">
         <div className="search-wrapper">
             <Search size={16} className="search-icon" />
             <input 
                className="search-input" 
                placeholder="Search by name..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
         </div>
         <div className="divider-vertical"></div>
         <div className="filter-group">
            <SlidersHorizontal size={16} color="#64748b" style={{ marginRight: '8px' }} />
            {["All", "Normal", "High Risk"].map(f => (
                <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`filter-chip ${filter === f ? 'active' : ''}`}
                >
                    {f}
                </button>
            ))}
         </div>
      </div>

      {/* LIST TABLE */}
      <div className="card table-card stagger-2" style={{ marginTop: "24px" }}>
        <table className="patient-table">
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Status</th>
              <th>Compliance</th>
              <th>Last Activity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                    <tr key={p.email} className="patient-row" onClick={() => navigate(`/therapist/patient-detail/${p.email}`)}>
                    <td style={{ fontWeight: "600", color: "#0F2A44" }}>
                        {p.name}
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "400" }}>{p.email}</div>
                    </td>
                    <td>
                        <span className={`status-badge ${getStatusClass(p.status)}`}>{p.status}</span>
                    </td>
                    <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div className="progress-track">
                                <div 
                                    className="progress-fill" 
                                    style={{ 
                                        width: p.status === 'High Risk' ? '40%' : '85%', 
                                        background: p.status==='High Risk' ? '#EF4444' : '#2FA4A9'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </td>
                    <td>{p.recentActivity ? "Today" : p.last_session_date || "Inactive"}</td>
                    <td>
                        <button className="view-btn">View Report</button>
                    </td>
                    </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        No patients found matching "{filter}".
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default TherapistPatientMonitoring;