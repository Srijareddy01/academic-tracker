const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { verifyFirebaseToken, requireInstructor } = require('../middleware/auth');

// Get all users (instructor only)
router.get('/', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;
    
    let query = { isActive: true };
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-firebaseUid')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Get user by ID
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-firebaseUid')
      .populate('enrolledCourses', 'title code')
      .populate('createdCourses', 'title code');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
});

// Search users
router.get('/search/:query', verifyFirebaseToken, async (req, res) => {
  try {
    const { query } = req.params;
    const { role } = req.query;

    let searchQuery = {
      isActive: true,
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };

    if (role) {
      searchQuery.role = role;
    }

    const users = await User.find(searchQuery)
      .select('firstName lastName email role profilePicture')
      .limit(10);

    res.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Failed to search users', error: error.message });
  }
});

// Update user status (instructor only)
router.put('/:id/status', verifyFirebaseToken, requireInstructor, [
  body('isActive').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { isActive } = req.body;
    user.isActive = isActive;
    await user.save();

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('User status update error:', error);
    res.status(500).json({ message: 'Failed to update user status', error: error.message });
  }
});

// Get user statistics (instructor only)
router.get('/stats/overview', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalInstructors = await User.countDocuments({ role: 'instructor', isActive: true });
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    
    const recentUsers = await User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email role createdAt');

    const stats = {
      totalUsers,
      totalInstructors,
      totalStudents,
      recentUsers
    };

    res.json({ stats });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics', error: error.message });
  }
});

// Get students by batch (instructor only)
router.get('/students/batch/:batch', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    const { batch } = req.params;
    
    console.log('Fetching students for batch:', batch); // Debug log
    console.log('Request user:', req.user); // Debug log
    console.log('Current user:', req.currentUser); // Debug log
    
    let query = { 
      role: 'student', 
      isActive: true 
    };
    
    // If batch is 'all', don't filter by batch
    if (batch !== 'all') {
      query.batch = batch;
    }
    
    console.log('Students query:', query); // Debug log
    
    const students = await User.find(query)
      .select('firstName lastName email batch studentId') // Ensure studentId is included
      .sort({ firstName: 1, lastName: 1 });
      
    console.log('Found students:', students.length); // Debug log
    if (students.length > 0) {
      console.log('First few students:', students.slice(0, 3)); // Debug log
    }

    res.json({ students });
  } catch (error) {
    console.error('Students by batch fetch error:', error);
    console.error('Error stack:', error.stack); // Debug log
    res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
});

// Get all students (instructor only)
router.get('/students', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    console.log('Fetching all students for instructor:', req.currentUser._id); // Debug log
    console.log('Request user:', req.user); // Debug log
    console.log('Current user:', req.currentUser); // Debug log
    
    // Import User model here to avoid potential circular dependency issues
    const User = require('../models/User');
    
    const query = { 
      role: 'student', 
      isActive: true 
    };
    
    console.log('Students query:', query); // Debug log
    
    const students = await User.find(query)
      .select('firstName lastName email batch studentId') // Ensure studentId is included
      .sort({ firstName: 1, lastName: 1 });
      
    console.log('Found all students:', students.length); // Debug log
    if (students.length > 0) {
      console.log('First few students:', students.slice(0, 3)); // Debug log
    }

    res.json({ students });
  } catch (error) {
    console.error('Students fetch error:', error);
    console.error('Error stack:', error.stack); // Debug log
    res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
});

module.exports = router;
