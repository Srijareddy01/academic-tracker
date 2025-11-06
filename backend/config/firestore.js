const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
let firestore = null;

const initializeFirestore = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: process.env.FIREBASE_AUTH_URI,
        tokenUri: process.env.FIREBASE_TOKEN_URI,
      }),
    });
  }
  
  firestore = admin.firestore();
  
  // Configure Firestore settings for production
  if (process.env.NODE_ENV === 'production') {
    // Set up production-specific settings
    firestore.settings({
      ignoreUndefinedProperties: true,
      // Enable offline persistence for better performance
      cacheSizeBytes: admin.firestore.CACHE_SIZE_UNLIMITED,
    });
  }
  
  return firestore;
};

// Get Firestore instance
const getFirestore = () => {
  if (!firestore) {
    return initializeFirestore();
  }
  return firestore;
};

// Firestore collections
const COLLECTIONS = {
  NOTIFICATIONS: 'notifications',
  REALTIME_UPDATES: 'realtime_updates',
  USER_ACTIVITY: 'user_activity',
  COURSE_ANALYTICS: 'course_analytics',
  ASSIGNMENT_PROGRESS: 'assignment_progress'
};

// Real-time update types
const UPDATE_TYPES = {
  ASSIGNMENT_CREATED: 'assignment_created',
  ASSIGNMENT_UPDATED: 'assignment_updated',
  ASSIGNMENT_DELETED: 'assignment_deleted',
  SUBMISSION_CREATED: 'submission_created',
  SUBMISSION_GRADED: 'submission_graded',
  GRADE_UPDATED: 'grade_updated',
  COURSE_ENROLLMENT: 'course_enrollment',
  COURSE_DROPPED: 'course_dropped'
};

// Notification types
const NOTIFICATION_TYPES = {
  ASSIGNMENT_DUE: 'assignment_due',
  ASSIGNMENT_GRADED: 'assignment_graded',
  GRADE_POSTED: 'grade_posted',
  COURSE_UPDATE: 'course_update',
  SYSTEM_ANNOUNCEMENT: 'system_announcement'
};

module.exports = {
  getFirestore,
  initializeFirestore,
  COLLECTIONS,
  UPDATE_TYPES,
  NOTIFICATION_TYPES
};
