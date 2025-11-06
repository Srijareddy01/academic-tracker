const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    maxlength: 10000
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  isLate: {
    type: Boolean,
    default: false
  },
  latePenalty: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  grade: {
    points: {
      type: Number,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    letterGrade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
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
    },
    rubricScores: [{
      criteria: String,
      points: Number,
      maxPoints: Number,
      feedback: String
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'graded', 'returned'],
    default: 'draft'
  },
  isPlagiarized: {
    type: Boolean,
    default: false
  },
  plagiarismScore: {
    type: Number,
    min: 0,
    max: 100
  },
  groupMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    content: String,
    attachments: [Object],
    submittedAt: Date,
    version: Number
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
assignmentSubmissionSchema.index({ assignment: 1 });
assignmentSubmissionSchema.index({ student: 1 });
assignmentSubmissionSchema.index({ submittedAt: 1 });
assignmentSubmissionSchema.index({ status: 1 });
// Composite index for unique constraints
assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

// Virtual for final grade after late penalty
assignmentSubmissionSchema.virtual('finalGrade').get(function() {
  if (!this.grade.points) return null;
  
  let finalPoints = this.grade.points;
  if (this.isLate && this.latePenalty > 0) {
    const penaltyAmount = (this.grade.points * this.latePenalty) / 100;
    finalPoints = Math.max(0, this.grade.points - penaltyAmount);
  }
  
  return finalPoints;
});

// Virtual for time until due date when submitted
assignmentSubmissionSchema.virtual('submissionTiming').get(function() {
  if (!this.submittedAt) return null;
  
  // This would need the assignment's due date, which requires population
  return {
    submittedAt: this.submittedAt,
    isLate: this.isLate
  };
});

// Method to calculate late penalty
assignmentSubmissionSchema.methods.calculateLatePenalty = function(assignment) {
  if (!this.isLate || !assignment.settings.lateSubmissionPenalty) {
    return 0;
  }
  
  const hoursLate = (this.submittedAt - assignment.dueDate) / (1000 * 60 * 60);
  const penaltyRate = assignment.settings.lateSubmissionPenalty;
  
  // Example: 10% penalty per day late
  const penaltyDays = Math.ceil(hoursLate / 24);
  return Math.min(penaltyRate * penaltyDays, 100);
};

// Method to submit the assignment
assignmentSubmissionSchema.methods.submit = async function(assignment) {
  if (this.status === 'submitted') {
    throw new Error('Assignment already submitted');
  }
  
  // Check if assignment is still open
  if (!assignment.isOpen()) {
    throw new Error('Assignment is no longer accepting submissions');
  }
  
  this.status = 'submitted';
  this.submittedAt = new Date();
  
  // Check if submission is late
  if (this.submittedAt > assignment.dueDate) {
    this.isLate = true;
    this.latePenalty = this.calculateLatePenalty(assignment);
  }
  
  return this.save();
};

// Method to grade the submission
assignmentSubmissionSchema.methods.gradeSubmission = async function(gradedBy, points, feedback, rubricScores) {
  if (this.status !== 'submitted') {
    throw new Error('Cannot grade submission that has not been submitted');
  }
  
  this.grade = {
    points,
    percentage: points, // Will be updated when populated
    gradedBy,
    gradedAt: new Date(),
    feedback,
    rubricScores: rubricScores || []
  };
  this.status = 'graded';
  
  return this.save();
};

// Method to return graded submission to student
assignmentSubmissionSchema.methods.returnToStudent = async function() {
  if (this.status !== 'graded') {
    throw new Error('Can only return graded assignments');
  }
  
  this.status = 'returned';
  return this.save();
};

// Static method to find submissions by assignment
assignmentSubmissionSchema.statics.findByAssignment = function(assignmentId) {
  return this.find({ assignment: assignmentId }).populate('student', 'firstName lastName email');
};

// Static method to find submissions by student
assignmentSubmissionSchema.statics.findByStudent = function(studentId) {
  return this.find({ student: studentId }).populate('assignment', 'title dueDate maxPoints');
};

// Static method to get submission statistics
assignmentSubmissionSchema.statics.getSubmissionStats = function(assignmentId) {
  return this.aggregate([
    { $match: { assignment: mongoose.Types.ObjectId(assignmentId) } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        gradedSubmissions: { $sum: { $cond: [{ $ne: ['$grade.points', null] }, 1, 0] } },
        lateSubmissions: { $sum: { $cond: ['$isLate', 1, 0] } },
        averageGrade: { $avg: '$grade.points' }
      }
    }
  ]);
};

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);