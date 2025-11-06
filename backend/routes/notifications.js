const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyFirebaseToken } = require('../middleware/auth');

// This would typically integrate with Firebase Cloud Messaging (FCM)
// For now, we'll create a basic notification system

// Get user notifications
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    // In a real implementation, this would fetch from Firestore
    // For now, return mock data
    const notifications = [
      {
        id: '1',
        title: 'New Assignment Posted',
        message: 'A new assignment has been posted in CS101',
        type: 'assignment',
        courseId: 'course123',
        assignmentId: 'assignment456',
        timestamp: new Date(),
        read: false
      },
      {
        id: '2',
        title: 'Grade Posted',
        message: 'Your grade for Assignment 1 has been posted',
        type: 'grade',
        courseId: 'course123',
        assignmentId: 'assignment456',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        read: true
      }
    ];

    res.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', verifyFirebaseToken, async (req, res) => {
  try {
    // In a real implementation, this would update Firestore
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Notification read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

// Mark all notifications as read
router.put('/read-all', verifyFirebaseToken, async (req, res) => {
  try {
    // In a real implementation, this would update Firestore
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
});

// Delete notification
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    // In a real implementation, this would delete from Firestore
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Notification deletion error:', error);
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
});

// Get notification preferences
router.get('/preferences', verifyFirebaseToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ preferences: user.preferences.notifications });
  } catch (error) {
    console.error('Notification preferences fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch notification preferences', error: error.message });
  }
});

// Update notification preferences
router.put('/preferences', verifyFirebaseToken, [
  body('email').optional().isBoolean(),
  body('push').optional().isBoolean(),
  body('assignmentReminders').optional().isBoolean(),
  body('gradeUpdates').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const User = require('../models/User');
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { email, push, assignmentReminders, gradeUpdates } = req.body;

    if (email !== undefined) user.preferences.notifications.email = email;
    if (push !== undefined) user.preferences.notifications.push = push;
    if (assignmentReminders !== undefined) user.preferences.notifications.assignmentReminders = assignmentReminders;
    if (gradeUpdates !== undefined) user.preferences.notifications.gradeUpdates = gradeUpdates;

    await user.save();

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: user.preferences.notifications
    });
  } catch (error) {
    console.error('Notification preferences update error:', error);
    res.status(500).json({ message: 'Failed to update notification preferences', error: error.message });
  }
});

module.exports = router;
