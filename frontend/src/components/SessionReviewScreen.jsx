// frontend/src/components/SessionReviewScreen.jsx

import React from 'react';

const MOCK_SESSION_DATA = {
  patient: 'Charlie Brown',
  exercise: 'Shoulder Extension',
  date: 'Dec 12, 2025',
  finalQualityScore: 72, // Highlighted score
  keyErrors: [
    { time: '0:15', description: 'Elbow angle deviation (Over-extension)' },
    { time: '0:45', description: 'Trunk sway detected during rep 4' },
    { time: '1:10', description: 'Speed too high during eccentric phase' },
  ],
};

const SessionReviewScreen = ({ sessionId, onClose }) => {
  const data = MOCK_SESSION_DATA;
  
  // Dynamic color for score highlight
  const scoreColor = data.finalQualityScore >= 80 ? '#52c41a' : data.finalQualityScore >= 60 ? '#faad14' : '#ff4d4f';

  return (
    <div style={styles.container}>
      <button onClick={onClose} style={styles.closeButton}>
        &times; Close
      </button>
      <h1 style={styles.header}>Session Review: {data.exercise}</h1>
      <p style={{color: '#555'}}>Patient: {data.patient} | Date: {data.date} | Session ID: {sessionId}</p>

      <div style={styles.contentGrid}>
        
        {/* Video Review Section */}
        <div style={styles.videoSection}>
          <h2>Video & Timeline Review</h2>
          <div style={styles.videoPlaceholder}>
            <p>Video Player Placeholder (Session Playback)</p>
            {/* Mock Timeline Indicator */}
            <div style={styles.timeline}>
                <div style={styles.timelineBar}></div>
                <div style={{...styles.dipIndicator, left: '15%', backgroundColor: '#faad14'}} title="Score Dip @ 0:15"></div>
                <div style={{...styles.dipIndicator, left: '45%', backgroundColor: '#ff4d4f'}} title="Major Error @ 0:45"></div>
            </div>
            <p style={{fontSize: '0.8rem', color: '#777'}}>Timeline indicator shows points where quality score dipped below threshold (Mock Sync).</p>
          </div>
        </div>

        {/* Score & Errors Section */}
        <div style={styles.dataSection}>
            <div style={styles.scoreCard}>
                <h3>Final Quality Score</h3>
                <span style={{...styles.scoreValue, color: scoreColor}}>{data.finalQualityScore}%</span>
            </div>

            <h3 style={styles.errorHeader}>Key Errors / Deviations</h3>
            <div style={styles.errorsList}>
                {data.keyErrors.map((error, index) => (
                    <div key={index} style={styles.errorItem}>
                        <span style={styles.errorTime}>[{error.time}]</span>
                        <span>{error.description}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles (Responsive) ---
const styles = {
    container: { 
        padding: '30px', 
        backgroundColor: '#f0f2f5', 
        minHeight: '100vh', 
    },
    header: { 
        color: '#0050b3', 
        borderBottom: '2px solid #e8e8e8', 
        paddingBottom: '10px', 
        marginBottom: '10px' 
    },
    closeButton: {
        float: 'right',
        background: 'none',
        border: 'none',
        color: '#ff4d4f',
        cursor: 'pointer',
        fontSize: '1.2rem',
        fontWeight: 'bold',
    },
    contentGrid: {
        display: 'flex',
        flexWrap: 'wrap', // Responsive wrapping
        gap: '30px',
        marginTop: '20px',
    },
    videoSection: {
        flex: '2 1 400px', // Takes more space on wider screens
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    dataSection: {
        flex: '1 1 300px', // Takes remaining space
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    videoPlaceholder: {
        backgroundColor: '#333',
        height: '250px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        borderRadius: '4px',
        marginBottom: '15px',
        position: 'relative'
    },
    timeline: {
        position: 'absolute',
        bottom: '10px',
        width: '90%',
        height: '20px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: '2px',
    },
    timelineBar: {
        height: '100%',
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
    },
    dipIndicator: {
        position: 'absolute',
        top: 0,
        width: '5px',
        height: '100%',
        borderRadius: '1px',
    },
    scoreCard: {
        textAlign: 'center',
        padding: '20px',
        border: '2px solid #eee',
        borderRadius: '8px',
        marginBottom: '20px',
    },
    scoreValue: {
        fontSize: '3rem',
        fontWeight: 'bold',
        display: 'block',
    },
    errorHeader: {
        borderBottom: '1px solid #eee',
        paddingBottom: '10px',
        marginBottom: '10px',
        color: '#0050b3'
    },
    errorsList: {
        maxHeight: '300px',
        overflowY: 'auto',
    },
    errorItem: {
        padding: '8px 0',
        borderBottom: '1px dotted #f0f2f5',
        fontSize: '0.9rem',
    },
    errorTime: {
        fontWeight: 'bold',
        color: '#ff4d4f',
        marginRight: '10px',
    }
};

export default SessionReviewScreen;