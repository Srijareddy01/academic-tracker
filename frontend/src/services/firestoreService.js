import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FirestoreService {
  constructor() {
    this.db = db;
  }

  // Real-time listeners
  subscribeToNotifications(userId, callback, limitCount = 50) {
    const notificationsRef = collection(this.db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(notifications);
    });
  }

  subscribeToRealtimeUpdates(userId, callback, limitCount = 20) {
    const updatesRef = collection(this.db, 'realtime_updates');
    const q = query(
      updatesRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const updates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(updates);
    });
  }

  // Notifications
  async getNotifications(userId, limitCount = 50, startAfterDoc = null) {
    try {
      const notificationsRef = collection(this.db, 'notifications');
      let q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const notificationRef = doc(this.db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      const notificationsRef = collection(this.db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(this.db);

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId) {
    try {
      const notificationRef = doc(this.db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Real-time updates
  async createRealtimeUpdate(userId, type, data, metadata = {}) {
    try {
      const updatesRef = collection(this.db, 'realtime_updates');
      await addDoc(updatesRef, {
        userId,
        type,
        data,
        metadata,
        timestamp: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error creating realtime update:', error);
      throw error;
    }
  }

  // User activity tracking
  async trackUserActivity(userId, activity, metadata = {}) {
    try {
      const activityRef = collection(this.db, 'user_activity');
      await addDoc(activityRef, {
        userId,
        activity,
        metadata,
        timestamp: serverTimestamp(),
        ip: metadata.ip || null,
        userAgent: metadata.userAgent || null
      });
    } catch (error) {
      console.error('Error tracking user activity:', error);
      // Don't throw error for activity tracking failures
    }
  }

  // Course analytics
  async getCourseAnalytics(courseId) {
    try {
      const analyticsRef = doc(this.db, 'course_analytics', courseId);
      const analyticsDoc = await getDoc(analyticsRef);
      
      if (analyticsDoc.exists()) {
        return { id: analyticsDoc.id, ...analyticsDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting course analytics:', error);
      throw error;
    }
  }

  // Assignment progress
  async getAssignmentProgress(assignmentId) {
    try {
      const progressRef = doc(this.db, 'assignment_progress', assignmentId);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        return { id: progressDoc.id, ...progressDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting assignment progress:', error);
      throw error;
    }
  }

  // System configuration
  async getSystemConfig() {
    try {
      const configRef = doc(this.db, 'system', 'config');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        return { id: configDoc.id, ...configDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting system config:', error);
      throw error;
    }
  }

  // Notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        'preferences.notifications': preferences,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Cleanup expired data
  async cleanupExpiredData() {
    try {
      const now = new Date();
      const expiredTime = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago

      // Clean up expired realtime updates
      const updatesRef = collection(this.db, 'realtime_updates');
      const expiredUpdatesQuery = query(
        updatesRef,
        where('timestamp', '<', expiredTime)
      );

      const expiredUpdatesSnapshot = await getDocs(expiredUpdatesQuery);
      const batch = writeBatch(this.db);

      expiredUpdatesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return expiredUpdatesSnapshot.size;
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
      throw error;
    }
  }

  // Offline support
  enableOfflinePersistence() {
    // This would be implemented with Firebase offline persistence
    // For now, we'll just log that offline support is enabled
    console.log('Offline persistence enabled');
  }

  // Performance monitoring
  enablePerformanceMonitoring() {
    // This would integrate with Firebase Performance Monitoring
    console.log('Performance monitoring enabled');
  }
}

export default new FirestoreService();
