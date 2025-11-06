const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const Course = require('../models/Course');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { upload, handleMulterError } = require('../middleware/upload');
const { verifyFirebaseToken } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get all courses for current user
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    console.log('Fetching courses for user...'); // Debug log
    console.log('Request user:', req.user); // Debug log
    
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      console.log('User not found for UID:', req.user.uid); // Debug log
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found user:', user._id, 'Role:', user.role); // Debug log

    let courses;
    if (user.role === 'instructor') {
      console.log('User is instructor, fetching instructor courses'); // Debug log
      try {
        courses = await Course.findByInstructor(user._id);
        console.log('Instructor courses query completed'); // Debug log
        console.log('Courses found:', courses.length); // Debug log
        if (courses.length > 0) {
          console.log('First course enrolled students:', courses[0]?.enrolledStudents); // Debug log
        }
      } catch (courseError) {
        console.error('Error in Course.findByInstructor:', courseError);
        throw courseError;
      }
      console.log('Instructor courses found:', courses.length); // Debug log
    } else {
      // For students, get courses they're enrolled in
      console.log('User is student, fetching student courses'); // Debug log
      try {
        courses = await Course.findByStudent(user._id);
        console.log('Student courses query completed'); // Debug log
        console.log('Courses found:', courses.length); // Debug log
      } catch (courseError) {
        console.error('Error in Course.findByStudent:', courseError);
        throw courseError;
      }
    }

    console.log('Sending courses response:', courses.length); // Debug log
    res.json({ courses });
  } catch (error) {
    console.error('Courses fetch error:', error);
    console.error('Error stack:', error.stack); // Debug log
    res.status(500).json({ message: 'Failed to fetch courses', error: error.message });
  }
});

// Get all available courses (for students to browse and enroll)
router.get('/available', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only students should browse available courses
    if (user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can browse available courses' });
    }

    console.log('Fetching available courses for student:', user._id); // Debug log
    
    // Get all available courses excluding those already enrolled
    const courses = await Course.findAvailableCoursesForStudent(user._id)
      .populate('instructor', 'firstName lastName email profilePicture');
    
    console.log('Available courses found:', courses); // Debug log

    res.json({ courses });
  } catch (error) {
    console.error('Available courses fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch available courses', error: error.message });
  }
});

// Get course by ID
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName email profilePicture')
      .populate('enrolledStudents.studentId', 'firstName lastName email profilePicture studentId'); // Added studentId field

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user has access to this course
    const user = await User.findByFirebaseUid(req.user.uid);
    const hasAccess = course.instructor._id.toString() === user._id.toString() ||
      course.enrolledStudents.some(enrollment => 
        enrollment.studentId._id.toString() === user._id.toString() && 
        enrollment.status === 'active'
      );

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get assignments for this course (now filtered by batch or assigned students)
    // Since we removed the course field from assignments, we need to filter differently
    let assignments = [];
    if (course.batch) {
      // If course has a batch, get assignments for that batch
      assignments = await Assignment.find({
        $or: [
          { batch: course.batch },
          { batch: '' },
          { batch: null }
        ],
        isActive: true,
        isPublished: true
      })
      .populate('instructor', 'firstName lastName email')
      .populate('assignedStudents', 'firstName lastName email studentId');
    } else {
      // If no batch, get all published assignments
      assignments = await Assignment.find({
        isActive: true,
        isPublished: true
      })
      .populate('instructor', 'firstName lastName email')
      .populate('assignedStudents', 'firstName lastName email studentId');
    }

    res.json({ 
      course: {
        ...course.toObject(),
        assignments,
        materials: course.materials // Include materials in the response
      }
    });
  } catch (error) {
    console.error('Course fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch course', error: error.message });
  }
});

// Create new course (instructor only)
router.post('/', verifyFirebaseToken, [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').trim().isLength({ min: 1, max: 2000 }),
  body('code').trim().isLength({ min: 1, max: 20 }),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('tags').optional().isArray(),
  body('batch').optional().trim(),
  body('selectedStudents').optional().isArray(),
  body('quizzes').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'instructor') {
      return res.status(403).json({ message: 'Only instructors can create courses' });
    }

    const { title, description, code, startDate, endDate, tags, settings, batch, selectedStudents, quizzes } = req.body;

    // Check if course code already exists
    const existingCourse = await Course.findOne({ code, isActive: true });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course code already exists' });
    }

    const course = new Course({
      title,
      description,
      code,
      instructor: user._id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      tags: tags || [],
      settings: settings || {},
      batch: batch || '',
      quizzes: quizzes || [] // Add quizzes to course
    });

    await course.save();
    
    // Enroll selected students in the course
    if (selectedStudents && Array.isArray(selectedStudents) && selectedStudents.length > 0) {
      try {
        for (const studentId of selectedStudents) {
          await course.enrollStudent(studentId);
        }
      } catch (enrollError) {
        console.error('Error enrolling students:', enrollError);
        // Don't fail the course creation if student enrollment fails
      }
    }

    res.status(201).json({
      message: 'Course created successfully',
      course: await Course.findById(course._id)
        .populate('instructor', 'firstName lastName email')
    });
  } catch (error) {
    console.error('Course creation error:', error);
    res.status(500).json({ message: 'Failed to create course', error: error.message });
  }
});

// Update course (instructor only)
router.put('/:id', verifyFirebaseToken, [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ min: 1, max: 2000 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'instructor') {
      return res.status(403).json({ message: 'Only instructors can update courses' });
    }

    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, startDate, endDate, tags, settings } = req.body;

    if (title) course.title = title;
    if (description) course.description = description;
    if (startDate) course.startDate = new Date(startDate);
    if (endDate) course.endDate = new Date(endDate);
    if (tags) course.tags = tags;
    if (settings) course.settings = { ...course.settings, ...settings };

    await course.save();

    res.json({
      message: 'Course updated successfully',
      course: await Course.findById(course._id)
        .populate('instructor', 'firstName lastName email')
        .populate('enrolledStudents.studentId', 'firstName lastName email')
    });
  } catch (error) {
    console.error('Course update error:', error);
    res.status(500).json({ message: 'Failed to update course', error: error.message });
  }
});

// Upload course materials (PDF files)
router.post('/:id/materials', verifyFirebaseToken, upload.array('pdfFiles', 10), handleMulterError, async (req, res) => {
  try {
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'instructor') {
      return res.status(403).json({ message: 'Only instructors can upload course materials' });
    }

    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Process uploaded files and add them to the course
    if (req.files && req.files.length > 0) {
      const materials = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedAt: new Date()
      }));
      
      // Add materials to course
      course.materials.push(...materials);
      await course.save();
    }

    res.json({
      message: 'Files uploaded successfully',
      course: await Course.findById(course._id)
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to upload files', error: error.message });
  }
});

// Enroll in course (student only)
router.post('/:id/enroll', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can enroll in courses' });
    }

    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.isActive) {
      return res.status(400).json({ message: 'Course is not active' });
    }

    // Check if course is currently accepting enrollments
    const now = new Date();
    if (now > course.endDate) {
      return res.status(400).json({ message: 'Course enrollment period has ended' });
    }

    // Check if course has a batch restriction and if student's batch matches
    if (course.batch && user.batch && course.batch !== user.batch) {
      return res.status(403).json({ 
        message: `This course is only available for ${course.batch} batch students` 
      });
    }

    console.log('Enrolling student', user._id, 'in course', course._id); // Debug log
    await course.enrollStudent(user._id);
    console.log('Student enrolled successfully'); // Debug log

    res.json({
      message: 'Successfully enrolled in course',
      course: await Course.findById(course._id)
        .populate('instructor', 'firstName lastName email')
    });
  } catch (error) {
    console.error('Course enrollment error:', error);
    res.status(500).json({ message: 'Failed to enroll in course', error: error.message });
  }
});

// Drop course (student only)
router.post('/:id/drop', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can drop courses' });
    }

    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await course.dropStudent(user._id);

    res.json({ message: 'Successfully dropped course' });
  } catch (error) {
    console.error('Course drop error:', error);
    res.status(500).json({ message: 'Failed to drop course', error: error.message });
  }
});

// Get course statistics (instructor only)
router.get('/:id/stats', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'instructor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get assignments for this course (now filtered by batch)
    let assignments = [];
    if (course.batch) {
      // If course has a batch, get assignments for that batch
      assignments = await Assignment.find({
        $or: [
          { batch: course.batch },
          { batch: '' },
          { batch: null }
        ],
        isActive: true,
        isPublished: true
      });
    } else {
      // If no batch, get all published assignments
      assignments = await Assignment.find({
        isActive: true,
        isPublished: true
      });
    }
    
    const stats = {
      enrollmentCount: course.enrollmentCount,
      assignmentCount: assignments.length,
      activeAssignments: assignments.filter(a => {
        const now = new Date();
        return now >= new Date(a.startDate) && now <= new Date(a.dueDate);
      }).length,
      upcomingAssignments: assignments.filter(a => new Date(a.startDate) > new Date()).length,
      courseDuration: course.duration
    };

    res.json({ stats });
  } catch (error) {
    console.error('Course stats error:', error);
    res.status(500).json({ message: 'Failed to fetch course statistics', error: error.message });
  }
});

// Delete course (instructor only)
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'instructor') {
      return res.status(403).json({ message: 'Only instructors can delete courses' });
    }

    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    course.isActive = false;
    await course.save();

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Course deletion error:', error);
    res.status(500).json({ message: 'Failed to delete course', error: error.message });
  }
});

// Auto-enroll student in batch courses
router.post('/auto-enroll', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findByFirebaseUid(req.user.uid);
    
    if (!user || user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can auto-enroll in courses' });
    }

    // Check if student has a batch
    if (!user.batch) {
      return res.status(400).json({ message: 'Student does not have a batch assigned' });
    }

    // Find all active courses that match the student's batch
    const courses = await Course.find({
      batch: user.batch,
      isActive: true
    });

    // Enroll student in each matching course
    const enrolledCourses = [];
    for (const course of courses) {
      try {
        // Check if student is already enrolled
        const existingEnrollment = course.enrolledStudents.find(
          enrollment => enrollment.studentId.toString() === user._id.toString()
        );
        
        if (!existingEnrollment || existingEnrollment.status !== 'active') {
          await course.enrollStudent(user._id);
          enrolledCourses.push(course._id);
        }
      } catch (enrollError) {
        console.error(`Failed to enroll in course ${course._id}:`, enrollError);
      }
    }

    res.json({
      message: `Successfully enrolled in ${enrolledCourses.length} courses`,
      enrolledCourses
    });
  } catch (error) {
    console.error('Auto-enrollment error:', error);
    res.status(500).json({ message: 'Failed to auto-enroll in courses', error: error.message });
  }
});

module.exports = router;