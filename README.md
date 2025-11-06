# Academic Progress Tracker

A comprehensive web-based platform for educators and students to monitor and track academic progress in real-time. The system allows instructors to create courses and assignments, track student submissions, provide instant feedback, and visualize student engagement. Students can enroll in courses, view assignments, submit work, and track their progress and grades.

## 🏗️ Architecture

This project uses a hybrid architecture combining:

- **MongoDB** for persistent storage of users, courses, assignments, and submissions
- **Firebase Firestore** for real-time updates (live notifications, assignment progress, grade updates)
- **Firebase Authentication** for secure login and role-based access (Instructor/Student)
- **React.js + Tailwind CSS** for a responsive, clean UI
- **Node.js + Express.js** for backend API management

## 🚀 Features

### For Instructors
- Create and manage courses
- Create assignments with various types (homework, quiz, exam, project, lab, discussion)
- Track student submissions and progress
- Grade assignments with detailed feedback
- Real-time notifications for new submissions
- Analytics and progress visualization
- Student enrollment management

### For Students
- Enroll in courses
- View assignments and due dates
- Submit assignments with file uploads
- Track grades and feedback
- Receive real-time notifications
- View academic progress and analytics

## 🛠️ Technology Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- Firebase Admin SDK
- JWT Authentication
- Express Rate Limiting
- Helmet for Security
- Multer for File Uploads

### Frontend
- React 18 with Hooks
- React Router for navigation
- React Query for data fetching
- Firebase SDK for authentication
- Tailwind CSS for styling
- React Hook Form for form handling
- React Hot Toast for notifications
- Heroicons for icons

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Firebase project with Authentication and Firestore enabled

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/academic-progress-tracker
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
```

5. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-firebase-app-id
REACT_APP_API_URL=http://localhost:5000/api
```

5. Start the frontend development server:
```bash
npm start
```

## 🔧 Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password provider
3. Enable Firestore Database
4. Generate a service account key for Firebase Admin SDK
5. Configure your Firebase project settings in both backend and frontend `.env` files

## 📱 Usage

1. **Registration**: Users can register as either Instructors or Students
2. **Login**: Secure authentication using Firebase Auth
3. **Dashboard**: Role-based dashboard showing relevant information
4. **Course Management**: Instructors can create courses, students can enroll
5. **Assignment Management**: Create, submit, and grade assignments
6. **Real-time Updates**: Live notifications and progress tracking
7. **Analytics**: Progress visualization and grade tracking

## 🗂️ Project Structure

```
academic-progress-tracker/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API services
│   │   └── config/      # Configuration files
│   └── public/          # Static assets
└── README.md
```

## 🔒 Security Features

- Firebase Authentication for secure user management
- JWT token validation
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Helmet for security headers
- Role-based access control

## 🚀 Deployment

### Backend Deployment
- Deploy to platforms like Heroku, Railway, or DigitalOcean
- Set up MongoDB Atlas for production database
- Configure environment variables
- Set up Firebase Admin SDK

### Frontend Deployment
- Deploy to platforms like Vercel, Netlify, or Firebase Hosting
- Configure build settings
- Set up environment variables
- Configure Firebase project settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@academictracker.com or create an issue in the repository.

## 🔮 Future Enhancements

- Mobile app development
- Advanced analytics and reporting
- Integration with Learning Management Systems
- Video assignment submissions
- Plagiarism detection
- Advanced notification system
- Multi-language support
- Offline functionality
