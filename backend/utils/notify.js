// utils/notify.js
const Notification = require('../models/Notification');

async function createNotification({ therapistId, patientId, type, message }) {
  try {
    const notif = new Notification({
      therapist: therapistId,
      patient: patientId,
      type,
      message
    });
    await notif.save();
  } catch (err) {
    console.error('Notification save error:', err);
  }
}

module.exports = { createNotification };
