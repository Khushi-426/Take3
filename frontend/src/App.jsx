// frontend/src/App.jsx

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

// --- DASHBOARD COMPONENTS ---
import PatientDashboard from "./Dashboard";
import TherapistDashboard from "./TherapistDashboard";
import HomeRedirect from "./HomeRedirect";

// --- THERAPIST PAGES ---
import TherapistPatientMonitoring from "./pages/TherapistPatientMonitoring";
import TherapistAssignmentManager from "./pages/TherapistAssignmentManager";
import TherapistNotificationLog from "./pages/TherapistNotificationLog";
import TherapistAnalytics from "./pages/TherapistAnalytics";
import SessionReviewScreen from "./components/SessionReviewScreen";
import TherapistPatientDetail from "./pages/TherapistPatientDetail";

// --- PATIENT / COMMON PAGES ---
import Tracker from "./Tracker";
import Report from "./Report";
import Tutorial from "./Tutorial";
import Profile from "./pages/Profile";
import MedicalRecord from "./pages/MedicalRecord"; // ✅ NEW IMPORT
import MyPrograms from "./pages/MyPrograms"; // ✅ NEW IMPORT
import Analytics from "./pages/Analytics";
import RiskPrediction from "./pages/RiskPrediction";

import Navbar from "./components/Navbar";
import * as Pages from "./pages/PlaceholderPages";

// ✅ GOOGLE CLIENT ID
const GOOGLE_CLIENT_ID =
  "254404106678-ql7lb3kidfsvdjk5a4fcjl7t7kn61aos.apps.googleusercontent.com";

// --- LAYOUT COMPONENT ---
const Layout = ({ children }) => {
  const location = useLocation();

  // Hide navbar on tracking and therapist pages
  const isTrackingPage = location.pathname === "/track";
  const isTherapistPage = location.pathname.startsWith("/therapist");

  const showNavbar = !isTrackingPage && !isTherapistPage;

  return (
    <>
      {showNavbar && <Navbar />}
      <div style={{ minHeight: "calc(100vh - 80px)" }}>{children}</div>
    </>
  );
};

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* --- MAIN ENTRY --- */}
              <Route path="/" element={<HomeRedirect />} />

              {/* --- DASHBOARDS --- */}
              <Route path="/patient-dashboard" element={<PatientDashboard />} />
              <Route
                path="/therapist-dashboard"
                element={<TherapistDashboard />}
              />

              {/* --- THERAPIST ROUTES --- */}
              <Route
                path="/therapist/monitoring"
                element={<TherapistPatientMonitoring />}
              />
              <Route
                path="/therapist/assignments"
                element={<TherapistAssignmentManager />}
              />
              <Route
                path="/therapist/notifications"
                element={<TherapistNotificationLog />}
              />
              <Route
                path="/therapist/analytics"
                element={<TherapistAnalytics />}
              />
              <Route
                path="/therapist/session-review/:sessionId"
                element={
                  <SessionReviewScreen
                    onClose={() => {}}
                    sessionId="MOCK_ID_123"
                  />
                }
              />
              <Route
                path="/therapist/patient-detail/:email"
                element={<TherapistPatientDetail />}
              />

              {/* --- PATIENT CORE --- */}
              <Route path="/track" element={<Tracker />} />
              <Route path="/report" element={<Report />} />

              {/* --- TRAINING --- */}
              <Route path="/training/library" element={<Tutorial />} />
              <Route
                path="/training/detail"
                element={<Pages.ExerciseDetail />}
              />

              {/* --- AUTH --- */}
              <Route path="/auth/login" element={<Pages.Login />} />
              <Route path="/auth/signup" element={<Pages.Signup />} />
              <Route path="/auth/onboarding" element={<Pages.Onboarding />} />

              {/* --- PROFILE --- */}
              <Route path="/profile/overview" element={<Profile />} />

              {/* ✅ UPDATED ROUTE: Connects to your new MedicalRecord component */}
              <Route path="/profile/medical" element={<MedicalRecord />} />

              <Route
                path="/profile/preferences"
                element={<Pages.Preferences />}
              />

              {/* --- PROGRAMS --- */}

              <Route
                path="/programs/custom"
                element={<Pages.CustomProgram />}
              />
              <Route
                path="/programs/my-programs"
                element={<MyPrograms />} // ✅ UPDATED
              />

              {/* --- ANALYTICS --- */}
              <Route path="/analytics/accuracy" element={<Analytics />} />
              <Route path="/analytics/risk" element={<RiskPrediction />} />

              {/* --- COMMUNITY --- */}
              <Route
                path="/community/achievements"
                element={<Pages.Achievements />}
              />
              <Route
                path="/community/challenges"
                element={<Pages.Challenges />}
              />
              <Route
                path="/community/therapist"
                element={<Pages.TherapistModule />}
              />

              {/* --- SUPPORT --- */}
              <Route path="/support/faq" element={<Pages.FAQ />} />
              <Route path="/support/contact" element={<Pages.Contact />} />
              <Route path="/support/legal" element={<Pages.Legal />} />

              {/* --- LEGACY --- */}
              <Route path="/tutorial" element={<Tutorial />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
