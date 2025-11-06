const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['instructor', 'student'],
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  institution: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  studentId: {
    type: String,
    default: ''
  },
  batch: {
    type: String,
    trim: true,
    default: '',
    set: function(value) {
      // Normalize batch value when setting
      return value ? value.toString().trim() : '';
    }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
      set: function(value) {
        // Normalize theme value when setting
        if (!value || !['light', 'dark', 'system'].includes(value)) {
          return 'system'; // Default to 'system' if invalid value
        }
        return value;
      },
      get: function(value) {
        // Normalize theme value when getting
        if (!value || !['light', 'dark', 'system'].includes(value)) {
          return 'system'; // Default to 'system' if invalid value
        }
        return value;
      }
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  codingProfiles: {
    leetcode: {
      username: String,
      url: String,
      problemsSolved: Number,
      rating: Number,
      rank: String,
      badges: [String]
    },
    hackerrank: {
      username: String,
      url: String,
      problemsSolved: Number,
      rating: Number,
      rank: String,
      badges: [String]
    },
    codechef: {
      username: String,
      url: String,
      problemsSolved: Number,
      rating: Number,
      rank: String,
      badges: [String]
    },
    codeforces: {
      username: String,
      url: String,
      problemsSolved: Number,
      rating: Number,
      rank: String,
      badges: [String]
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ firebaseUid: 1 });
userSchema.index({ role: 1 });
userSchema.index({ institution: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for user display name
userSchema.virtual('displayName').get(function() {
  return this.fullName;
});

// Method to get user's courses (for students)
userSchema.methods.getEnrolledCourses = async function() {
  try {
    const Course = mongoose.model('Course');
    return await Course.find({ 
      'enrolledStudents.studentId': this._id,
      isActive: true 
    }).populate('instructor', 'firstName lastName email');
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    return [];
  }
};

// Method to get user's created courses (for instructors)
userSchema.methods.getCreatedCourses = async function() {
  try {
    const Course = mongoose.model('Course');
    return await Course.find({ 
      instructor: this._id,
      isActive: true 
    }).populate('enrolledStudents.studentId', 'firstName lastName email');
  } catch (error) {
    console.error('Error fetching created courses:', error);
    return [];
  }
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find user by Firebase UID with error handling
userSchema.statics.findByFirebaseUid = async function(firebaseUid) {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('Database not connected, cannot fetch user by Firebase UID');
      return null;
    }
    
    // Use findOne with lean to avoid validation issues
    const user = await this.findOne({ firebaseUid, isActive: true });
    return user;
  } catch (error) {
    console.error('Error finding user by Firebase UID:', error);
    return null;
  }
};

// Static method to find users by role
userSchema.statics.findByRole = async function(role) {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('Database not connected, cannot fetch users by role');
      return [];
    }
    return await this.find({ role, isActive: true });
  } catch (error) {
    console.error('Error finding users by role:', error);
    return [];
  }
};

module.exports = mongoose.model('User', userSchema);