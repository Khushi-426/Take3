import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { ArrowLeft, TrendingUp, Activity, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.email) {
        try {
          const res = await axios.post('http://127.0.0.1:5000/api/user/analytics_detailed', { email: user.email });
          setData(res.data);
        } catch (err) {
          console.error("Analytics Error:", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [user]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F9F7F3', color: '#666' }}>
      <Activity className="spin" size={32} /> Loading Analytics...
    </div>
  );

  if (!data) return null;

  // --- Animation Variants ---
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  const COLORS = ['#2C5D31', '#69B341', '#FFBB28', '#FF8042', '#0088FE'];

  return (
    <div style={{ minHeight: '100vh', background: '#F9F7F3', padding: '40px 5%' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', color: '#1A3C34', fontWeight: '800', margin: 0 }}>Performance <span style={{color:'#69B341'}}>Analytics</span></h1>
            <p style={{ color: '#666', marginTop: '5px' }}>Deep dive into your recovery metrics and form consistency.</p>
          </div>
          <button 
            onClick={() => navigate('/profile/overview')} 
            style={{ 
                background: '#fff', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '30px',
                color: '#4A635D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
            }}
          >
            <ArrowLeft size={18} /> Back to Profile
          </button>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>

            {/* 1. Accuracy Trend (Line Chart) */}
            <motion.div variants={item} style={{ background: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', gridColumn: '1 / -1' }}>
                <h3 style={{ color: '#1A3C34', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TrendingUp size={20} color="#69B341"/> Form Accuracy Trend
                </h3>
                <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer>
                        <AreaChart data={data.history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#69B341" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#69B341" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="date_short" stroke="#999" tick={{fontSize: 12}} />
                            <YAxis stroke="#999" tick={{fontSize: 12}} domain={[0, 100]} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 5px 20px rgba(0,0,0,0.1)' }}
                            />
                            <Area type="monotone" dataKey="accuracy" stroke="#2C5D31" strokeWidth={3} fillOpacity={1} fill="url(#colorAccuracy)" name="Accuracy %" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* 2. Volume by Exercise (Bar Chart) */}
            <motion.div variants={item} style={{ background: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <h3 style={{ color: '#1A3C34', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={20} color="#69B341"/> Reps by Exercise
                </h3>
                <div style={{ height: '250px', width: '100%' }}>
                    <ResponsiveContainer>
                        <BarChart data={data.exercise_stats} layout="vertical">
                             <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                             <XAxis type="number" hide />
                             <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fontWeight: 600}} stroke="#666" />
                             <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                             <Bar dataKey="total_reps" fill="#2C5D31" radius={[0, 10, 10, 0]} barSize={20}>
                                {data.exercise_stats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                             </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* 3. Session Consistency (Bar Chart) */}
            <motion.div variants={item} style={{ background: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <h3 style={{ color: '#1A3C34', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={20} color="#69B341"/> Recent Volume
                </h3>
                <div style={{ height: '250px', width: '100%' }}>
                    <ResponsiveContainer>
                        <BarChart data={data.history.slice(-7)}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                             <XAxis dataKey="date_short" stroke="#999" tick={{fontSize: 10}} />
                             <YAxis stroke="#999" tick={{fontSize: 10}} />
                             <Tooltip contentStyle={{ borderRadius: '8px' }} />
                             <Bar dataKey="reps" fill="#1A3C34" radius={[4, 4, 0, 0]} name="Total Reps" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
            
            {/* 4. Insight Card */}
            <motion.div variants={item} style={{ background: 'linear-gradient(135deg, #1A3C34 0%, #2C5D31 100%)', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(44, 93, 49, 0.2)', color: 'white', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px', opacity: 0.9 }}>
                    <AlertCircle size={24} color="#69B341" />
                    <span style={{ fontWeight: 'bold', letterSpacing:'1px' }}>AI INSIGHT</span>
                </div>
                <h2 style={{ fontSize: '1.8rem', marginBottom:'10px' }}>
                    {data.average_accuracy > 85 ? "Excellent Form!" : "Focus Required"}
                </h2>
                <p style={{ opacity: 0.8, lineHeight: '1.6' }}>
                    Your average form accuracy is <strong>{data.average_accuracy}%</strong> across all exercises. 
                    {data.average_accuracy > 85 
                        ? " You are maintaining great stability. Consider increasing your rep volume." 
                        : " Try slowing down your reps to improve detection accuracy."}
                </p>
            </motion.div>

        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;