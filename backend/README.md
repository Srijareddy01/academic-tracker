# Academic Progress Tracker - Backend

Backend API for the Academic Progress Tracker application built with Node.js, Express.js, MongoDB, and Firebase.

## 🚀 Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with your MongoDB and Firebase credentials.

4. Start the development server:
```bash
npm run dev
```

## 📁 Project Structure

```
backend/
├── models/              # MongoDB models
│   ├── User.js         # User model
│   ├── Course.js       # Course model
│   ├── Assignment.js   # Assignment model
│   └── Submission.js   # Submission model
├── routes/             # API routes
│   ├── auth.js         # Authentication routes
│   ├── users.js        # User management routes
│   ├── courses.js      # Course management routes
│   ├── assignments.js  # Assignment routes
│   ├── submissions.js  # Submission routes
│   ├── grades.js       # Grade management routes
│   └── notifications.js # Notification routes
├── middleware/         # Custom middleware
│   └── auth.js         # Authentication middleware
├── server.js           # Express server setup
└── package.json       # Dependencies and scripts
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/profile-picture` - Upload profile picture
- `DELETE /api/auth/account` - Delete user account

### Courses
- `GET /api/courses` - Get user's courses
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create new course (instructor only)
- `PUT /api/courses/:id` - Update course (instructor only)
- `POST /api/courses/:id/enroll` - Enroll in course (student only)
- `POST /api/courses/:id/drop` - Drop course (student only)
- `GET /api/courses/:id/stats` - Get course statistics
- `DELETE /api/courses/:id` - Delete course (instructor only)

### Assignments
- `GET /api/assignments/course/:courseId` - Get assignments for course
- `GET /api/assignments/:id` - Get assignment details
- `POST /api/assignments` - Create assignment (instructor only)
- `PUT /api/assignments/:id` - Update assignment (instructor only)
- `POST /api/assignments/:id/publish` - Publish assignment
- `POST /api/assignments/:id/unpublish` - Unpublish assignment
- `GET /api/assignments/:id/stats` - Get assignment statistics
- `DELETE /api/assignments/:id` - Delete assignment

### Submissions
- `GET /api/submissions/assignment/:assignmentId` - Get submissions for assignment
- `GET /api/submissions/student` - Get student's submissions
- `GET /api/submissions/:id` - Get submission details
- `POST /api/submissions` - Create/update submission
- `POST /api/submissions/:id/submit` - Submit assignment
- `POST /api/submissions/:id/grade` - Grade submission (instructor only)
- `POST /api/submissions/:id/return` - Return graded submission
- `GET /api/submissions/assignment/:assignmentId/stats` - Get submission statistics

### Grades
- `GET /api/grades/student` - Get student's grades
- `GET /api/grades/course/:courseId` - Get grades for course
- `GET /api/grades/course/:courseId/stats` - Get course grade statistics
- `GET /api/grades/student/summary` - Get student's grade summary
- `PUT /api/grades/:submissionId` - Update grade (instructor only)

### Users
- `GET /api/users` - Get all users (instructor only)
- `GET /api/users/:id` - Get user details
- `GET /api/users/search/:query` - Search users
- `PUT /api/users/:id/status` - Update user status
- `GET /api/users/stats/overview` - Get user statistics

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/preferences` - Get notification preferences
- `PUT /api/notifications/preferences` - Update notification preferences

## 🔒 Authentication

The API uses Firebase Authentication with JWT tokens. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## 🛡️ Security Features

- Firebase Authentication integration
- JWT token validation
- Rate limiting (100 requests per 15 minutes per IP)
- CORS configuration
- Helmet for security headers
- Input validation using express-validator
- Role-based access control

## 📊 Database Models

### User Model
- Firebase UID integration
- Role-based access (instructor/student)
- Profile information
- Preferences and settings

### Course Model
- Course details and settings
- Instructor assignment
- Student enrollment management
- Course lifecycle tracking

### Assignment Model
- Assignment details and instructions
- Due dates and settings
- File attachments support
- Rubric and grading criteria

### Submission Model
- Student submissions
- File attachments
- Grading and feedback
- Version control
- Plagiarism detection

## 🚀 Deployment

1. Set up MongoDB Atlas for production database
2. Configure Firebase project for production
3. Set up environment variables
4. Deploy to your preferred platform (Heroku, Railway, DigitalOcean, etc.)

## 🧪 Testing

Run tests with:
```bash
npm test
```

## 📝 Environment Variables

See `.env.example` for all required environment variables.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
