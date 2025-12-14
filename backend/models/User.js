// models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['THERAPIST', 'PATIENT'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// NO pre-save hook, passwords are stored as plain text

// Plain-text comparison for now
userSchema.methods.comparePassword = async function (candidatePassword) {
  return candidatePassword === this.password;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;
