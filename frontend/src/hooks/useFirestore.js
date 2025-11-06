import { useState, useEffect, useCallback } from 'react';
import firestoreService from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

// Hook for real-time notifications
export const useNotifications = (limit = 50) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = firestoreService.subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        setLoading(false);
      },
      limit
    );

    return () => unsubscribe();
  }, [user, limit]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await firestoreService.markNotificationAsRead(notificationId);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await firestoreService.markAllNotificationsAsRead(user.uid);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await firestoreService.deleteNotification(notificationId);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};

// Hook for real-time updates
export const useRealtimeUpdates = (limit = 20) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setUpdates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = firestoreService.subscribeToRealtimeUpdates(
      user.uid,
      (newUpdates) => {
        setUpdates(newUpdates);
        setLoading(false);
      },
      limit
    );

    return () => unsubscribe();
  }, [user, limit]);

  return {
    updates,
    loading,
    error
  };
};

// Hook for user activity tracking
export const useUserActivity = () => {
  const { user } = useAuth();

  const trackActivity = useCallback(async (activity, metadata = {}) => {
    if (!user) return;

    try {
      await firestoreService.trackUserActivity(user.uid, activity, {
        ...metadata,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking user activity:', error);
    }
  }, [user]);

  return { trackActivity };
};

// Hook for course analytics
export const useCourseAnalytics = (courseId) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseId) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await firestoreService.getCourseAnalytics(courseId);
        setAnalytics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [courseId]);

  return { analytics, loading, error };
};

// Hook for assignment progress
export const useAssignmentProgress = (assignmentId) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!assignmentId) {
      setProgress(null);
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await firestoreService.getAssignmentProgress(assignmentId);
        setProgress(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [assignmentId]);

  return { progress, loading, error };
};

// Hook for system configuration
export const useSystemConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await firestoreService.getSystemConfig();
        setConfig(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
};
