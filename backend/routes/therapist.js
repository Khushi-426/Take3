// routes/therapist.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Protocol = require('../models/Protocol');
const Session = require('../models/Session');

// GET /api/therapist/patients
router.get('/patients', auth, async (req, res) => {
  try {
    // 1. All patients
    const patients = await User.find({ role: 'PATIENT' }).select('-password');

    // 2. Active protocols for this therapist
    const protocols = await Protocol.find({
      therapist: req.user.id,
      isActive: true
    });

    // 3. All sessions for these patients with this therapist
    const patientIds = patients.map(p => p._id);
    const sessions = await Session.find({
      patient: { $in: patientIds },
      therapist: req.user.id
    });

    // Index by patient
    const protocolByPatient = {};
    protocols.forEach(p => {
      protocolByPatient[p.patient.toString()] = p;
    });

    const sessionsByPatient = {};
    sessions.forEach(s => {
      const pid = s.patient.toString();
      if (!sessionsByPatient[pid]) sessionsByPatient[pid] = [];
      sessionsByPatient[pid].push(s);
    });

    const result = patients.map(p => {
      const pid = p._id.toString();
      const protocol = protocolByPatient[pid] || null;
      const sessList = sessionsByPatient[pid] || [];

      const totalSessions = sessList.length;
      const completedSessions = sessList.filter(s => s.completed).length;

      const completionRate =
        totalSessions === 0 ? 0 : Math.round((completedSessions / totalSessions) * 100);

      const avgQuality =
        completedSessions === 0
          ? null
          : Math.round(
              sessList
                .filter(s => s.completed && typeof s.qualityScore === 'number')
                .reduce((sum, s) => sum + s.qualityScore, 0) /
                completedSessions
            );

      const nonCompliant = completionRate < 60 && totalSessions >= 3; // tweak as needed
      const lowScore = avgQuality !== null && avgQuality < 60;

      return {
        _id: p._id,
        email: p.email,
        role: p.role,
        createdAt: p.createdAt,
        hasActiveProtocol: !!protocol,
        activeProtocol: protocol
          ? {
              protocolId: protocol._id,
              sets: protocol.sets,
              reps: protocol.reps,
              difficulty: protocol.difficulty
            }
          : null,
        totalSessions,
        completedSessions,
        completionRate, // 0–100
        avgQuality,     // null if no completed sessions
        flags: {
          nonCompliant,
          lowScore
        }
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Get patients roster error:', err);
    res.status(500).json({ message: 'Server error fetching patient roster.' });
  }
});

// GET /api/therap ist/patient/:patientId/overview
router.get('/patient/:patientId/overview', auth, async (req, res) => {
  const { patientId } = req.params;

  try {
    // 1. Patient info
    const patient = await User.findById(patientId).select('-password');
    if (!patient || patient.role !== 'PATIENT') {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // 2. Active protocol between this therapist and patient
    const protocol = await Protocol.findOne({
      therapist: req.user.id,
      patient: patientId,
      isActive: true
    });

    // 3. All sessions for this patient & therapist
    const sessions = await Session.find({
      patient: patientId,
      therapist: req.user.id
    }).sort({ performedAt: -1 });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.completed).length;

    const completionRate =
      totalSessions === 0 ? 0 : Math.round((completedSessions / totalSessions) * 100);

    const completedWithScore = sessions.filter(
      s => s.completed && typeof s.qualityScore === 'number'
    );

    const avgQuality =
      completedWithScore.length === 0
        ? null
        : Math.round(
            completedWithScore.reduce((sum, s) => sum + s.qualityScore, 0) /
              completedWithScore.length
          );

    const nonCompliant = completionRate < 60 && totalSessions >= 3;
    const lowScore = avgQuality !== null && avgQuality < 60;

    res.json({
      patient,
      protocol: protocol || null,
      stats: {
        totalSessions,
        completedSessions,
        completionRate,
        avgQuality,
        flags: {
          nonCompliant,
          lowScore
        }
      },
      sessions // full list for timeline / detailed view
    });
  } catch (err) {
    console.error('Patient overview error:', err);
    res.status(500).json({ message: 'Server error fetching patient overview.' });
  }
});

module.exports = router;
