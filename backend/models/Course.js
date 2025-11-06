const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 20
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enrolledStudents: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'dropped', 'completed'],
      default: 'active'
    }
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowLateSubmissions: {
      type: Boolean,
      default: false
    },
    lateSubmissionPenalty: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    requireApprovalForEnrollment: {
      type: Boolean,
      default: false
    },
    maxEnrollment: {
      type: Number,
      default: null
    },
    gradingScale: {
      type: String,
      enum: ['percentage', 'letter', 'points'],
      default: 'percentage'
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  batch: {
    type: String,
    trim: true,
    default: ''
  },
  // Store uploaded materials directly in the course
  materials: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Store quizzes directly in the course
  quizzes: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    questions: [{
      text: {
        type: String,
        required: true
      },
      options: [{
        type: String,
        required: true
      }],
      correctAnswer: {
        type: Number,
        required: true
      }
    }]
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
courseSchema.index({ code: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ 'enrolledStudents.studentId': 1 });
courseSchema.index({ isActive: 1 });
courseSchema.index({ startDate: 1, endDate: 1 });
courseSchema.index({ batch: 1 });

// Virtual for enrollment count
courseSchema.virtual('enrollmentCount').get(function() {
  const count = this.enrolledStudents.filter(student => student.status === 'active').length;
  console.log('Calculating enrollment count:', count, 'for students:', this.enrolledStudents); // Debug log
  return count;
});

// Virtual for course duration in days
courseSchema.virtual('duration').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Method to check if course is currently active
courseSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

// Method to enroll a student
courseSchema.methods.enrollStudent = function(studentId) {
  console.log('Enrolling student in course:', studentId); // Debug log
  console.log('Current enrolled students:', this.enrolledStudents); // Debug log
  
  // Check if student is already enrolled
  const existingEnrollment = this.enrolledStudents.find(
    enrollment => enrollment.studentId.toString() === studentId.toString()
  );
  
  if (existingEnrollment) {
    console.log('Student already enrolled, checking status:', existingEnrollment.status); // Debug log
    if (existingEnrollment.status === 'dropped') {
      existingEnrollment.status = 'active';
      existingEnrollment.enrolledAt = new Date();
      console.log('Reactivating dropped enrollment'); // Debug log
      return this.save();
    }
    throw new Error('Student is already enrolled in this course');
  }
  
  // Check enrollment limit
  if (this.settings.maxEnrollment && this.enrollmentCount >= this.settings.maxEnrollment) {
    throw new Error('Course enrollment limit reached');
  }
  
  console.log('Adding new enrollment for student'); // Debug log
  this.enrolledStudents.push({
    studentId,
    enrolledAt: new Date(),
    status: 'active'
  });
  
  return this.save();
};

// Method to drop a student
courseSchema.methods.dropStudent = function(studentId) {
  const enrollment = this.enrolledStudents.find(
    enrollment => enrollment.studentId.toString() === studentId.toString()
  );
  
  if (!enrollment) {
    throw new Error('Student is not enrolled in this course');
  }
  
  enrollment.status = 'dropped';
  return this.save();
};

// Method to get active students
courseSchema.methods.getActiveStudents = function() {
  return this.enrolledStudents.filter(student => student.status === 'active');
};

// Method to add material to course
courseSchema.methods.addMaterial = function(material) {
  this.materials.push(material);
  return this.save();
};

// Static method to find courses by instructor
courseSchema.statics.findByInstructor = async function(instructorId) {
  return await this.find({ instructor: instructorId, isActive: true })
    .populate('instructor', 'firstName lastName email')
    .populate('enrolledStudents.studentId', 'firstName lastName email studentId');
};

// Static method to find courses by student
courseSchema.statics.findByStudent = function(studentId) {
  console.log('Finding courses for student:', studentId); // Debug log
  const query = this.find({ 
    'enrolledStudents.studentId': studentId,
    'enrolledStudents.status': 'active',
    isActive: true 
  });
  console.log('Query:', query); // Debug log
  return query.populate('instructor', 'firstName lastName email');
};

// Static method to find all available courses (for students to browse)
courseSchema.statics.findAvailableCourses = function() {
  return this.find({ isActive: true })
    .populate('instructor', 'firstName lastName email profilePicture')
    .sort({ createdAt: -1 });
};

// Static method to find available courses excluding those already enrolled
courseSchema.statics.findAvailableCoursesForStudent = function(studentId) {
  return this.find({ 
    isActive: true,
    'enrolledStudents.studentId': { $ne: studentId }
  })
  .populate('instructor', 'firstName lastName email profilePicture')
  .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Course', courseSchema);