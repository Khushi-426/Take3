// frontend/src/HomeRedirect.jsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
// The existing Dashboard acts as the landing page for unauthenticated users
import PatientDashboardComponent from './Dashboard'; 

const HomeRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Check user type (assuming user object from AuthContext contains 'userType')
      if (user.userType === 'therapist') {
        navigate('/therapist-dashboard', { replace: true });
      } else {
        // Default to patient dashboard for 'patient' or any other logged-in user
        navigate('/patient-dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  // If no user is logged in, show the existing Dashboard component 
  // which acts as the original landing/login page for the '/' route.
  if (!user) {
    return <PatientDashboardComponent />;
  }

  // Show a loading state while redirecting authenticated users
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontSize: '1.5rem', color: '#0050b3' }}>
      Loading your dashboard...
    </div>
  );
};

export default HomeRedirect;