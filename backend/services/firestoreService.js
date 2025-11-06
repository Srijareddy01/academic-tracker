const { getFirestore, COLLECTIONS, UPDATE_TYPES, NOTIFICATION_TYPES } = require('../config/firestore');

class FirestoreService {
  constructor() {
    this.db = getFirestore();
  }

  // Real-time updates
  async createRealtimeUpdate(userId, type, data, metadata = {}) {
    try {
      const updateDoc = {
        userId,
        type,
        data,
        metadata,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      };

      await this.db.collection(COLLECTIONS.REALTIME_UPDATES).add(updateDoc);
      
      // Also create a notification if needed
      if (this.shouldCreateNotification(type)) {
        await this.createNotification(userId, type, data, metadata);
      }
    } catch (error) {
      console.error('Error creating realtime update:', error);
      throw error;
    }
  }

  // Notifications
  async createNotification(userId, type, data, metadata = {}) {
    try {
      const notification = {
        userId,
        type,
        title: this.getNotificationTitle(type, data),
        message: this.getNotificationMessage(type, data),
        data,
        metadata,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: this.getExpirationTime(type)
      };

      const docRef = await this.db.collection(COLLECTIONS.NOTIFICATIONS).add(notification);
      
      // Send push notification if user has push notifications enabled
      await this.sendPushNotification(userId, notification);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 50, startAfter = null) {
    try {
      let query = this.db.collection(COLLECTIONS.NOTIFICATIONS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      await this.db.collection(COLLECTIONS.NOTIFICATIONS)
        .doc(notificationId)
        .update({ read: true, readAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId) {
    try {
      const batch = this.db.batch();
      const notifications = await this.db.collection(COLLECTIONS.NOTIFICATIONS)
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      notifications.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // User activity tracking
  async trackUserActivity(userId, activity, metadata = {}) {
    try {
      const activityDoc = {
        userId,
        activity,
        metadata,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: metadata.ip || null,
        userAgent: metadata.userAgent || null
      };

      await this.db.collection(COLLECTIONS.USER_ACTIVITY).add(activityDoc);
    } catch (error) {
      console.error('Error tracking user activity:', error);
      // Don't throw error for activity tracking failures
    }
  }

  // Course analytics
  async updateCourseAnalytics(courseId, analytics) {
    try {
      const analyticsDoc = {
        courseId,
        ...analytics,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection(COLLECTIONS.COURSE_ANALYTICS)
        .doc(courseId)
        .set(analyticsDoc, { merge: true });
    } catch (error) {
      console.error('Error updating course analytics:', error);
      throw error;
    }
  }

  // Assignment progress tracking
  async updateAssignmentProgress(assignmentId, progress) {
    try {
      const progressDoc = {
        assignmentId,
        ...progress,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection(COLLECTIONS.ASSIGNMENT_PROGRESS)
        .doc(assignmentId)
        .set(progressDoc, { merge: true });
    } catch (error) {
      console.error('Error updating assignment progress:', error);
      throw error;
    }
  }

  // Cleanup expired notifications
  async cleanupExpiredNotifications() {
    try {
      const expiredNotifications = await this.db.collection(COLLECTIONS.NOTIFICATIONS)
        .where('expiresAt', '<', admin.firestore.FieldValue.serverTimestamp())
        .get();

      const batch = this.db.batch();
      expiredNotifications.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return expiredNotifications.size;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  // Helper methods
  shouldCreateNotification(type) {
    const notificationTypes = [
      UPDATE_TYPES.ASSIGNMENT_CREATED,
      UPDATE_TYPES.SUBMISSION_GRADED,
      UPDATE_TYPES.GRADE_UPDATED
    ];
    return notificationTypes.includes(type);
  }

  getNotificationTitle(type, data) {
    const titles = {
      [UPDATE_TYPES.ASSIGNMENT_CREATED]: 'New Assignment Posted',
      [UPDATE_TYPES.SUBMISSION_GRADED]: 'Assignment Graded',
      [UPDATE_TYPES.GRADE_UPDATED]: 'Grade Updated',
      [UPDATE_TYPES.COURSE_ENROLLMENT]: 'Course Enrollment',
      [UPDATE_TYPES.COURSE_DROPPED]: 'Course Dropped'
    };
    return titles[type] || 'System Notification';
  }

  getNotificationMessage(type, data) {
    const messages = {
      [UPDATE_TYPES.ASSIGNMENT_CREATED]: `A new assignment "${data.title}" has been posted in ${data.courseTitle}`,
      [UPDATE_TYPES.SUBMISSION_GRADED]: `Your submission for "${data.assignmentTitle}" has been graded`,
      [UPDATE_TYPES.GRADE_UPDATED]: `Your grade for "${data.assignmentTitle}" has been updated`,
      [UPDATE_TYPES.COURSE_ENROLLMENT]: `You have been enrolled in ${data.courseTitle}`,
      [UPDATE_TYPES.COURSE_DROPPED]: `You have been dropped from ${data.courseTitle}`
    };
    return messages[type] || 'You have a new notification';
  }

  getExpirationTime(type) {
    const now = new Date();
    const expirationDays = {
      [UPDATE_TYPES.ASSIGNMENT_CREATED]: 7,
      [UPDATE_TYPES.SUBMISSION_GRADED]: 30,
      [UPDATE_TYPES.GRADE_UPDATED]: 30,
      [UPDATE_TYPES.COURSE_ENROLLMENT]: 7,
      [UPDATE_TYPES.COURSE_DROPPED]: 7
    };
    
    const days = expirationDays[type] || 7;
    return new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  }

  async sendPushNotification(userId, notification) {
    try {
      // This would integrate with Firebase Cloud Messaging (FCM)
      // For now, we'll just log the notification
      console.log(`Push notification for user ${userId}:`, notification.title);
      
      // TODO: Implement FCM integration
      // const messaging = admin.messaging();
      // await messaging.sendToDevice(userToken, {
      //   notification: {
      //     title: notification.title,
      //     body: notification.message
      //   }
      // });
    } catch (error) {
      console.error('Error sending push notification:', error);
      // Don't throw error for push notification failures
    }
  }
}

module.exports = new FirestoreService();
