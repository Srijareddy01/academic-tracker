const mongoose = require('mongoose');

const quizSubmissionSchema = new mongoose.Schema({
  // For course-based quizzes (no assignment)
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Quiz data for course quizzes
  quizData: {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course.quizzes'
    },
    quizIndex: {
      type: Number,
      required: true
    },
    answers: [{
      type: Number
    }],
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    maxScore: {
      type: Number,
      default: 100
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  grade: {
    points: {
      type: Number,
      min: 0,
      max: 100
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gradedAt: {
      type: Date
    },
    feedback: {
      type: String,
      maxlength: 2000
    }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'graded', 'returned'],
    default: 'submitted' // Quizzes are typically submitted immediately
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes for better query performance
quizSubmissionSchema.index({ course: 1 });
quizSubmissionSchema.index({ student: 1 });
quizSubmissionSchema.index({ submittedAt: 1 });
quizSubmissionSchema.index({ status: 1 });
// Index for unique quiz submissions per student per course
quizSubmissionSchema.index({ student: 1, course: 1, 'quizData.quizIndex': 1 }, { unique: true });

// Virtual for final grade
quizSubmissionSchema.virtual('finalGrade').get(function() {
  return this.grade.points || this.quizData.score;
});

// Method to grade the quiz submission
quizSubmissionSchema.methods.gradeSubmission = async function(gradedBy, points, feedback) {
  this.grade = {
    points,
    percentage: points, // Since max is 100
    gradedBy,
    gradedAt: new Date(),
    feedback
  };
  this.status = 'graded';
  
  return this.save();
};

// Method to return graded submission to student
quizSubmissionSchema.methods.returnToStudent = async function() {
  if (this.status !== 'graded') {
    throw new Error('Can only return graded quizzes');
  }
  
  this.status = 'returned';
  return this.save();
};

// Static method to find submissions by course
quizSubmissionSchema.statics.findByCourse = function(courseId) {
  return this.find({ course: courseId }).populate('student', 'firstName lastName email');
};

// Static method to find submissions by student
quizSubmissionSchema.statics.findByStudent = function(studentId) {
  return this.find({ student: studentId });
};

// Static method to find submissions by quiz
quizSubmissionSchema.statics.findByQuiz = function(courseId, quizIndex) {
  return this.find({ 
    course: courseId, 
    'quizData.quizIndex': quizIndex 
  }).populate('student', 'firstName lastName email');
};

// Static method to get quiz statistics
quizSubmissionSchema.statics.getQuizStats = function(courseId, quizIndex) {
  return this.aggregate([
    { $match: { course: mongoose.Types.ObjectId(courseId), 'quizData.quizIndex': quizIndex } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        averageScore: { $avg: '$quizData.score' },
        highestScore: { $max: '$quizData.score' },
        lowestScore: { $min: '$quizData.score' }
      }
    }
  ]);
};

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);