const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const QuizSubmission = require('../models/QuizSubmission');
const User = require('../models/User');
const { verifyFirebaseToken, requireInstructor } = require('../middleware/auth');

// Get batch performance analytics
router.get('/batch/:batch', verifyFirebaseToken, requireInstructor, async (req, res) => {
  try {
    const { batch } = req.params;
    
    // Get all students in this batch
    const students = await User.find({ 
      role: 'student', 
      batch: batch,
      isActive: true 
    }).select('firstName lastName email batch codingProfiles');
    
    if (students.length === 0) {
      return res.json({
        batch,
        totalStudents: 0,
        averageQuizScore: 0,
        averageAssignmentSubmissionRate: 0,
        topPerformers: [],
        bottomPerformers: [],
        codingProfileSummary: {
          averageProblemsSolved: 0,
          averageRating: 0
        }
      });
    }

    // Get all courses taught by this instructor
    const courses = await Course.findByInstructor(req.currentUser._id);
    const courseIds = courses.map(course => course._id);
    
    // Get all assignments for these courses
    const assignments = await Assignment.findByInstructor(req.currentUser._id);
    const assignmentIds = assignments.map(assignment => assignment._id);
    
    // Get all assignment submissions for these assignments from students in this batch
    const assignmentSubmissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
      student: { $in: students.map(s => s._id) }
    }).populate('assignment', 'title maxPoints assignmentType')
      .populate('student', 'firstName lastName email batch');
    
    // Get all quiz submissions from students in this batch for courses taught by this instructor
    const quizSubmissions = await QuizSubmission.find({
      course: { $in: courseIds },
      student: { $in: students.map(s => s._id) },
      'grade.points': { $exists: true }
    }).populate('student', 'firstName lastName email batch')
      .populate('course', 'title');
    
    console.log('Found assignment submissions:', assignmentSubmissions.length); // Debug log
    console.log('Found quiz submissions:', quizSubmissions.length); // Debug log
    
    // Combine all submissions
    const allSubmissions = [...assignmentSubmissions, ...quizSubmissions];
    
    // Calculate metrics
    const studentMetrics = students.map(student => {
      // Filter submissions for this student
      const studentSubmissions = allSubmissions.filter(sub => 
        sub.student._id.toString() === student._id.toString()
      );
      
      // Calculate quiz scores (both assignment quizzes and course quizzes)
      const quizSubmissions = studentSubmissions.filter(sub => {
        // Assignment quizzes
        if (sub.assignment && sub.assignment.assignmentType === 'quiz' && sub.grade?.points !== undefined) {
          return true;
        }
        // Course quizzes
        if (sub.quizData && sub.quizData.quizIndex !== undefined && (sub.grade?.points !== undefined || sub.quizData?.score !== undefined)) {
          return true;
        }
        return false;
      });
      
      const totalQuizPoints = quizSubmissions.reduce((sum, sub) => {
        if (sub.assignment) {
          // Assignment quiz
          return sum + (sub.grade?.points || 0);
        } else if (sub.quizData) {
          // Course quiz
          return sum + (sub.grade?.points || sub.quizData?.score || 0);
        }
        return sum;
      }, 0);
      
      const maxQuizPoints = quizSubmissions.reduce((sum, sub) => {
        if (sub.assignment) {
          // Assignment quiz
          return sum + (sub.assignment?.maxPoints || 100);
        } else if (sub.quizData) {
          // Course quiz
          return sum + (sub.quizData?.maxScore || 100);
        }
        return sum;
      }, 0);
      
      const averageQuizScore = maxQuizPoints > 0 
        ? (totalQuizPoints / maxQuizPoints) * 100 
        : 0;
      
      // Calculate assignment submission rate (only for assignments, not quizzes)
      const totalAssignments = assignments.filter(a => a.assignmentType !== 'quiz').length;
      const submittedAssignments = studentSubmissions.filter(sub => 
        sub.assignment && sub.assignment.assignmentType !== 'quiz' && sub.status === 'submitted'
      ).length;
      
      const assignmentSubmissionRate = totalAssignments > 0 
        ? (submittedAssignments / totalAssignments) * 100 
        : 0;
      
      // Calculate overall performance score (weighted average)
      const performanceScore = (averageQuizScore * 0.4) + (assignmentSubmissionRate * 0.6);
      
      return {
        studentId: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        batch: student.batch,
        averageQuizScore,
        assignmentSubmissionRate,
        performanceScore,
        totalAssignments,
        submittedAssignments,
        totalQuizSubmissions: quizSubmissions.length
      };
    });
    
    // Sort by performance score
    studentMetrics.sort((a, b) => b.performanceScore - a.performanceScore);
    
    // Get top and bottom performers
    const topPerformers = studentMetrics.slice(0, 5);
    const bottomPerformers = studentMetrics.slice(-5).reverse();
    
    // Calculate batch averages
    const totalQuizScores = studentMetrics.reduce((sum, metrics) => sum + metrics.averageQuizScore, 0);
    const averageQuizScore = studentMetrics.length > 0 ? totalQuizScores / studentMetrics.length : 0;
    
    const totalSubmissionRates = studentMetrics.reduce((sum, metrics) => sum + metrics.assignmentSubmissionRate, 0);
    const averageAssignmentSubmissionRate = studentMetrics.length > 0 ? totalSubmissionRates / studentMetrics.length : 0;
    
    // Calculate coding profile summary
    let totalProblemsSolved = 0;
    let totalRating = 0;
    let codingProfileCount = 0;
    
    students.forEach(student => {
      if (student.codingProfiles) {
        Object.values(student.codingProfiles).forEach(profile => {
          if (profile.problemsSolved) {
            totalProblemsSolved += profile.problemsSolved;
            codingProfileCount++;
          }
          if (profile.rating) {
            totalRating += profile.rating;
            codingProfileCount++;
          }
        });
      }
    });
    
    const averageProblemsSolved = codingProfileCount > 0 ? totalProblemsSolved / codingProfileCount : 0;
    const averageRating = codingProfileCount > 0 ? totalRating / codingProfileCount : 0;
    
    res.json({
      batch,
      totalStudents: students.length,
      averageQuizScore,
      averageAssignmentSubmissionRate,
      topPerformers,
      bottomPerformers,
      codingProfileSummary: {
        averageProblemsSolved,
        averageRating
      },
      studentMetrics
    });
  } catch (error) {
    console.error('Batch analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch batch analytics', error: error.message });
  }
});

module.exports = router;
