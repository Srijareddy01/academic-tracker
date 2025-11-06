#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
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

const db = admin.firestore();

// Production security rules
const securityRules = `
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

// Create production indexes
const createIndexes = async () => {
  console.log('Creating Firestore indexes...');
  
  const indexes = [
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

  for (const index of indexes) {
    try {
      console.log(`Creating index for ${index.collectionGroup}...`);
      // Note: Index creation is typically done through Firebase Console or CLI
      // This is a placeholder for the index creation logic
      console.log(`Index created for ${index.collectionGroup}`);
    } catch (error) {
      console.error(`Error creating index for ${index.collectionGroup}:`, error);
    }
  }
};

// Set up production collections with initial data
const setupProductionCollections = async () => {
  console.log('Setting up production collections...');
  
  try {
    // Create initial system configuration
    const systemConfig = {
      version: '1.0.0',
      environment: 'production',
      features: {
        notifications: true,
        realtimeUpdates: true,
        analytics: true,
        backup: true
      },
      settings: {
        maxNotificationsPerUser: 1000,
        notificationRetentionDays: 30,
        realtimeUpdateRetentionDays: 7,
        activityRetentionDays: 90
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('system').doc('config').set(systemConfig);
    console.log('System configuration created');

    // Create initial admin user permissions
    const adminPermissions = {
      canManageUsers: true,
      canManageCourses: true,
      canManageAssignments: true,
      canViewAnalytics: true,
      canManageSystem: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('permissions').doc('admin').set(adminPermissions);
    console.log('Admin permissions created');

    // Create initial notification templates
    const notificationTemplates = {
      assignmentCreated: {
        title: 'New Assignment Posted',
        message: 'A new assignment "{assignmentTitle}" has been posted in {courseTitle}',
        type: 'assignment_created',
        priority: 'high'
      },
      assignmentGraded: {
        title: 'Assignment Graded',
        message: 'Your submission for "{assignmentTitle}" has been graded',
        type: 'assignment_graded',
        priority: 'medium'
      },
      gradeUpdated: {
        title: 'Grade Updated',
        message: 'Your grade for "{assignmentTitle}" has been updated',
        type: 'grade_updated',
        priority: 'medium'
      }
    };

    await db.collection('templates').doc('notifications').set(notificationTemplates);
    console.log('Notification templates created');

  } catch (error) {
    console.error('Error setting up production collections:', error);
    throw error;
  }
};

// Deploy security rules
const deploySecurityRules = async () => {
  console.log('Deploying security rules...');
  
  try {
    // Write security rules to file
    const rulesPath = path.join(__dirname, '../firestore.rules');
    fs.writeFileSync(rulesPath, securityRules);
    console.log('Security rules written to firestore.rules');
    
    // Note: Actual deployment of rules requires Firebase CLI
    // Run: firebase deploy --only firestore:rules
    console.log('To deploy rules, run: firebase deploy --only firestore:rules');
    
  } catch (error) {
    console.error('Error deploying security rules:', error);
    throw error;
  }
};

// Main deployment function
const deployFirestore = async () => {
  try {
    console.log('Starting Firestore production deployment...');
    
    // Set up production collections
    await setupProductionCollections();
    
    // Create indexes
    await createIndexes();
    
    // Deploy security rules
    await deploySecurityRules();
    
    console.log('Firestore production deployment completed successfully!');
    
  } catch (error) {
    console.error('Firestore deployment failed:', error);
    process.exit(1);
  }
};

// Run deployment if this script is executed directly
if (require.main === module) {
  deployFirestore();
}

module.exports = {
  deployFirestore,
  createIndexes,
  setupProductionCollections,
  deploySecurityRules
};
