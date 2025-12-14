// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['PROTOCOL_ASSIGNED', 'SESSION_RECORDED'],
    required: true
  },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  metadata: { type: Object, default: {} }, // e.g. protocolId, sessionId, qualityScore
  isRead: { type: Boolean, default: false }
});

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
module.exports = Notification;
