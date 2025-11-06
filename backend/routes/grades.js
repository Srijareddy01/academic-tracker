const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const QuizSubmission = require('../models/QuizSubmission');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const { verifyFirebaseToken, requireStudent, requireInstructor } = require('../middleware/auth');

// Get student's grades
router.get('/student', verifyFirebaseToken, requireStudent, async (req, res) => {
  try {
    // Get assignment submissions for this student
    const assignmentSubmissions = await AssignmentSubmission.findByStudent(req.currentUser._id)
      .populate('assignment', 'title dueDate maxPoints assignmentType');
    
    // Get quiz submissions for this student
    const quizSubmissions = await QuizSubmission.findByStudent(req.currentUser._id)
      .populate('course', 'title');
    
    // Combine submissions
    const submissions = [
      ...assignmentSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'assignment'
      })),
      ...quizSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'quiz'
      }))
    ];

    res.json({ submissions });
  } catch (error) {
    console.error('Grades fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch grades', error: error.message });
  }
});

// Get grades for a specific course (instructor only)
router.get('/course/:courseId', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.currentUser._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get assignment submissions for this course
    const assignmentSubmissions = await AssignmentSubmission.findByCourse(req.params.courseId)
      .populate('student', 'firstName lastName email studentId')
      .populate('assignment', 'title maxPoints assignmentType');
    
    // Get quiz submissions for this course
    const quizSubmissions = await QuizSubmission.findByCourse(req.params.courseId)
      .populate('student', 'firstName lastName email studentId');
    
    // Combine submissions
    const submissions = [
      ...assignmentSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'assignment'
      })),
      ...quizSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'quiz'
      }))
    ];

    res.json({ submissions });
  } catch (error) {
    console.error('Course grades fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch course grades', error: error.message });
  }
});

// Get course grade statistics (instructor only)
router.get('/course/:courseId/stats', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.currentUser._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get assignment submission statistics
    const assignmentSubmissions = await AssignmentSubmission.find({ course: req.params.courseId });
    
    // Get quiz submission statistics
    const quizSubmissions = await QuizSubmission.find({ course: req.params.courseId });

    // Calculate assignment statistics
    const assignmentStats = {
      total: assignmentSubmissions.length,
      graded: assignmentSubmissions.filter(s => s.status === 'graded' || s.status === 'returned').length,
      averageGrade: assignmentSubmissions.length > 0 
        ? assignmentSubmissions.reduce((sum, sub) => sum + (sub.grade?.points || 0), 0) / assignmentSubmissions.length
        : 0
    };

    // Calculate quiz statistics
    const quizStats = {
      total: quizSubmissions.length,
      graded: quizSubmissions.filter(s => s.status === 'graded' || s.status === 'returned').length,
      averageScore: quizSubmissions.length > 0 
        ? quizSubmissions.reduce((sum, sub) => sum + (sub.grade?.points || sub.quizData?.score || 0), 0) / quizSubmissions.length
        : 0
    };

    res.json({ 
      assignmentStats,
      quizStats,
      overallStats: {
        totalSubmissions: assignmentStats.total + quizStats.total,
        totalGraded: assignmentStats.graded + quizStats.graded,
        averageGrade: assignmentStats.total + quizStats.total > 0 
          ? ((assignmentStats.averageGrade * assignmentStats.total) + (quizStats.averageScore * quizStats.total)) / (assignmentStats.total + quizStats.total)
          : 0
      }
    });
  } catch (error) {
    console.error('Course grade stats error:', error);
    res.status(500).json({ message: 'Failed to fetch course grade statistics', error: error.message });
  }
});

// Export grades for a course (instructor only)
router.get('/course/:courseId/export', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.currentUser._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get assignment submissions for this course
    const assignmentSubmissions = await AssignmentSubmission.findByCourse(req.params.courseId)
      .populate('student', 'firstName lastName email studentId batch');
    
    // Get quiz submissions for this course
    const quizSubmissions = await QuizSubmission.findByCourse(req.params.courseId)
      .populate('student', 'firstName lastName email studentId batch');

    // Format data for export
    const exportData = [
      ...assignmentSubmissions.map(sub => ({
        studentName: `${sub.student.firstName} ${sub.student.lastName}`,
        studentId: sub.student.studentId,
        studentEmail: sub.student.email,
        studentBatch: sub.student.batch,
        type: 'Assignment',
        title: sub.assignment?.title || 'Unknown Assignment',
        points: sub.grade?.points || 0,
        maxPoints: sub.assignment?.maxPoints || 100,
        percentage: sub.grade?.percentage || 0,
        submittedAt: sub.submittedAt,
        gradedAt: sub.grade?.gradedAt
      })),
      ...quizSubmissions.map(sub => ({
        studentName: `${sub.student.firstName} ${sub.student.lastName}`,
        studentId: sub.student.studentId,
        studentEmail: sub.student.email,
        studentBatch: sub.student.batch,
        type: 'Quiz',
        title: `Quiz ${sub.quizData?.quizIndex + 1}` || 'Unknown Quiz',
        points: sub.grade?.points || sub.quizData?.score || 0,
        maxPoints: 100,
        percentage: sub.grade?.percentage || sub.quizData?.score || 0,
        submittedAt: sub.submittedAt,
        gradedAt: sub.grade?.gradedAt
      }))
    ];

    res.json({ 
      course: {
        title: course.title,
        code: course.code
      },
      data: exportData,
      exportedAt: new Date()
    });
  } catch (error) {
    console.error('Grade export error:', error);
    res.status(500).json({ message: 'Failed to export grades', error: error.message });
  }
});

// Get student's grade summary
router.get('/student/summary', verifyFirebaseToken, requireStudent, async (req, res) => {
  try {
    // Get assignment submissions for this student
    const assignmentSubmissions = await AssignmentSubmission.findByStudent(req.currentUser._id)
      .populate('assignment', 'title maxPoints assignmentType dueDate')
      .populate('course', 'title code');
    
    // Get quiz submissions for this student
    const quizSubmissions = await QuizSubmission.findByStudent(req.currentUser._id)
      .populate('course', 'title code');

    // Combine submissions
    const allSubmissions = [
      ...assignmentSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'assignment'
      })),
      ...quizSubmissions.map(sub => ({
        ...sub.toObject(),
        type: 'quiz'
      }))
    ];

    const gradedSubmissions = allSubmissions.filter(s => 
      (s.grade && s.grade.points !== null) || 
      (s.quizData && s.quizData.score !== null)
    );
    
    // Group by course
    const courseGrades = {};
    
    gradedSubmissions.forEach(submission => {
      const courseId = submission.course._id.toString();
      if (!courseGrades[courseId]) {
        courseGrades[courseId] = {
          course: submission.course,
          assignments: [],
          totalPoints: 0,
          maxPoints: 0,
          averageGrade: 0
        };
      }
      
      let points, maxPoints, percentage;
      if (submission.type === 'assignment') {
        points = submission.grade.points;
        maxPoints = submission.assignment.maxPoints;
        percentage = (submission.grade.points / submission.assignment.maxPoints) * 100;
      } else {
        // For quizzes
        points = submission.grade?.points || submission.quizData?.score || 0;
        maxPoints = 100; // Quizzes have a fixed max score of 100
        percentage = submission.grade?.percentage || submission.quizData?.score || 0;
      }
      
      courseGrades[courseId].assignments.push({
        assignment: submission.assignment || { title: `Quiz ${submission.quizData?.quizIndex + 1}` },
        grade: points,
        percentage: percentage
      });
      
      courseGrades[courseId].totalPoints += points;
      courseGrades[courseId].maxPoints += maxPoints;
    });

    // Calculate averages
    Object.values(courseGrades).forEach(course => {
      course.averageGrade = course.maxPoints > 0 ? (course.totalPoints / course.maxPoints) * 100 : 0;
    });

    res.json({ courseGrades });
  } catch (error) {
    console.error('Student grade summary error:', error);
    res.status(500).json({ message: 'Failed to fetch grade summary', error: error.message });
  }
});

// Update grade (instructor only)
router.put('/:submissionId', verifyFirebaseToken, requireInstructor, [
  body('points').isNumeric().isFloat({ min: 0 }),
  body('feedback').optional().isLength({ max: 2000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Try to find as assignment submission first
    let submission = await AssignmentSubmission.findById(req.params.submissionId);
    let type = 'assignment';
    
    // If not found, try as quiz submission
    if (!submission) {
      submission = await QuizSubmission.findById(req.params.submissionId);
      type = 'quiz';
    }
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const { points, feedback } = req.body;

    if (type === 'assignment') {
      const assignment = await Assignment.findById(submission.assignment);
      if (assignment.instructor.toString() !== req.currentUser._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      submission.grade.points = points;
      submission.grade.percentage = (points / assignment.maxPoints) * 100;
      submission.grade.gradedBy = req.currentUser._id;
      submission.grade.gradedAt = new Date();
      if (feedback) submission.grade.feedback = feedback;

      await submission.save();

      res.json({
        message: 'Grade updated successfully',
        submission: await AssignmentSubmission.findById(submission._id)
          .populate('student', 'firstName lastName email')
          .populate('assignment', 'title maxPoints')
      });
    } else {
      // For quiz submissions
      submission.grade.points = points;
      submission.grade.percentage = points; // Since max is 100 for quizzes
      submission.grade.gradedBy = req.currentUser._id;
      submission.grade.gradedAt = new Date();
      if (feedback) submission.grade.feedback = feedback;

      await submission.save();

      res.json({
        message: 'Grade updated successfully',
        submission: await QuizSubmission.findById(submission._id)
          .populate('student', 'firstName lastName email')
          .populate('course', 'title')
      });
    }
  } catch (error) {
    console.error('Grade update error:', error);
    res.status(500).json({ message: 'Failed to update grade', error: error.message });
  }
});

module.exports = router;
