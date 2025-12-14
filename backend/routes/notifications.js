// routes/notifications.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');

// GET /api/notifications
// List notifications for logged-in therapist
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Notification.find({ therapist: req.user.id })
      .populate('patient', 'email')
      .sort({ createdAt: -1 })
      .limit(50); // latest 50

    res.json(notes);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
});

// PATCH /api/notifications/:id/read
// Mark a notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const note = await Notification.findOneAndUpdate(
      { _id: req.params.id, therapist: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json(note);
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ message: 'Server error updating notification.' });
  }
});

module.exports = router;
