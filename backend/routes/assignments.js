const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const _ = require('lodash'); // for deep merge

const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { verifyFirebaseToken, requireInstructor } = require('../middleware/auth');
const { toIST, fromIST } = require('../utils/timezone');

// ------------------------------
// GET all assignments for current user
// ------------------------------
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid, isActive: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    let query = { isActive: true };
    if (user.role === 'instructor') {
      query.instructor = user._id;
    } else {
      query.isPublished = true;
      if (user.batch) {
        // Use exact batch matching to prevent cross-assignment
        query.$or = [
          { batch: user.batch },  // Exact match only
          { batch: '' },
          { batch: null },
          { assignedStudents: user._id }
        ];
      } else {
        query.assignedStudents = user._id;
      }
    }

    const assignments = await Assignment.find(query)
      .sort({ dueDate: 1 })
      .populate('instructor', 'firstName lastName email')
      .populate('assignedStudents', 'firstName lastName email studentId');

    console.log('Assignments fetched for user:', user._id, 'Role:', user.role, 'Count:', assignments.length); // Debug log
    console.log('Assignments data sample:', assignments.slice(0, 2)); // Debug log

    res.status(200).json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Failed to fetch assignments', error: error.message });
  }
});

// ------------------------------
// GET assignment by ID
// ------------------------------
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format.' });
    }

    // Find assignment by ID
    const assignment = await Assignment.findById(id);
    
    // Check if assignment exists
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    // Populate references
    await assignment.populate('instructor', 'firstName lastName email');
    await assignment.populate('assignedStudents', 'firstName lastName email studentId');

    res.status(200).json({ assignment });
  } catch (error) {
    console.error('Error fetching assignment by ID:', error);
    // More detailed error response
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid assignment ID format.' });
    }
    res.status(500).json({ message: 'Server error fetching assignment.', error: error.message });
  }
});

// ------------------------------
// GET assignments by batch
// ------------------------------
router.get('/batch/:batch', verifyFirebaseToken, async (req, res) => {
  try {
    const { batch } = req.params;
    const user = await User.findOne({ firebaseUid: req.user.uid, isActive: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    let query = { isActive: true };
    if (user.role === 'instructor') query.instructor = user._id;
    else query.isPublished = true;

    // Use exact batch matching to prevent cross-assignment
    query.batch = batch;  // Exact match only

    const assignments = await Assignment.find(query)
      .sort({ dueDate: 1 })
      .populate('instructor', 'firstName lastName email')
      .populate('assignedStudents', 'firstName lastName email studentId');

    res.status(200).json({ assignments });
  } catch (error) {
    console.error('Error fetching batch assignments:', error);
    res.status(500).json({ message: 'Failed to fetch batch assignments', error: error.message });
  }
});

// ------------------------------
// CREATE new assignment (instructor only)
// ------------------------------
router.post(
  '/',
  verifyFirebaseToken,
  requireInstructor,
  [
    body('title').trim().isLength({ min: 1, max: 200 }),
    body('description').trim().isLength({ min: 1, max: 5000 }),
    body('startDate').isISO8601(),
    body('dueDate').isISO8601(),
    body('maxPoints').isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const {
        title,
        description,
        startDate,
        dueDate,
        maxPoints,
        assignmentType,
        instructions,
        settings,
        rubric,
        codingChallenges,
        batch,
        selectedStudents
      } = req.body;

      // Validate dates
      const startDateTime = new Date(startDate);
      const dueDateTime = new Date(dueDate);
      
      if (isNaN(startDateTime.getTime()) || isNaN(dueDateTime.getTime())) {
        return res.status(400).json({ message: 'Invalid date format provided.' });
      }

      // Determine if assignment should be published automatically
      // Publish automatically if students are assigned during creation
      const shouldAutoPublish = selectedStudents && selectedStudents.length > 0;

      const assignment = new Assignment({
        title,
        description,
        instructor: req.currentUser._id,
        startDate: fromIST(startDateTime),
        dueDate: fromIST(dueDateTime),
        maxPoints: Number(maxPoints),
        assignmentType: assignmentType || (codingChallenges?.length ? 'coding' : 'homework'),
        instructions,
        settings: settings || {},
        rubric: rubric || {},
        codingChallenges: codingChallenges || [],
        batch: batch || '',  // This will be normalized by the schema setter
        assignedStudents: selectedStudents || [],
        isPublished: shouldAutoPublish, // Auto-publish if students are assigned
        publishedAt: shouldAutoPublish ? new Date() : null // Set publish time if auto-publishing
      });

      await assignment.save();
      
      // Populate the saved assignment
      const populatedAssignment = await Assignment.findById(assignment._id)
        .populate('instructor', 'firstName lastName email')
        .populate('assignedStudents', 'firstName lastName email studentId');

      res.status(201).json({ 
        message: 'Assignment created successfully', 
        assignment: populatedAssignment,
        autoPublished: shouldAutoPublish
      });
    } catch (error) {
      console.error('Assignment creation error:', error);
      res.status(500).json({ message: 'Failed to create assignment', error: error.message });
    }
  }
);

// ------------------------------
// UPDATE assignment (instructor only)
// ------------------------------
router.put(
  '/:id',
  verifyFirebaseToken,
  requireInstructor,
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ min: 1, max: 5000 }),
    body('startDate').optional().isISO8601(),
    body('dueDate').optional().isISO8601(),
    body('maxPoints').optional().isNumeric(),
    body('codingChallenges').optional().isArray(),
    body('codingChallenges.*.platform').optional().isIn(['leetcode', 'hackerrank', 'codechef', 'codeforces', 'other']),
    body('codingChallenges.*.title').optional().trim().isLength({ min: 1 }),
    body('codingChallenges.*.url').optional().isURL(),
    body('codingChallenges.*.difficulty').optional().isIn(['easy', 'medium', 'hard'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid assignment ID format.' });
      }

      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
      if (assignment.instructor.toString() !== req.currentUser._id.toString())
        return res.status(403).json({ message: 'Access denied' });

      const { title, description, startDate, dueDate, maxPoints, instructions, settings, rubric, codingChallenges, batch, selectedStudents } = req.body;

      if (title !== undefined) assignment.title = title;
      if (description !== undefined) assignment.description = description;
      if (startDate !== undefined) {
        const startDateObj = new Date(startDate);
        if (!isNaN(startDateObj.getTime())) {
          assignment.startDate = fromIST(startDateObj);
        }
      }
      if (dueDate !== undefined) {
        const dueDateObj = new Date(dueDate);
        if (!isNaN(dueDateObj.getTime())) {
          assignment.dueDate = fromIST(dueDateObj);
        }
      }
      if (maxPoints !== undefined) assignment.maxPoints = maxPoints;
      if (instructions !== undefined) assignment.instructions = instructions;
      if (settings !== undefined) assignment.settings = _.merge({}, assignment.settings, settings);
      if (rubric !== undefined) assignment.rubric = rubric;
      if (codingChallenges !== undefined) assignment.codingChallenges = codingChallenges;
      if (batch !== undefined) assignment.batch = batch;
      
      // Handle student assignment updates
      if (selectedStudents !== undefined) {
        assignment.assignedStudents = selectedStudents;
        // Auto-publish if students are assigned and assignment is not already published
        if (selectedStudents.length > 0 && !assignment.isPublished) {
          assignment.isPublished = true;
          assignment.publishedAt = new Date();
        }
      }

      await assignment.save();
      
      // Populate the updated assignment
      const populatedAssignment = await Assignment.findById(assignment._id)
        .populate('instructor', 'firstName lastName email')
        .populate('assignedStudents', 'firstName lastName email studentId');

      res.json({ 
        message: 'Assignment updated successfully', 
        assignment: populatedAssignment,
        autoPublished: selectedStudents && selectedStudents.length > 0 && !assignment.isPublished 
      });
    } catch (error) {
      console.error('Assignment update error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid assignment ID format.' });
      }
      res.status(500).json({ message: 'Failed to update assignment', error: error.message });
    }
  }
);

// ------------------------------
// PUBLISH / UNPUBLISH assignment
// ------------------------------
const togglePublish = async (req, res, publish) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format.' });
    }
    
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.instructor.toString() !== req.currentUser._id.toString())
      return res.status(403).json({ message: 'Access denied' });

    assignment.isPublished = publish;
    if (publish) assignment.publishedAt = new Date();

    await assignment.save();
    
    // Populate the assignment
    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('instructor', 'firstName lastName email')
      .populate('assignedStudents', 'firstName lastName email studentId');

    res.json({ message: `Assignment ${publish ? 'published' : 'unpublished'} successfully`, assignment: populatedAssignment });
  } catch (error) {
    console.error('Publish/unpublish error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid assignment ID format.' });
    }
    res.status(500).json({ message: `Failed to ${publish ? 'publish' : 'unpublish'} assignment`, error: error.message });
  }
};
router.post('/:id/publish', verifyFirebaseToken, requireInstructor, (req, res) => togglePublish(req, res, true));
router.post('/:id/unpublish', verifyFirebaseToken, requireInstructor, (req, res) => togglePublish(req, res, false));

// ------------------------------
// AUTO-ASSIGN assignments to student
// ------------------------------
router.post('/auto-assign', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid, isActive: true });
    if (!user || user.role !== 'student')
      return res.status(403).json({ message: 'Only students can auto-assign assignments' });
    if (!user.batch) return res.status(400).json({ message: 'Student has no batch assigned' });

    // Use exact batch matching to prevent cross-assignment
    const assignments = await Assignment.find({
      isActive: true,
      isPublished: true,
      batch: user.batch  // Exact match only, no case variations
    });

    const unassigned = assignments.filter(a => !a.assignedStudents.some(id => id.equals(user._id)));
    if (unassigned.length > 0) {
      await Assignment.updateMany(
        { _id: { $in: unassigned.map(a => a._id) } },
        { $push: { assignedStudents: user._id } }
      );
    }

    res.status(200).json({
      message: `Found ${assignments.length} assignments. Assigned ${unassigned.length} new.`,
      assignments: assignments.map(a => a._id),
      newlyAssigned: unassigned.length,
      alreadyAssigned: assignments.length - unassigned.length,
      totalFound: assignments.length
    });
  } catch (error) {
    console.error('Auto-assign error:', error);
    res.status(500).json({ message: 'Failed to auto-assign', error: error.message });
  }
});

// ------------------------------
// ASSIGN / UNASSIGN STUDENT
// ------------------------------
const modifyStudentAssignment = async (req, res, assign = true) => {
  try {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format.' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.studentId)) {
      return res.status(400).json({ message: 'Invalid student ID format.' });
    }
    
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'student' || !student.isActive)
      return res.status(404).json({ message: 'Active student not found' });

    const alreadyAssigned = assignment.assignedStudents.some(id => id.equals(student._id));
    if (assign && alreadyAssigned) return res.status(400).json({ message: 'Student already assigned' });
    if (!assign && !alreadyAssigned) return res.status(400).json({ message: 'Student not assigned' });

    if (assign) {
      assignment.assignedStudents.push(student._id);
      // Auto-publish if not already published
      if (!assignment.isPublished) {
        assignment.isPublished = true;
        assignment.publishedAt = new Date();
      }
    } else {
      assignment.assignedStudents = assignment.assignedStudents.filter(id => !id.equals(student._id));
    }

    await assignment.save();
    
    // Populate the assignment
    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('instructor', 'firstName lastName email')
      .populate('assignedStudents', 'firstName lastName email studentId');

    res.json({ 
      message: `Student ${assign ? 'assigned' : 'unassigned'} successfully`, 
      assignment: populatedAssignment,
      autoPublished: assign && !assignment.isPublished
    });
  } catch (error) {
    console.error('Modify student assignment error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid ID format.' });
    }
    res.status(500).json({ message: 'Failed to modify student assignment', error: error.message });
  }
};
router.post('/:id/assign-student/:studentId', verifyFirebaseToken, requireInstructor, (req, res) => modifyStudentAssignment(req, res, true));
router.post('/:id/unassign-student/:studentId', verifyFirebaseToken, requireInstructor, (req, res) => modifyStudentAssignment(req, res, false));

// ------------------------------
// GET assignment statistics (instructor only)
// ------------------------------
router.get('/:id/stats', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format.' });
    }
    
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.instructor.toString() !== req.currentUser._id.toString())
      return res.status(403).json({ message: 'Access denied' });

    const stats = await assignment.getSubmissionStats();
    res.json({ stats });
  } catch (error) {
    console.error('Assignment stats error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid assignment ID format.' });
    }
    res.status(500).json({ message: 'Failed to fetch assignment statistics', error: error.message });
  }
});

// ------------------------------
// DELETE assignment (soft delete)
// ------------------------------
router.delete('/:id', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format.' });
    }
    
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.instructor.toString() !== req.currentUser._id.toString())
      return res.status(403).json({ message: 'Access denied' });

    assignment.isActive = false;
    await assignment.save();
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Assignment deletion error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid assignment ID format.' });
    }
    res.status(500).json({ message: 'Failed to delete assignment', error: error.message });
  }
});

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const { body, validationResult } = require('express-validator');
// const Assignment = require('../models/Assignment');
// const Course = require('../models/Course');
// const { verifyFirebaseToken, requireInstructor } = require('../middleware/auth');

// // Get all assignments for current user
// router.get('/', verifyFirebaseToken, async (req, res) => {
//   try {
//     const User = require('../models/User');
//     // Use findOne instead of findByFirebaseUid to avoid validation issues
//     const user = await User.findOne({ firebaseUid: req.user.uid, isActive: true });
    
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     let assignments;
//     if (user.role === 'instructor') {
//       // For instructors, findByInstructor already populates the data and sorts by dueDate
//       assignments = await Assignment.findByInstructor(user._id);
//     } else {
//       // For students, get all active and published assignments
//       // Filter by student's batch if they have one, or by assigned students
//       let query = { 
//         isActive: true,
//         isPublished: true 
//       };
      
//       // If student has a batch, filter assignments by that batch
//       // Also include assignments where the student is specifically assigned
//       if (user.batch) {
//         console.log('Fetching assignments for student with batch:', user.batch); // Debug log
//         console.log('Student ID:', user._id); // Debug log
//         query.$or = [
//           { batch: user.batch },
//           { batch: user.batch.toLowerCase() },
//           { batch: user.batch.toUpperCase() },
//           { batch: '' },
//           { batch: null },
//           { assignedStudents: user._id }
//         ];
//       } else {
//         // If no batch, only show assignments specifically assigned to this student
//         console.log('Fetching assignments for student without batch, ID:', user._id); // Debug log
//         query.assignedStudents = user._id;
//       }
      
//       assignments = await Assignment.find(query)
//         .populate('instructor', 'firstName lastName email')
//         .populate('assignedStudents', 'firstName lastName email studentId')
//         .sort({ dueDate: 1 });
      
//       console.log('Found assignments:', assignments.length); // Debug log
//     }

//     res.json({ assignments });
//   } catch (error) {
//     console.error('Assignments fetch error:', error);
//     res.status(500).json({ message: 'Failed to fetch assignments', error: error.message });
//   }
// });

// // Get assignment by ID
// router.get('/:id', verifyFirebaseToken, async (req, res) => {
//   try {
//     const assignment = await Assignment.findById(req.params.id)
//       .populate('instructor', 'firstName lastName email')
//       .populate('assignedStudents', 'firstName lastName email studentId');

//     if (!assignment) {
//       return res.status(404).json({ message: 'Assignment not found' });
//     }

//     res.json({ assignment });
//   } catch (error) {
//     console.error('Assignment fetch error:', error);
//     res.status(500).json({ message: 'Failed to fetch assignment', error: error.message });
//   }
// });

// // Get assignments by batch (for students)
// router.get('/batch/:batch', verifyFirebaseToken, async (req, res) => {
//   try {
//     const { batch } = req.params;
//     const User = require('../models/User');
//     // Use findOne instead of findByFirebaseUid to avoid validation issues
//     const user = await User.findOne({ firebaseUid: req.user.uid, isActive: true });
    
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     let assignments;
//     if (user.role === 'instructor') {
//       // For instructors, get assignments for their batch
//       assignments = await Assignment.find({ 
//         instructor: user._id,
//         $or: [
//           { batch: batch },
//           { batch: batch.toLowerCase() },
//           { batch: batch.toUpperCase() },
//           { batch: '' },
//           { batch: null }
//         ],
//         isActive: true
//       })
//         .populate('instructor', 'firstName lastName email')
//         .populate('assignedStudents', 'firstName lastName email studentId')
//         .sort({ dueDate: 1 });
//     } else {
//       // For students, get active and published assignments for their batch
//       // Also include assignments specifically assigned to this student
//       console.log('Fetching assignments for student batch:', batch); // Debug log
//       console.log('Student ID:', user._id); // Debug log
      
//       assignments = await Assignment.find({ 
//         isActive: true,
//         isPublished: true,
//         $or: [
//           { batch: batch },
//           { batch: batch.toLowerCase() },
//           { batch: batch.toUpperCase() },
//           { batch: '' },
//           { batch: null },
//           { assignedStudents: user._id }
//         ]
//       })
//         .populate('instructor', 'firstName lastName email')
//         .populate('assignedStudents', 'firstName lastName email studentId')
//         .sort({ dueDate: 1 });
      
//       console.log('Found assignments:', assignments.length); // Debug log
//       console.log('Assignment IDs:', assignments.map(a => a._id)); // Debug log
//     }

//     res.json({ assignments });
//   } catch (error) {
//     console.error('Assignments by batch fetch error:', error);
//     res.status(500).json({ message: 'Failed to fetch assignments', error: error.message });
//   }
// });

// // Create new assignment (instructor only)
// router.post('/', verifyFirebaseToken, requireInstructor, [
//   // Add proper validation with custom messages
//   body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
//   body('description').trim().isLength({ min: 1, max: 5000 }).withMessage('Description must be between 1 and 5000 characters'),
//   body('startDate').isISO8601().withMessage('Start date must be a valid ISO date'),
//   body('dueDate').isISO8601().withMessage('Due date must be a valid ISO date'),
//   body('maxPoints').isNumeric().withMessage('Max points must be a number'),
//   body('assignmentType').optional().isIn(['homework', 'quiz', 'exam', 'project', 'lab', 'discussion', 'other', 'coding']).withMessage('Assignment type must be one of: homework, quiz, exam, project, lab, discussion, other, coding'),
//   // Validation for coding challenges
//   body('codingChallenges').optional().isArray().withMessage('Coding challenges must be an array'),
//   body('codingChallenges.*.platform').optional().isIn(['leetcode', 'hackerrank', 'codechef', 'codeforces', 'other']).withMessage('Platform must be one of: leetcode, hackerrank, codechef, codeforces, other'),
//   body('codingChallenges.*.title').optional().trim().isLength({ min: 1 }).withMessage('Challenge title is required'),
//   body('codingChallenges.*.url').optional().isURL().withMessage('Challenge URL must be a valid URL'),
//   body('codingChallenges.*.assignmentNumber').optional().trim(),
//   body('codingChallenges.*.difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Difficulty must be one of: easy, medium, hard')
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       console.log('Validation errors:', JSON.stringify(errors.array(), null, 2)); // Debug log
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { title, description, startDate, dueDate, maxPoints, assignmentType, instructions, settings, rubric, codingChallenges, batch, selectedStudents } = req.body;
    
//     console.log('Received assignment data:', JSON.stringify(req.body, null, 2)); // Debug log

//     const assignment = new Assignment({
//       title,
//       description,
//       instructor: req.currentUser._id,
//       startDate: new Date(startDate),
//       dueDate: new Date(dueDate),
//       maxPoints: Number(maxPoints), // Ensure it's a number
//       assignmentType: assignmentType || (codingChallenges && codingChallenges.length > 0 ? 'coding' : 'homework'), // Set default
//       instructions,
//       settings: settings || {},
//       rubric: rubric || {},
//       codingChallenges: codingChallenges || [], // Add coding challenges
//       batch: batch || '',
//       // Store selected students if provided
//       assignedStudents: selectedStudents || []
//     });

//     console.log('Attempting to save assignment:', JSON.stringify(assignment, null, 2)); // Debug log
    
//     // Add better error handling for the save operation
//     try {
//       await assignment.save();
//       console.log('Assignment saved successfully with ID:', assignment._id); // Debug log
//     } catch (saveError) {
//       console.error('Error saving assignment to database:', saveError);
//       console.error('Database connection state:', require('mongoose').connection.readyState);
//       return res.status(500).json({ 
//         message: 'Failed to save assignment to database', 
//         error: saveError.message,
//         connectionState: require('mongoose').connection.readyState
//       });
//     }

//     res.status(201).json({
//       message: 'Assignment created successfully',
//       assignment: await Assignment.findById(assignment._id)
//         .populate('instructor', 'firstName lastName email')
//         .populate('assignedStudents', 'firstName lastName email studentId')
//     });
//   } catch (error) {
//     console.error('Assignment creation error:', error);
//     res.status(500).json({ message: 'Failed to create assignment', error: error.message });
//   }
// });

// // Update assignment (instructor only)
// router.put('/:id', verifyFirebaseToken, requireInstructor, [
//   body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
//   body('description').optional().trim().isLength({ min: 1, max: 5000 }).withMessage('Description must be between 1 and 5000 characters'),
//   body('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
//   body('dueDate').optional().isISO8601().withMessage('Due date must be a valid ISO date'),
//   body('maxPoints').optional().isNumeric().withMessage('Max points must be a number'),
//   // Validation for coding challenges
//   body('codingChallenges').optional().isArray().withMessage('Coding challenges must be an array'),
//   body('codingChallenges.*.platform').optional().isIn(['leetcode', 'hackerrank', 'codechef', 'codeforces', 'other']).withMessage('Platform must be one of: leetcode, hackerrank, codechef, codeforces, other'),
//   body('codingChallenges.*.title').optional().trim().isLength({ min: 1 }).withMessage('Challenge title is required'),
//   body('codingChallenges.*.url').optional().isURL().withMessage('Challenge URL must be a valid URL'),
//   body('codingChallenges.*.assignmentNumber').optional().trim(),
//   body('codingChallenges.*.difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Difficulty must be one of: easy, medium, hard')
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const assignment = await Assignment.findById(req.params.id);
    
//     if (!assignment) {
//       return res.status(404).json({ message: 'Assignment not found' });
//     }

//     if (assignment.instructor.toString() !== req.currentUser._id.toString()) {
//       return res.status(403).json({ message: 'Access denied' });
//     }

//     const { title, description, startDate, dueDate, maxPoints, instructions, settings, rubric, codingChallenges, batch, selectedStudents } = req.body;

//     if (title) assignment.title = title;
//     if (description) assignment.description = description;
//     if (startDate) assignment.startDate = new Date(startDate);
//     if (dueDate) assignment.dueDate = new Date(dueDate);
//     if (maxPoints) assignment.maxPoints = maxPoints;
//     if (instructions) assignment.instructions = instructions;
//     if (settings) assignment.settings = { ...assignment.settings, ...settings };
//     if (rubric) assignment.rubric = rubric;
//     if (codingChallenges) assignment.codingChallenges = codingChallenges; // Update coding challenges
//     if (batch) assignment.batch = batch;
//     // Update assigned students if provided
//     if (selectedStudents) assignment.assignedStudents = selectedStudents;

//     // Save the assignment
//     await assignment.save();

//     res.json({
//       message: 'Assignment updated successfully',
//       assignment: await Assignment.findById(assignment._id)
//         .populate('instructor', 'firstName lastName email')
//         .populate('assignedStudents', 'firstName lastName email studentId')
//     });
//   } catch (error) {
//     console.error('Assignment update error:', error);
//     res.status(500).json({ message: 'Failed to update assignment', error: error.message });
//   }
// });

// // Publish assignment (instructor only)
// router.post('/:id/publish', verifyFirebaseToken, requireInstructor, async (req, res) => {
//   try {
//     const assignment = await Assignment.findById(req.params.id);
    
//     if (!assignment) {
//       return res.status(404).json({ message: 'Assignment not found' });
//     }

//     if (assignment.instructor.toString() !== req.currentUser._id.toString()) {
//       return res.status(403).json({ message: 'Access denied' });
//     }

//     assignment.isPublished = true;
//     assignment.publishedAt = new Date();
//     await assignment.save();

//     res.json({
//       message: 'Assignment published successfully',
//       assignment: await Assignment.findById(assignment._id)
//         .populate('instructor', 'firstName lastName email')
//         .populate('assignedStudents', 'firstName lastName email studentId')
//     });
//   } catch (error) {
//     console.error('Assignment publish error:', error);
//     res.status(500).json({ message: 'Failed to publish assignment', error: error.message });
//   }
// });

// // Unpublish assignment (instructor only)
// router.post('/:id/unpublish', verifyFirebaseToken, requireInstructor, async (req, res) => {
//   try {
//     const assignment = await Assignment.findById(req.params.id);
    
//     if (!assignment) {
//       return res.status(404).json({ message: 'Assignment not found' });
//     }

//     if (assignment.instructor.toString() !== req.currentUser._id.toString()) {
//       return res.status(403).json({ message: 'Access denied' });
//     }

//     assignment.isPublished = false;
//     await assignment.save();

//     res.json({
//       message: 'Assignment unpublished successfully',
//       assignment: await Assignment.findById(assignment._id)
//         .populate('instructor', 'firstName lastName email')
//         .populate('assignedStudents', 'firstName lastName email studentId')
//     });
//   } catch (error) {
//     console.error('Assignment unpublish error:', error);
//     res.status(500).json({ message: 'Failed to unpublish assignment', error: error.message });
//   }
// });

// // Get assignment statistics (instructor only)
// router.get('/:id/stats', verifyFirebaseToken, requireInstructor, async (req, res) => {
//   try {
//     const assignment = await Assignment.findById(req.params.id);
    
//     if (!assignment) {
//       return res.status(404).json({ message: 'Assignment not found' });
//     }

//     if (assignment.instructor.toString() !== req.currentUser._id.toString()) {
//       return res.status(403).json({ message: 'Access denied' });
//     }

//     const stats = await assignment.getSubmissionStats();

//     res.json({ stats });
//   } catch (error) {
//     console.error('Assignment stats error:', error);
//     res.status(500).json({ message: 'Failed to fetch assignment statistics', error: error.message });
//   }
// });

// // Delete assignment (instructor only)
// router.delete('/:id', verifyFirebaseToken, requireInstructor, async (req, res) => {
//   try {
//     const assignment = await Assignment.findById(req.params.id);
    
//     if (!assignment) {
//       return res.status(404).json({ message: 'Assignment not found' });
//     }

//     if (assignment.instructor.toString() !== req.currentUser._id.toString()) {
//       return res.status(403).json({ message: 'Access denied' });
//     }

//     // Soft delete
//     assignment.isActive = false;
//     await assignment.save();

//     res.json({ message: 'Assignment deleted successfully' });
//   } catch (error) {
//     console.error('Assignment deletion error:', error);
//     res.status(500).json({ message: 'Failed to delete assignment', error: error.message });
//   }
// });

// // Manually assign student to assignment (instructor only)
// router.post('/:id/assign-student/:studentId', verifyFirebaseToken, requireInstructor, async (req, res) => {
//   try {
//     const assignment = await Assignment.findById(req.params.id);
    
//     if (!assignment) {
//       return res.status(404).json({ message: 'Assignment not found' });
//     }

//     // Check if student exists and is active
//     const User = require('../models/User');
//     const student = await User.findById(req.params.studentId);
    
//     if (!student || student.role !== 'student' || !student.isActive) {
//       return res.status(404).json({ message: 'Active student not found' });
//     }

//     // Assign student to assignment
//     try {
//       await assignment.assignStudent(student._id);
//       res.json({
//         message: 'Student assigned to assignment successfully',
//         assignment: await Assignment.findById(assignment._id)
//           .populate('instructor', 'firstName lastName email')
//           .populate('assignedStudents', 'firstName lastName email studentId')
//       });
//     } catch (assignError) {
//       if (assignError.message.includes('already assigned')) {
//         return res.status(400).json({ message: 'Student is already assigned to this assignment' });
//       }
//       throw assignError;
//     }
//   } catch (error) {
//     console.error('Student assignment error:', error);
//     res.status(500).json({ message: 'Failed to assign student to assignment', error: error.message });
//   }
// });

// // Manually unassign student from assignment (instructor only)
// router.post('/:id/unassign-student/:studentId', verifyFirebaseToken, requireInstructor, async (req, res) => {
//   try {
//     const assignment = await Assignment.findById(req.params.id);
    
//     if (!assignment) {
//       return res.status(404).json({ message: 'Assignment not found' });
//     }

//     // Check if student exists
//     const User = require('../models/User');
//     const student = await User.findById(req.params.studentId);
    
//     if (!student || student.role !== 'student') {
//       return res.status(404).json({ message: 'Student not found' });
//     }

//     // Unassign student from assignment
//     await assignment.unassignStudent(student._id);
    
//     res.json({
//       message: 'Student unassigned from assignment successfully',
//       assignment: await Assignment.findById(assignment._id)
//         .populate('instructor', 'firstName lastName email')
//         .populate('assignedStudents', 'firstName lastName email studentId')
//     });
//   } catch (error) {
//     console.error('Student unassignment error:', error);
//     res.status(500).json({ message: 'Failed to unassign student from assignment', error: error.message });
//   }
// });

// // Auto-assign student to batch assignments
// router.post('/auto-assign', verifyFirebaseToken, async (req, res) => {
//   try {
//     const User = require('../models/User');
//     const user = await User.findOne({ firebaseUid: req.user.uid, isActive: true });
    
//     if (!user || user.role !== 'student') {
//       return res.status(403).json({ message: 'Only students can auto-assign assignments' });
//     }

//     // Check if student has a batch
//     if (!user.batch) {
//       return res.status(400).json({ message: 'Student does not have a batch assigned' });
//     }

//     console.log('Auto-assigning assignments for student:', user._id, 'batch:', user.batch); // Debug log

//     // Find all active assignments that match the student's batch
//     // Include assignments with no batch specified (open to all)
//     const assignments = await Assignment.find({
//       isActive: true,
//       isPublished: true,
//       $or: [
//         { batch: user.batch },
//         { batch: user.batch.toLowerCase() },
//         { batch: user.batch.toUpperCase() },
//         { batch: '' },
//         { batch: null }
//       ]
//     });

//     console.log('Found assignments to assign:', assignments.length); // Debug log

//     // Update each assignment to include this student in the assignedStudents array
//     let assignedCount = 0;
//     const assignedAssignments = [];
//     const alreadyAssigned = [];
    
//     for (const assignment of assignments) {
//       try {
//         // Check if student is already assigned to this assignment
//         if (!assignment.isStudentAssigned(user._id)) {
//           console.log('Assigning student to assignment:', assignment._id); // Debug log
//           await assignment.assignStudent(user._id);
//           assignedCount++;
//           assignedAssignments.push(assignment._id);
//         } else {
//           console.log('Student already assigned to assignment:', assignment._id); // Debug log
//           alreadyAssigned.push(assignment._id);
//           assignedAssignments.push(assignment._id);
//         }
//       } catch (assignmentError) {
//         console.error(`Failed to assign student to assignment ${assignment._id}:`, assignmentError);
//       }
//     }

//     console.log('Auto-assignment complete. Assigned', assignedCount, 'new assignments'); // Debug log

//     res.json({
//       message: `Found ${assignments.length} assignments for your batch. Assigned ${assignedCount} new assignments.`,
//       assignments: assignedAssignments,
//       newlyAssigned: assignedCount,
//       alreadyAssigned: alreadyAssigned.length,
//       totalFound: assignments.length
//     });
//   } catch (error) {
//     console.error('Auto-assignment error:', error);
//     res.status(500).json({ message: 'Failed to auto-assign assignments', error: error.message });
//   }
// });

// module.exports = router;
