const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
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

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check if user is instructor
const requireInstructor = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'instructor') {
      return res.status(403).json({ message: 'Instructor access required' });
    }
    
    req.currentUser = user;
    next();
  } catch (error) {
    console.error('Instructor check error:', error);
    res.status(500).json({ message: 'Failed to verify instructor status' });
  }
};

// Middleware to check if user is student
const requireStudent = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }
    
    req.currentUser = user;
    next();
  } catch (error) {
    console.error('Student check error:', error);
    res.status(500).json({ message: 'Failed to verify student status' });
  }
};

module.exports = {
  verifyFirebaseToken,
  requireInstructor,
  requireStudent
};
