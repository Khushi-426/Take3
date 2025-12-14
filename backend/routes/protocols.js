// routes/protocols.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Protocol = require('../models/Protocol');
const User = require('../models/User');
const Notification = require('../models/Notification');
// const { createNotification } = require('../utils/notify'); // use later if needed

// POST /api/protocols/assign
router.post('/assign', auth, async (req, res) => {
  const { patientId, sets, reps, difficulty } = req.body;

  if (!patientId || !sets || !reps || !difficulty) {
    return res
      .status(400)
      .json({ message: 'patientId, sets, reps, difficulty are required.' });
  }

  try {
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'PATIENT') {
      return res.status(400).json({ message: 'Invalid patient.' });
    }

    // deactivate previous active protocol for this patient & therapist
    await Protocol.updateMany(
      { patient: patientId, therapist: req.user.id, isActive: true },
      { isActive: false }
    );

    const protocol = new Protocol({
      therapist: req.user.id,
      patient: patientId,
      sets,
      reps,
      difficulty,
      exerciseName: 'SingleExercise'
    });

    await protocol.save();

    // Create notification (single place, inside try, after save)
    await Notification.create({
      therapist: req.user.id,
      patient: patientId,
      type: 'PROTOCOL_ASSIGNED',
      message: `New protocol assigned: ${protocol.sets}x${protocol.reps} (${protocol.difficulty}).`,
      metadata: {
        protocolId: protocol._id,
        sets: protocol.sets,
        reps: protocol.reps,
        difficulty: protocol.difficulty
      }
    });

    // If you later want to use a helper:
    // await createNotification({ therapistId: req.user.id, patientId, type: 'PROTOCOL_ASSIGNED', ... });

    return res
      .status(201)
      .json({ message: 'Protocol assigned successfully.', protocol });
  } catch (err) {
    console.error('Assign protocol error:', err);
    return res
      .status(500)
      .json({ message: 'Server error during protocol assignment.', error: err.message });
  }
});

// GET /api/protocols/patient/:patientId
router.get('/patient/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;

  try {
    const protocol = await Protocol.findOne({
      patient: patientId,
      therapist: req.user.id,
      isActive: true
    });

    if (!protocol) {
      return res.status(404).json({ message: 'No active protocol for this patient.' });
    }

    return res.json(protocol);
  } catch (err) {
    console.error('Get protocol error:', err);
    return res.status(500).json({ message: 'Server error fetching protocol.' });
  }
});

// PUT /api/protocols/:id
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { sets, reps, difficulty } = req.body;

  try {
    const protocol = await Protocol.findOne({ _id: id, therapist: req.user.id });
    if (!protocol) {
      return res.status(404).json({ message: 'Protocol not found.' });
    }

    if (sets !== undefined) protocol.sets = sets;
    if (reps !== undefined) protocol.reps = reps;
    if (difficulty !== undefined) protocol.difficulty = difficulty;

    await protocol.save();
    return res.json({ message: 'Protocol updated successfully.', protocol });
  } catch (err) {
    console.error('Update protocol error:', err);
    return res
      .status(500)
      .json({ message: 'Server error updating protocol.' });
  }
});

module.exports = router;
