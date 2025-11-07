const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const QuizSubmission = require('../models/QuizSubmission');
const Course = require('../models/Course');
const User = require('../models/User');

const { verifyFirebaseToken, requireStudent, requireInstructor } = require('../middleware/auth');

// ---------------- Multer setup for file uploads ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ---------------- Helper for validation errors ----------------
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
};

// ---------------- Get submissions for a specific assignment ----------------
router.get('/assignment/:assignmentId', verifyFirebaseToken, async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.findByAssignment(req.params.assignmentId);
    
    // Check if user has access to view these submissions
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    const user = await User.findByFirebaseUid(req.user.uid);
    const hasAccess = user.role === 'instructor' && assignment.instructor.toString() === user._id.toString() ||
                      user.role === 'student';
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ submissions });
  } catch (error) {
    console.error('Assignment submissions fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch submissions', error: error.message });
  }
});

// ---------------- Get all submissions for instructor with batch filtering ----------------
router.get('/instructor', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    console.log('Fetching instructor submissions for user:', req.currentUser._id); // Debug log
    console.log('Batch filter:', req.query.batch); // Debug log
    
    // Get all assignments for this instructor
    const assignments = await Assignment.findByInstructor(req.currentUser._id);
    const assignmentIds = assignments.map(assignment => assignment._id);
    console.log('Found assignments:', assignmentIds.length); // Debug log

    // Get all assignment submissions for these assignments with more detailed data
    let assignmentSubmissions = await AssignmentSubmission.find({ 
      assignment: { $in: assignmentIds } 
    })
    .populate('student', 'firstName lastName email batch studentId')
    .populate('assignment', 'title dueDate maxPoints')
    .sort({ submittedAt: -1 });
    console.log('Found assignment submissions:', assignmentSubmissions.length); // Debug log

    // Get all quiz submissions (no longer tied to courses)
    let quizSubmissions = await QuizSubmission.find()
    .populate('student', 'firstName lastName email batch studentId')
    .populate('course', 'title') // Populate course information for quiz submissions
    .sort({ submittedAt: -1 });
    console.log('Found quiz submissions:', quizSubmissions.length); // Debug log

    // Combine submissions with more detailed information
    let allSubmissions = [
      ...assignmentSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'assignment',
        // Include submission content for instructor view
        contentPreview: sub.content ? sub.content.substring(0, 100) + (sub.content.length > 100 ? '...' : '') : 'No content',
        // Include attachments for instructor view
        hasAttachments: sub.attachments && sub.attachments.length > 0
      })),
      ...quizSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'quiz',
        contentPreview: 'Quiz submission',
        hasAttachments: false,
        // Include quiz data for instructor view
        quizScore: sub.quizData?.score,
        quizMaxScore: sub.quizData?.maxScore || 100,
        totalQuestions: sub.quizData?.answers?.length || 0,
        correctAnswers: sub.quizData?.answers?.filter((answer, index) => {
          // This would need the actual quiz questions to determine correct answers
          // For now, we'll just show the score
          return false;
        }).length || 0
      }))
    ];
    console.log('Total submissions before filtering:', allSubmissions.length); // Debug log

    // Filter submissions by batch if specified
    if (req.query.batch && req.query.batch !== 'all') {
      console.log('Filtering by batch:', req.query.batch); // Debug log
      allSubmissions = allSubmissions.filter(submission => {
        console.log('Submission student batch:', submission.student?.batch); // Debug log
        return submission.student?.batch === req.query.batch;
      });
      console.log('Total submissions after filtering:', allSubmissions.length); // Debug log
    }

    console.log('Final submissions count:', allSubmissions.length); // Debug log
    console.log('Sample submissions:', allSubmissions.slice(0, 2)); // Debug log

    res.json({ submissions: allSubmissions });
  } catch (error) {
    console.error('Instructor submissions fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch submissions', error: error.message });
  }
});

// ---------------- Get student's submissions ----------------
router.get('/student', verifyFirebaseToken, requireStudent, async (req, res) => {
  try {
    // Get assignment submissions for this student
    const assignmentSubmissions = await AssignmentSubmission.findByStudent(req.currentUser._id)
      .populate('assignment', 'title dueDate maxPoints assignmentType');
    
    // Get quiz submissions for this student
    const quizSubmissions = await QuizSubmission.findByStudent(req.currentUser._id);
    
    // Combine submissions with content preview
    const submissions = [
      ...assignmentSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'assignment',
        contentPreview: sub.content ? sub.content.substring(0, 100) + (sub.content.length > 100 ? '...' : '') : 'No content',
        // Include attachments for student view
        hasAttachments: sub.attachments && sub.attachments.length > 0
      })),
      ...quizSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'quiz',
        contentPreview: 'Quiz submission',
        hasAttachments: false
      }))
    ];

    res.json({ submissions });
  } catch (error) {
    console.error('Student submissions fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch submissions', error: error.message });
  }
});

// ---------------- Get submission by ID ----------------
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    console.log('=== Submission Detail Request ===');
    console.log('Request params:', req.params);
    console.log('Request user:', req.user);
    
    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      console.log('User not found for UID:', req.user.uid);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Found user:', user._id, user.role);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('Invalid submission ID format:', req.params.id);
      return res.status(400).json({ message: 'Invalid submission ID format' });
    }

    console.log('Fetching submission with ID:', req.params.id);

    let submission = await AssignmentSubmission.findById(req.params.id)
      .populate('assignment', 'title dueDate maxPoints assignmentType instructor')
      .populate('student', 'firstName lastName email');

    let type = 'assignment';
    if (!submission) {
      console.log('Assignment submission not found, checking quiz submission');
      submission = await QuizSubmission.findById(req.params.id)
        .populate('student', 'firstName lastName email')
        .populate('course', 'title quizzes'); // Populate course with quizzes for quiz submissions
      type = 'quiz';
    }

    if (!submission) {
      console.log('Submission not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Submission not found' });
    }

    console.log('Found submission:', submission._id, 'Type:', type);
    console.log('Submission student:', submission.student?._id);
    console.log('Submission assignment:', submission.assignment?._id);
    console.log('Assignment instructor:', submission.assignment?.instructor);

    // Permission check
    let hasAccess = false;
    if (type === 'assignment') {
      // For assignment submissions
      const isStudent = submission.student && 
                        submission.student._id.toString() === user._id.toString();
      const isInstructor = user.role === 'instructor' && 
                           submission.assignment && 
                           submission.assignment.instructor && 
                           submission.assignment.instructor.toString() === user._id.toString();
      
      hasAccess = isStudent || isInstructor;
      console.log('Assignment submission access check - isStudent:', isStudent, 'isInstructor:', isInstructor, 'hasAccess:', hasAccess);
    } else {
      // For quiz submissions (simplified check for now)
      hasAccess = submission.student && 
                  submission.student._id.toString() === user._id.toString() ||
                  user.role === 'instructor';
    }

    console.log('Access check - User ID:', user._id, 'Role:', user.role, 'Has access:', hasAccess);

    if (!hasAccess) {
      console.log('Access denied for user:', user._id);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add content preview and attachments to the response
    const submissionObject = submission.toObject();
    if (type === 'assignment') {
      submissionObject.contentPreview = submission.content ? 
        submission.content.substring(0, 100) + (submission.content.length > 100 ? '...' : '') : 
        'No content';
    } else {
      submissionObject.contentPreview = 'Quiz submission';
      
      // Add detailed quiz data for quiz submissions
      if (submission.quizData && submission.course?.quizzes) {
        const quiz = submission.course.quizzes[submission.quizData.quizIndex];
        if (quiz) {
          // Calculate correct answers
          let correctAnswers = 0;
          const detailedAnswers = submission.quizData.answers.map((answer, index) => {
            const question = quiz.questions[index];
            const isCorrect = question && answer === question.correctAnswer;
            if (isCorrect) correctAnswers++;
            return {
              questionIndex: index,
              selectedOption: answer,
              correctOption: question ? question.correctAnswer : null,
              isCorrect: isCorrect
            };
          });
          
          submissionObject.quizDetails = {
            title: quiz.title,
            score: submission.quizData.score,
            correctAnswers: correctAnswers,
            totalQuestions: quiz.questions.length,
            answers: detailedAnswers
          };
        }
      }
    }

    console.log('Returning submission data');
    res.json({ submission: { ...submissionObject, type } });
  } catch (error) {
    console.error('Submission fetch error:', error);
    // Log the full error stack for debugging
    console.error('Full error stack:', error.stack);
    res.status(500).json({ message: 'Failed to fetch submission', error: error.message });
  }
});

// ---------------- Create or update assignment submission ----------------
router.post(
  '/',
  verifyFirebaseToken,
  requireStudent,
  [
    body('assignment').isMongoId().withMessage('Assignment ID must be valid'),
    body('content').optional().isString(),
    body('attachments').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array(),
          details: req.body // Add details for debugging
        });
      }

      const { assignment: assignmentId, content, attachments } = req.body;
      const studentId = req.currentUser._id;

      // Log the incoming data for debugging
      console.log('Submission request data:', { assignmentId, content, attachments, studentId });

      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      // Check if assignment is open for submissions
      if (typeof assignment.isOpen !== 'function' || !assignment.isOpen()) {
        return res.status(400).json({ 
          message: 'Assignment not accepting submissions',
          details: {
            isActive: assignment.isActive,
            isPublished: assignment.isPublished,
            startDate: assignment.startDate,
            dueDate: assignment.dueDate,
            currentDate: new Date()
          }
        });
      }
      
      // Check if assignment is for the student's batch
      if (assignment.batch && req.currentUser.batch && assignment.batch !== req.currentUser.batch) {
        return res.status(403).json({ message: `This assignment is only for ${assignment.batch} batch` });
      }

      let submission = await AssignmentSubmission.findOne({ assignment: assignmentId, student: studentId });
      if (submission && submission.status === 'submitted') {
        return res.status(400).json({ message: 'Already submitted' });
      }

      if (!submission) {
        submission = new AssignmentSubmission({ 
          assignment: assignmentId, 
          student: studentId, 
          content, 
          attachments: attachments || [], 
          attemptNumber: 1 
        });
      } else {
        submission.content = content;
        submission.attachments = attachments || [];
        submission.attemptNumber += 1;
      }

      await submission.save();
      const populated = await AssignmentSubmission.findById(submission._id)
        .populate('assignment', 'title dueDate maxPoints');
      res.status(201).json({ message: 'Submission saved', submission: populated });
    } catch (error) {
      console.error('Submission creation error:', error);
      res.status(500).json({ message: 'Failed to save submission', error: error.message });
    }
  }
);

// ---------------- Submit assignment ----------------
router.post('/:id/submit', verifyFirebaseToken, requireStudent, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.student.toString() !== req.currentUser._id.toString()) return res.status(403).json({ message: 'Access denied' });

    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    await submission.submit(assignment);
    const populated = await AssignmentSubmission.findById(submission._id).populate('assignment', 'title dueDate maxPoints');
    res.json({ message: 'Assignment submitted', submission: populated });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ message: 'Failed to submit assignment', error: error.message });
  }
});

// ---------------- Submit quiz ----------------
router.post('/quiz', verifyFirebaseToken, requireStudent, async (req, res) => {
  try {
    const { courseId, quizIndex, answers } = req.body;
    if (!courseId || quizIndex === undefined || !answers) return res.status(400).json({ message: 'courseId, quizIndex, and answers required' });

    const studentId = req.currentUser._id;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrolled = course.enrolledStudents.some(e => e.studentId.toString() === studentId.toString() && e.status === 'active');
    if (!enrolled) return res.status(403).json({ message: 'Not enrolled in course' });
    if (course.batch && req.currentUser.batch && course.batch !== req.currentUser.batch)
      return res.status(403).json({ message: `Only for ${course.batch} batch` });
    if (!course.quizzes || quizIndex >= course.quizzes.length) return res.status(404).json({ message: 'Quiz not found' });

    const quiz = course.quizzes[quizIndex];
    const answersArray = quiz.questions.map((q, idx) => (answers[idx] !== undefined ? parseInt(answers[idx]) : null));

    let correctAnswers = 0;
    quiz.questions.forEach((q, idx) => {
      if (answersArray[idx] === q.correctAnswer) correctAnswers++;
    });
    const score = (correctAnswers / quiz.questions.length) * 100;

    let submission = await QuizSubmission.findOne({ student: studentId, course: courseId, 'quizData.quizIndex': quizIndex });
    if (submission) {
      submission.quizData = { quizIndex, answers: answersArray, score, maxScore: 100 };
      submission.grade = { points: score, percentage: score, gradedAt: new Date() };
      submission.status = 'graded';
    } else {
      submission = new QuizSubmission({ student: studentId, course: courseId, quizData: { quizIndex, answers: answersArray, score, maxScore: 100 }, grade: { points: score, percentage: score, gradedAt: new Date() }, status: 'graded' });
    }

    await submission.save();
    res.json({ message: 'Quiz submitted', score, correctAnswers, totalQuestions: quiz.questions.length });
  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ message: 'Failed to submit quiz', error: error.message });
  }
});

// ---------------- Upload files ----------------
router.post('/:id/upload', verifyFirebaseToken, requireStudent, upload.array('attachments', 10), async (req, res) => {
  try {
    let submission = await AssignmentSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.student.toString() !== req.currentUser._id.toString()) return res.status(403).json({ message: 'Access denied' });

    if (req.files && req.files.length > 0) {
      const attachments = req.files.map(f => ({ filename: f.filename, originalName: f.originalname, mimeType: f.mimetype, size: f.size, url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${f.filename}`, uploadedAt: new Date() }));
      submission.attachments = [...submission.attachments, ...attachments];
      await submission.save();
      res.json({ message: 'Files uploaded', attachments });
    } else {
      res.json({ message: 'No files uploaded' });
    }
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to upload files', error: error.message });
  }
});

// ---------------- Export router ----------------
module.exports = router;