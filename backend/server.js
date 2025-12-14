// server.js

const express = require('express');
const connectDB = require('./config/db'); 
const authRoutes = require('./routes/auth'); 
const protocolRoutes = require('./routes/protocols');
const therapistRoutes = require('./routes/therapist');
const sessionRoutes = require('./routes/sessions');
const notificationRoutes = require('./routes/notifications');

// We are skipping therapistRoutes and patientRoutes for now to focus on the fix.

// 1. Load environment variables (CRUCIAL: Must be the very first line after requires)
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 5000;

// 2. Connect to Database
connectDB();

// 3. Middleware
app.use(express.json()); // Allows the server to accept JSON data in the request body

// 4. Define Main Routes
app.use('/api/auth', authRoutes); 
app.use('/api/protocols', protocolRoutes);
app.use('/api/therapist', therapistRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/notifications', notificationRoutes);

// Basic Test Route (Optional)
app.get('/', (req, res) => {
    res.send('Rehabilitation Backend API is running.');
});

// 5. Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});