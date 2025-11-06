const admin = require('firebase-admin');

// Production Firestore configuration
const productionConfig = {
  // Firestore settings for production
  firestore: {
    // Enable offline persistence
    cacheSizeBytes: admin.firestore.CACHE_SIZE_UNLIMITED,
    // Ignore undefined properties
    ignoreUndefinedProperties: true,
    // Production-specific settings
    settings: {
      // Enable retry logic
      maxRetries: 3,
      // Connection timeout
      timeout: 30000,
      // Enable connection pooling
      poolSize: 10
    }
  },
  
  // Security rules for production
  securityRules: {
    // Enable Firestore security rules
    enableSecurityRules: true,
    // Rate limiting
    rateLimiting: {
      enabled: true,
      maxRequestsPerMinute: 100,
      maxRequestsPerHour: 1000
    }
  },
  
  // Monitoring and logging
  monitoring: {
    // Enable performance monitoring
    enablePerformanceMonitoring: true,
    // Enable error reporting
    enableErrorReporting: true,
    // Log levels
    logLevel: 'info',
    // Enable request logging
    enableRequestLogging: true
  },
  
  // Backup and recovery
  backup: {
    // Enable automatic backups
    enableAutoBackup: true,
    // Backup frequency (in hours)
    backupFrequency: 24,
    // Retention period (in days)
    retentionDays: 30
  }
};

// Initialize production Firestore
const initializeProductionFirestore = () => {
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
  
  const db = admin.firestore();
  
  // Apply production settings
  db.settings(productionConfig.firestore.settings);
  
  return db;
};

// Production security rules
const productionSecurityRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Notifications - users can only read their own
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Real-time updates - users can only read their own
    match /realtime_updates/{updateId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // User activity - users can only write their own
    match /user_activity/{activityId} {
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Course analytics - instructors can read/write
    match /course_analytics/{courseId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.instructorId || 
         request.auth.uid in resource.data.instructors);
    }
    
    // Assignment progress - instructors can read/write
    match /assignment_progress/{assignmentId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.instructorId || 
         request.auth.uid in resource.data.instructors);
    }
  }
}
`;

// Production indexes
const productionIndexes = [
  {
    collectionGroup: 'notifications',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'notifications',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'read', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'realtime_updates',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'user_activity',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  }
];

module.exports = {
  productionConfig,
  initializeProductionFirestore,
  productionSecurityRules,
  productionIndexes
};
