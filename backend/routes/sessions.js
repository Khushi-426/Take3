// routes/sessions.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Session = require('../models/Session');
const Protocol = require('../models/Protocol');
const User = require('../models/User');
const { createNotification } = require('../utils/notify');

// POST /api/sessions
// Record a completed (or attempted) session for a patient
router.post('/', auth, async (req, res) => {
  const {
    patientId,
    protocolId,
    qualityScore,
    completed,
    keyErrors,
    videoUrl
  } = req.body;

  if (!patientId || !protocolId) {
    return res.status(400).json({ message: 'patientId and protocolId are required.' });
  }

  try {
    // Validate patient
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'PATIENT') {
      return res.status(400).json({ message: 'Invalid patient.' });
    }

    // Validate protocol and that it belongs to this therapist
    const protocol = await Protocol.findOne({
      _id: protocolId,
      therapist: req.user.id
    });

    if (!protocol) {
      return res.status(400).json({ message: 'Invalid protocol for this therapist.' });
    }

    const session = new Session({
      patient: patientId,
      therapist: req.user.id,
      protocol: protocolId,
      qualityScore: qualityScore ?? null,
      completed: completed ?? false,
      keyErrors: keyErrors || [],
      videoUrl: videoUrl || null
    });

    await session.save();
    res.status(201).json({ message: 'Session recorded successfully.', session });
  } catch (err) {
    console.error('Record session error:', err);
    res.status(500).json({ message: 'Server error while recording session.' });
  }

  await createNotification({
  therapistId: req.user.id,
  patientId,
  type: 'SESSION_RECORDED',
  message: `Session recorded with quality score ${session.qualityScore ?? 'N/A'}.`
});

});

// GET /api/sessions/patient/:patientId
// Get all sessions for a patient (for therapist review)
router.get('/patient/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;

  try {
    const sessions = await Session.find({
      patient: patientId,
      therapist: req.user.id
    }).sort({ performedAt: -1 });

    res.json(sessions);
  } catch (err) {
    console.error('Get patient sessions error:', err);
    res.status(500).json({ message: 'Server error fetching sessions.' });
  }
});

module.exports = router;
