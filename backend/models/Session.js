// models/Session.js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  patient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  protocol:  { type: mongoose.Schema.Types.ObjectId, ref: 'Protocol', required: true },
  performedAt: { type: Date, default: Date.now },
  qualityScore: { type: Number, min: 0, max: 100 },
  completed: { type: Boolean, default: false },
  keyErrors: { type: [String], default: [] },
  videoUrl: { type: String } // your teammate will fill this from patient app
});

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
module.exports = Session;
