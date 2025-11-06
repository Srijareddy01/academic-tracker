const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const firestoreService = require('../services/firestoreService');
const { verifyFirebaseToken } = require('../middleware/auth');

// Get user notifications
router.get('/notifications', verifyFirebaseToken, async (req, res) => {
  try {
    const { limit = 50, startAfter } = req.query;
    const userId = req.user.uid;
    
    const notifications = await firestoreService.getUserNotifications(
      userId, 
      parseInt(limit), 
      startAfter
    );
    
    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    await firestoreService.markNotificationAsRead(id);
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    await firestoreService.markAllNotificationsAsRead(userId);
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
});

// Delete notification
router.delete('/notifications/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../config/firestore').getFirestore();
    
    await db.collection('notifications').doc(id).delete();
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
});

// Get notification preferences
router.get('/notifications/preferences', verifyFirebaseToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ preferences: user.preferences.notifications });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ message: 'Failed to fetch notification preferences', error: error.message });
  }
});

// Update notification preferences
router.put('/notifications/preferences', verifyFirebaseToken, [
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
    console.error('Update notification preferences error:', error);
    res.status(500).json({ message: 'Failed to update notification preferences', error: error.message });
  }
});

// Track user activity
router.post('/activity', verifyFirebaseToken, [
  body('activity').notEmpty().trim(),
  body('metadata').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.uid;
    const { activity, metadata = {} } = req.body;
    
    // Add request metadata
    metadata.ip = req.ip;
    metadata.userAgent = req.get('User-Agent');
    
    await firestoreService.trackUserActivity(userId, activity, metadata);
    
    res.json({ message: 'Activity tracked successfully' });
  } catch (error) {
    console.error('Track activity error:', error);
    res.status(500).json({ message: 'Failed to track activity', error: error.message });
  }
});

// Get course analytics
router.get('/analytics/course/:courseId', verifyFirebaseToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const db = require('../config/firestore').getFirestore();
    
    const analyticsDoc = await db.collection('course_analytics').doc(courseId).get();
    
    if (!analyticsDoc.exists) {
      return res.status(404).json({ message: 'Course analytics not found' });
    }
    
    res.json({ analytics: analyticsDoc.data() });
  } catch (error) {
    console.error('Get course analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch course analytics', error: error.message });
  }
});

// Get assignment progress
router.get('/progress/assignment/:assignmentId', verifyFirebaseToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const db = require('../config/firestore').getFirestore();
    
    const progressDoc = await db.collection('assignment_progress').doc(assignmentId).get();
    
    if (!progressDoc.exists) {
      return res.status(404).json({ message: 'Assignment progress not found' });
    }
    
    res.json({ progress: progressDoc.data() });
  } catch (error) {
    console.error('Get assignment progress error:', error);
    res.status(500).json({ message: 'Failed to fetch assignment progress', error: error.message });
  }
});

// Cleanup expired notifications (admin only)
router.post('/cleanup/notifications', verifyFirebaseToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'instructor') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const deletedCount = await firestoreService.cleanupExpiredNotifications();
    
    res.json({ 
      message: 'Cleanup completed successfully',
      deletedCount 
    });
  } catch (error) {
    console.error('Cleanup notifications error:', error);
    res.status(500).json({ message: 'Failed to cleanup notifications', error: error.message });
  }
});

module.exports = router;
