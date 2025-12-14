// config/db.js

const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

const url = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(url, {
      dbName: 'physiocheck_db'   // <-- use this database
    });
    console.log('Database connected successfully to physiocheck_db.');
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
