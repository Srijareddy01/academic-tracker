const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { fetchAllCodingData } = require('../services/codingPlatformService');
const mongoose = require('mongoose');

// Initialize Firebase Admin with better error handling
let admin;
let firebaseInitialized = false;

try {
  // Initialize Firestore first
  const { getFirestore } = require('../config/firestore');
  getFirestore();
  
  admin = require('firebase-admin');
  
  // Check if Firebase is already initialized
  if (admin.apps.length === 0) {
    // Validate required environment variables
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.error('Missing required Firebase environment variables');
      throw new Error('Missing Firebase configuration');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('Firebase Admin initialized successfully');
  } else {
    console.log('Firebase Admin already initialized');
  }
  
  firebaseInitialized = true;
} catch (error) {
  console.error('Firebase Admin initialization failed:', error);
  firebaseInitialized = false;
}

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Check if Firebase is properly initialized
    if (!firebaseInitialized || !admin || !admin.auth) {
      console.error('Firebase Admin not properly initialized');
      return res.status(500).json({ message: 'Authentication service not available' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ message: 'Invalid token format' });
    } else if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.code === 'auth/argument-error') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Token verification failed', error: error.message });
  }
};

// Register/Login user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('firstName').trim().isLength({ min: 1, max: 50 }),
  body('lastName').trim().isLength({ min: 1, max: 50 }),
  body('role').isIn(['instructor', 'student']),
  body('firebaseUid').notEmpty(),
  body('batch').optional().trim(),
  body('studentId').optional().trim() // Add validation for studentId
], async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database connection not available',
        error: 'Service temporarily unavailable due to database connection issues'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, firstName, lastName, role, firebaseUid, institution, department, studentId, batch } = req.body;

    // Check if user already exists using findOne to avoid validation issues
    let user = await User.findOne({ firebaseUid: firebaseUid });
    
    if (user && user.isActive) {
      // Update last login without triggering validation
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
      
      return res.json({
        message: 'User already exists, logged in successfully',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profilePicture: user.profilePicture
        }
      });
    }

    // Create new user
    user = new User({
      firebaseUid,
      email,
      firstName,
      lastName,
      role,
      institution: institution || '',
      department: department || '',
      studentId: studentId || '',
      batch: batch || ''
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePicture: user.profilePicture,
        batch: user.batch,
        studentId: user.studentId // Include studentId in response
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Get current user profile
router.get('/profile', verifyFirebaseToken, async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database connection not available',
        error: 'Service temporarily unavailable due to database connection issues'
      });
    }

    // Use findOne instead of findByFirebaseUid to avoid validation issues
    const user = await User.findOne({ firebaseUid: req.user.uid, isActive: true });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update last login without triggering validation
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Handle invalid theme values gracefully
    let theme = user.preferences?.theme || 'system';
    if (!['light', 'dark', 'system'].includes(theme)) {
      theme = 'system'; // Default to 'system' if invalid value
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePicture: user.profilePicture,
        bio: user.bio,
        institution: user.institution,
        department: user.department,
        studentId: user.studentId,
        batch: user.batch,
        preferences: {
          theme: theme,
          notifications: user.preferences?.notifications || {
            email: true,
            push: true
          }
        },
        codingProfiles: user.codingProfiles,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

// Update user profile
router.put('/profile', verifyFirebaseToken, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('bio').optional().isLength({ max: 500 }),
  body('institution').optional().trim(),
  body('department').optional().trim(),
  body('studentId').optional().trim(), // Ensure validation for studentId
  body('batch').optional().trim()
], async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database connection not available',
        error: 'Service temporarily unavailable due to database connection issues'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { firstName, lastName, bio, institution, department, studentId, batch, preferences, codingProfiles } = req.body;

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    if (institution !== undefined) user.institution = institution;
    if (department !== undefined) user.department = department;
    if (studentId !== undefined) user.studentId = studentId; // Properly handle studentId updates
    if (batch !== undefined) user.batch = batch;
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }
    if (codingProfiles) {
      // Update coding profiles
      Object.keys(codingProfiles).forEach(platform => {
        if (user.codingProfiles[platform]) {
          user.codingProfiles[platform].url = codingProfiles[platform].url || '';
          // Only update data if provided
          if (codingProfiles[platform].data) {
            user.codingProfiles[platform].data = {
              ...user.codingProfiles[platform].data,
              ...codingProfiles[platform].data
            };
          }
          user.codingProfiles[platform].lastUpdated = new Date();
        }
      });
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePicture: user.profilePicture,
        bio: user.bio,
        institution: user.institution,
        department: user.department,
        studentId: user.studentId, // Include studentId in response
        batch: user.batch,
        preferences: user.preferences,
        codingProfiles: user.codingProfiles
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

// Upload profile picture
router.post('/profile-picture', verifyFirebaseToken, async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database connection not available',
        error: 'Service temporarily unavailable due to database connection issues'
      });
    }

    const { profilePictureUrl } = req.body;
    
    if (!profilePictureUrl) {
      return res.status(400).json({ message: 'Profile picture URL is required' });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePicture = profilePictureUrl;
    await user.save();

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Profile picture update error:', error);
    res.status(500).json({ message: 'Failed to update profile picture', error: error.message });
  }
});

// Delete user account
router.delete('/account', verifyFirebaseToken, async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database connection not available',
        error: 'Service temporarily unavailable due to database connection issues'
      });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete - deactivate account
    user.isActive = false;
    await user.save();

    res.json({ message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
});

// Fetch coding profile data from external platforms
router.get('/profile/coding-data', verifyFirebaseToken, async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database connection not available',
        error: 'Service temporarily unavailable due to database connection issues'
      });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch fresh data from coding platforms
    const freshData = await fetchAllCodingData(user.codingProfiles);
    
    // Update user's coding profile data
    Object.keys(freshData).forEach(platform => {
      if (user.codingProfiles[platform]) {
        user.codingProfiles[platform].data = freshData[platform];
        user.codingProfiles[platform].lastUpdated = new Date();
      }
    });
    
    // Save updated data
    await user.save();
    
    res.json({
      codingProfiles: user.codingProfiles
    });
  } catch (error) {
    console.error('Coding profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch coding profile data', error: error.message });
  }
});

// Manually trigger fetching of coding data
router.post('/profile/coding-data/refresh', verifyFirebaseToken, async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database connection not available',
        error: 'Service temporarily unavailable due to database connection issues'
      });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch fresh data from coding platforms
    const freshData = await fetchAllCodingData(user.codingProfiles);
    
    // Update user's coding profile data
    Object.keys(freshData).forEach(platform => {
      if (user.codingProfiles[platform]) {
        user.codingProfiles[platform].data = freshData[platform];
        user.codingProfiles[platform].lastUpdated = new Date();
      }
    });
    
    // Save updated data
    await user.save();
    
    res.json({
      message: 'Coding profile data refreshed successfully',
      codingProfiles: user.codingProfiles
    });
  } catch (error) {
    console.error('Coding profile refresh error:', error);
    res.status(500).json({ message: 'Failed to refresh coding profile data', error: error.message });
  }
});

module.exports = router;