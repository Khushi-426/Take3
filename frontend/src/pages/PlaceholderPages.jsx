import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Stethoscope, Mail, Lock, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion'; // Added for smooth animations
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Auth.css';

// --- CUSTOM GOOGLE BUTTON ---
const GoogleButton = ({ onClick, disabled }) => (
  <button 
    type="button" 
    onClick={onClick} 
    className="google-btn" 
    disabled={disabled}
    style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    Continue with Google
  </button>
);

// --- OTP INPUT COMPONENT ---
const OTPInput = ({ length = 6, onComplete }) => {
    const [otp, setOtp] = useState(new Array(length).fill(""));
    const inputRefs = useRef([]);

    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (element, index) => {
        if (isNaN(element.value)) return false;

        setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

        // Focus next input
        if (element.value !== "" && index < length - 1) {
            inputRefs.current[index + 1].focus();
        }
        
        // Trigger callback if complete
        const newOtp = [...otp.map((d, idx) => (idx === index ? element.value : d))];
        if (newOtp.every(d => d !== "")) {
             onComplete(newOtp.join(""));
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace") {
             if (e.target.value === "" && index > 0) {
                 inputRefs.current[index - 1].focus();
             } 
        }
    };

    return (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
            {otp.map((data, index) => (
                <input
                    key={index}
                    type="text"
                    maxLength="1"
                    ref={el => inputRefs.current[index] = el}
                    value={data}
                    onChange={e => handleChange(e.target, index)}
                    onKeyDown={e => handleKeyDown(e, index)}
                    onFocus={(e) => {
                        e.target.select();
                        e.target.style.borderColor = '#69B341';
                        e.target.style.background = '#fff';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#ddd';
                        e.target.style.background = '#f8f9fa';
                    }}
                    style={{
                        width: '45px',
                        height: '55px',
                        fontSize: '1.5rem',
                        textAlign: 'center',
                        borderRadius: '12px',
                        border: '2px solid #ddd',
                        background: '#f8f9fa',
                        fontWeight: 'bold',
                        color: '#1A3C34',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                />
            ))}
        </div>
    );
};

// --- LOGIN COMPONENT ---
export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState('patient');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading State

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post('http://127.0.0.1:5001/api/auth/google', {
          token: tokenResponse.access_token,
          role: role
        });
        login({
          ...res.data,
          userType: role   // 👈 THIS IS THE FIX
        });
        
        navigate('/');
        
      } catch (err) {
        setError('Google Login Failed');
      }
    },
    onError: () => setError('Google Login Failed'),
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError('');
    
    try {
      const res = await axios.post('http://127.0.0.1:5001/api/auth/login', formData);
      login({
        ...res.data,
        userType: role
      });
      
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
           <h2>Welcome Back</h2>
           <p>Log in to your {role} portal</p>
        </div>
        
        <div className="role-switcher">
          <div className={`role-tab ${role === 'patient' ? 'active' : ''}`} onClick={() => setRole('patient')}>
            <User size={18} /> Patient
          </div>
          <div className={`role-tab ${role === 'therapist' ? 'active' : ''}`} onClick={() => setRole('therapist')}>
            <Stethoscope size={18} /> Therapist
          </div>
        </div>

        {error && <div style={{color: '#d32f2f', background: '#ffebee', padding: '10px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem'}}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <Mail size={20} className="input-icon" />
            <input 
              className="auth-input" 
              type="email" 
              placeholder="Email Address" 
              required 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
            />
          </div>
          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input 
              className="auth-input" 
              type="password" 
              placeholder="Password" 
              required 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          <button 
            type="submit" 
            className="auth-btn"
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
             {isLoading ? (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <Loader2 size={18} />
                    </motion.div>
                    Logging In...
                </div>
             ) : "Log In"}
          </button>
        </form>

        <div className="or-divider">OR</div>
        
        <GoogleButton onClick={() => googleLogin()} disabled={isLoading} />

        <div className="auth-footer">
          Don't have an account? <Link to="/auth/signup" className="auth-link">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

// --- SIGNUP COMPONENT ---
export const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState('patient');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', licenseId: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading State

  const googleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post('http://127.0.0.1:5001/api/auth/google', {
          token: tokenResponse.access_token,
          role: role
        });
        login({
          ...res.data,
          userType: role
        });
        navigate('/');
      } catch (err) {
        setMessage('Google Signup Failed');
      }
    },
    onError: () => setMessage('Google Signup Failed'),
  });

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double click

    setIsLoading(true);
    setMessage('');

    try {
        await axios.post('http://127.0.0.1:5001/api/auth/send-otp', { email: formData.email });
        setOtpSent(true);
        setMessage('Verification code sent! Check your inbox.');
    } catch (err) {
        setMessage(err.response?.data?.error || 'Failed to send OTP');
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyAndSignup = async (otpValue = otp) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setMessage('');

    try {
        const res = await axios.post('http://127.0.0.1:5001/api/auth/signup-verify', {
            ...formData, otp: otpValue, role
        });
        login({
          ...res.data.user,
          userType: role
        });
        
        navigate('/');
    } catch (err) {
        setMessage(err.response?.data?.error || 'Verification failed');
        setIsLoading(false); // Only stop loading on error, on success we navigate away
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header changes based on state */}
        <div className="auth-header">
            <h2>{otpSent ? 'Verify Email' : 'Create Account'}</h2>
            {otpSent && <p style={{fontSize: '0.9rem'}}>Enter the 6-digit code sent to <b>{formData.email}</b></p>}
        </div>
        
        {/* HIDE ROLE SWITCHER IF OTP SENT */}
        {!otpSent && (
            <div className="role-switcher">
              <div className={`role-tab ${role === 'patient' ? 'active' : ''}`} onClick={() => setRole('patient')}>
                <User size={18} /> Patient
              </div>
              <div className={`role-tab ${role === 'therapist' ? 'active' : ''}`} onClick={() => setRole('therapist')}>
                <Stethoscope size={18} /> Therapist
              </div>
            </div>
        )}

        {message && <div style={{color: otpSent && !message.includes('failed') ? '#2e7d32' : '#d32f2f', background: otpSent && !message.includes('failed') ? '#e8f5e9' : '#ffebee', padding: '10px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem'}}>{message}</div>}

        {!otpSent ? (
            <form onSubmit={handleSendOtp}>
                <div className="input-group"><User size={20} className="input-icon" /><input className="auth-input" type="text" placeholder="Full Name" required onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                <div className="input-group"><Mail size={20} className="input-icon" /><input className="auth-input" type="email" placeholder="Email Address" required onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                {role === 'therapist' && (<div className="input-group"><ShieldCheck size={20} className="input-icon" /><input className="auth-input" type="text" placeholder="Medical License ID" required onChange={(e) => setFormData({...formData, licenseId: e.target.value})} /></div>)}
                <div className="input-group"><Lock size={20} className="input-icon" /><input className="auth-input" type="password" placeholder="Create Password" required onChange={(e) => setFormData({...formData, password: e.target.value})} /></div>
                
                <button 
                    type="submit" 
                    className="auth-btn"
                    disabled={isLoading}
                    style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                    {isLoading ? (
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                <Loader2 size={18} />
                            </motion.div>
                            Sending Code...
                        </div>
                    ) : "Verify Email & Signup"}
                </button>
            </form>
        ) : (
            <div>
                {/* NEW OTP COMPONENT */}
                <OTPInput 
                    length={6} 
                    onComplete={(val) => {
                        setOtp(val);
                        // Optional: Auto submit on complete
                        // handleVerifyAndSignup(val); 
                    }} 
                />
                
                <button 
                    onClick={() => handleVerifyAndSignup(otp)} 
                    className="auth-btn"
                    disabled={isLoading}
                    style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                    {isLoading ? (
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                <Loader2 size={18} />
                            </motion.div>
                            Verifying...
                        </div>
                    ) : "Confirm OTP"}
                </button>
                
                <div style={{marginTop: '20px', textAlign: 'center'}}>
                    <button 
                        onClick={() => { setOtpSent(false); setMessage(''); setIsLoading(false); }} 
                        disabled={isLoading}
                        style={{background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'}}
                    >
                        <ArrowLeft size={16} /> Wrong Email? Go Back
                    </button>
                </div>
            </div>
        )}

        {!otpSent && (
            <>
                <div className="or-divider">OR</div>
                <GoogleButton onClick={() => googleSignup()} disabled={isLoading} />
                <div className="auth-footer">
                    Already have an account? <Link to="/auth/login" className="auth-link">Log In</Link>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

const pageStyle = { padding: '40px', textAlign: 'center', color: '#666' };
export const Onboarding = () => (<div style={pageStyle}><h1>Welcome Aboard!</h1><Link to="/profile/overview" className="auth-link">Continue to Dashboard</Link></div>);
export const ProfileOverview = () => <div style={pageStyle}><h1>Profile Overview</h1><p>Coming Soon</p></div>;
export const MedicalInfo = () => <div style={pageStyle}><h1>Medical Info</h1><p>Coming Soon</p></div>;
export const Preferences = () => <div style={pageStyle}><h1>Preferences</h1><p>Coming Soon</p></div>;
export const MyPrograms = () => <div style={pageStyle}><h1>My Programs</h1><p>Coming Soon</p></div>;
export const CustomProgram = () => <div style={pageStyle}><h1>Custom Program</h1><p>Coming Soon</p></div>;
export const AccuracyGraphs = () => <div style={pageStyle}><h1>Accuracy Analytics</h1><p>Coming Soon</p></div>;
export const RiskPrediction = () => <div style={pageStyle}><h1>Risk Prediction</h1><p>Coming Soon</p></div>;
export const Achievements = () => <div style={pageStyle}><h1>Achievements</h1><p>Coming Soon</p></div>;
export const Challenges = () => <div style={pageStyle}><h1>Challenges</h1><p>Coming Soon</p></div>;
export const TherapistModule = () => <div style={pageStyle}><h1>Find a Therapist</h1><p>Coming Soon</p></div>;
export const FAQ = () => <div style={pageStyle}><h1>FAQ</h1><p>Coming Soon</p></div>;
export const Contact = () => <div style={pageStyle}><h1>Contact Support</h1><p>Coming Soon</p></div>;
export const Legal = () => <div style={pageStyle}><h1>Legal</h1><p>Coming Soon</p></div>;
export const ExerciseDetail = () => <div style={pageStyle}><h1>Exercise Detail</h1><p>Coming Soon</p></div>;