const mongoose = require('mongoose');

const CodingChallengeSchema = new mongoose.Schema({
  platform: { type: String, enum: ['leetcode', 'hackerrank', 'codechef', 'codeforces', 'other'], required: true },
  title: { type: String, required: true, trim: true },
  url: {
    type: String,
    required: true,
    validate: {
      validator: v => /^https?:\/\/.+$/.test(v),
      message: props => `${props.value} is not a valid URL!`
    }
  },
  assignmentNumber: { type: String, trim: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
});

const AssignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 5000 },
  batch: { type: String, trim: true, default: '', set: val => val ? val.toString().trim() : '' },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  maxPoints: { type: Number, required: true, min: 0 },
  assignmentType: { type: String, enum: ['homework', 'quiz', 'exam', 'project', 'lab', 'discussion', 'other', 'coding'], default: 'homework' },
  instructions: { type: String, maxlength: 10000 },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  codingChallenges: [CodingChallengeSchema],
  assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  settings: {
    allowLateSubmissions: { type: Boolean, default: false },
    lateSubmissionPenalty: { type: Number, default: 0, min: 0, max: 100 },
    maxAttempts: { type: Number, default: 1, min: 1 },
    timeLimit: { type: Number, default: null },
    requireFileUpload: { type: Boolean, default: false },
    allowedFileTypes: [String],
    maxFileSize: { type: Number, default: 10 },
    isGroupAssignment: { type: Boolean, default: false },
    maxGroupSize: { type: Number, default: 1 }
  },
  isActive: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  tags: [{ type: String, trim: true }],
  rubric: {
    criteria: [{ name: String, description: String, maxPoints: Number, weight: Number }],
    totalWeight: { type: Number, default: 100 }
  }
}, { timestamps: true });

// Indexes
AssignmentSchema.index({ instructor: 1, batch: 1, dueDate: 1, isPublished: 1, assignedStudents: 1 });

// Virtual
AssignmentSchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.startDate) return 'scheduled';
  if (now > this.dueDate) return 'overdue';
  return 'active';
});

// Methods
AssignmentSchema.methods.isStudentAssigned = function(studentId) {
  return this.assignedStudents.some(s => s.toString() === studentId.toString());
};

AssignmentSchema.methods.assignStudent = async function(studentId) {
  if (this.isStudentAssigned(studentId)) throw new Error('Student already assigned');
  this.assignedStudents.push(studentId);
  return await this.save();
};

AssignmentSchema.methods.unassignStudent = async function(studentId) {
  this.assignedStudents = this.assignedStudents.filter(s => s.toString() !== studentId.toString());
  return await this.save();
};

AssignmentSchema.methods.getSubmissionStats = async function() {
  try {
    const AssignmentSubmission = mongoose.model('AssignmentSubmission');
    const submissions = await AssignmentSubmission.find({ assignment: this._id });
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.grade?.points !== undefined).length;
    const averageScore = gradedSubmissions ? submissions.reduce((sum, s) => sum + (s.grade?.points || 0), 0) / gradedSubmissions : 0;
    return { totalSubmissions, gradedSubmissions, ungradedSubmissions: totalSubmissions - gradedSubmissions, averageScore: Math.round(averageScore * 100) / 100 };
  } catch (err) { return { totalSubmissions: 0, gradedSubmissions: 0, ungradedSubmissions: 0, averageScore: 0 }; }
};

// Method to check if assignment is open for submissions
AssignmentSchema.methods.isOpen = function() {
  const now = new Date();
  return this.isActive && 
         this.isPublished && 
         now >= this.startDate && 
         now <= this.dueDate;
};

// Statics
AssignmentSchema.statics.findByInstructor = async function(instructorId) {
  return await this.find({ instructor: instructorId, isActive: true })
    .populate('instructor', 'firstName lastName email')
    .populate('assignedStudents', 'firstName lastName email studentId')
    .sort({ dueDate: 1 });
};

// Fixed findByBatch to use exact matching instead of case-insensitive matching
AssignmentSchema.statics.findByBatch = async function(batch) {
  return await this.find({ 
    batch: batch,  // Exact match only
    isActive: true,
    isPublished: true
  })
  .populate('instructor', 'firstName lastName email')
  .populate('assignedStudents', 'firstName lastName email studentId')
  .sort({ dueDate: 1 });
};

module.exports = mongoose.model('Assignment', AssignmentSchema);

// const mongoose = require('mongoose');

// const assignmentSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 200
//   },
//   description: {
//     type: String,
//     required: true,
//     maxlength: 5000
//   },
//   // Removed course field
//   batch: {
//     type: String,
//     trim: true,
//     default: '',
//     set: function(value) {
//       // Normalize batch value when setting
//       return value ? value.toString().trim() : '';
//     }
//   },
//   instructor: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   dueDate: {
//     type: Date,
//     required: true
//   },
//   startDate: {
//     type: Date,
//     default: Date.now
//   },
//   maxPoints: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   assignmentType: {
//     type: String,
//     enum: ['homework', 'quiz', 'exam', 'project', 'lab', 'discussion', 'other', 'coding'],
//     default: 'homework'
//   },
//   instructions: {
//     type: String,
//     maxlength: 10000
//   },
//   attachments: [{
//     filename: String,
//     originalName: String,
//     mimeType: String,
//     size: Number,
//     url: String,
//     uploadedAt: {
//       type: Date,
//       default: Date.now
//     }
//   }],
//   // New field for coding challenge links
//   codingChallenges: [{
//     platform: {
//       type: String,
//       enum: ['leetcode', 'hackerrank', 'codechef', 'codeforces', 'other'],
//       required: true
//     },
//     title: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     url: {
//       type: String,
//       required: true,
//       validate: {
//         validator: function(v) {
//           return /^https?:\/\/.+$/.test(v);
//         },
//         message: props => `${props.value} is not a valid URL!`
//       }
//     },
//     assignmentNumber: {
//       type: String,
//       trim: true
//     },
//     difficulty: {
//       type: String,
//       enum: ['easy', 'medium', 'hard'],
//       default: 'medium'
//     }
//   }],
//   // Field to store students assigned to this assignment
//   assignedStudents: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }],
//   settings: {
//     allowLateSubmissions: {
//       type: Boolean,
//       default: false
//     },
//     lateSubmissionPenalty: {
//       type: Number,
//       default: 0,
//       min: 0,
//       max: 100
//     },
//     maxAttempts: {
//       type: Number,
//       default: 1,
//       min: 1
//     },
//     timeLimit: {
//       type: Number, // in minutes
//       default: null
//     },
//     requireFileUpload: {
//       type: Boolean,
//       default: false
//     },
//     allowedFileTypes: [String],
//     maxFileSize: {
//       type: Number, // in MB
//       default: 10
//     },
//     isGroupAssignment: {
//       type: Boolean,
//       default: false
//     },
//     maxGroupSize: {
//       type: Number,
//       default: 1
//     }
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   isPublished: {
//     type: Boolean,
//     default: false
//   },
//   publishedAt: {
//     type: Date,
//     default: null
//   },
//   tags: [{
//     type: String,
//     trim: true
//   }],
//   rubric: {
//     criteria: [{
//       name: String,
//       description: String,
//       maxPoints: Number,
//       weight: Number
//     }],
//     totalWeight: {
//       type: Number,
//       default: 100
//     }
//   }
// }, {
//   timestamps: true
// });

// // Indexes for better query performance
// assignmentSchema.index({ instructor: 1 });
// assignmentSchema.index({ batch: 1 });
// assignmentSchema.index({ dueDate: 1 });
// assignmentSchema.index({ isPublished: 1 });
// assignmentSchema.index({ 'assignedStudents': 1 }); // Index for assigned students
// assignmentSchema.index({ isActive: 1, isPublished: 1, batch: 1 }); // Compound index for common queries

// // Virtual for assignment status
// assignmentSchema.virtual('status').get(function() {
//   const now = new Date();
//   if (now < this.startDate) return 'scheduled';
//   if (now > this.dueDate) return 'overdue';
//   return 'active';
// });

// // Method to check if a student is assigned to this assignment
// assignmentSchema.methods.isStudentAssigned = function(studentId) {
//   return this.assignedStudents.some(student => 
//     student.toString() === studentId.toString()
//   );
// };

// // Method to assign a student to this assignment
// assignmentSchema.methods.assignStudent = async function(studentId) {
//   // Check if student is already assigned
//   if (this.isStudentAssigned(studentId)) {
//     throw new Error('Student is already assigned to this assignment');
//   }
  
//   this.assignedStudents.push(studentId);
//   return await this.save();
// };

// // Method to unassign a student from this assignment
// assignmentSchema.methods.unassignStudent = async function(studentId) {
//   this.assignedStudents = this.assignedStudents.filter(student => 
//     student.toString() !== studentId.toString()
//   );
//   return await this.save();
// };

// // Method to get submission statistics
// assignmentSchema.methods.getSubmissionStats = async function() {
//   try {
//     const AssignmentSubmission = mongoose.model('AssignmentSubmission');
//     const submissions = await AssignmentSubmission.find({ assignment: this._id });
    
//     const totalSubmissions = submissions.length;
//     const gradedSubmissions = submissions.filter(sub => sub.grade && sub.grade.points !== undefined).length;
    
//     let averageScore = 0;
//     if (gradedSubmissions > 0) {
//       const totalPoints = submissions.reduce((sum, sub) => {
//         return sum + (sub.grade && sub.grade.points !== undefined ? sub.grade.points : 0);
//       }, 0);
//       averageScore = totalPoints / gradedSubmissions;
//     }
    
//     return {
//       totalSubmissions,
//       gradedSubmissions,
//       ungradedSubmissions: totalSubmissions - gradedSubmissions,
//       averageScore: Math.round(averageScore * 100) / 100
//     };
//   } catch (error) {
//     console.error('Error calculating submission stats:', error);
//     return {
//       totalSubmissions: 0,
//       gradedSubmissions: 0,
//       ungradedSubmissions: 0,
//       averageScore: 0
//     };
//   }
// };

// // Static method to find assignments by instructor
// assignmentSchema.statics.findByInstructor = async function(instructorId) {
//   try {
//     return await this.find({ instructor: instructorId, isActive: true })
//       .populate('instructor', 'firstName lastName email')
//       .populate('assignedStudents', 'firstName lastName email studentId')
//       .sort({ dueDate: 1 });
//   } catch (error) {
//     console.error('Error finding assignments by instructor:', error);
//     return [];
//   }
// };

// // Static method to find assignments by batch
// assignmentSchema.statics.findByBatch = async function(batch) {
//   try {
//     return await this.find({ 
//       $or: [
//         { batch: batch },
//         { batch: batch.toLowerCase() },
//         { batch: batch.toUpperCase() },
//         { batch: '' },
//         { batch: null }
//       ],
//       isActive: true,
//       isPublished: true
//     })
//     .populate('instructor', 'firstName lastName email')
//     .populate('assignedStudents', 'firstName lastName email studentId')
//     .sort({ dueDate: 1 });
//   } catch (error) {
//     console.error('Error finding assignments by batch:', error);
//     return [];
//   }
// };

// module.exports = mongoose.model('Assignment', assignmentSchema);