# Academic Progress Tracker - Setup Guide

This guide will help you set up the Academic Progress Tracker application from scratch.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (local installation or MongoDB Atlas account)
- **Firebase Account** - [Sign up here](https://firebase.google.com/)
- **Git** - [Download here](https://git-scm.com/)

## 🔧 Step 1: Clone the Repository

```bash
git clone <repository-url>
cd academic-progress-tracker
```

## 🔧 Step 2: Firebase Setup

### 2.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: "Academic Progress Tracker"
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2.2 Enable Authentication

1. In your Firebase project, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### 2.3 Enable Firestore Database

1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database
5. Click "Done"

### 2.4 Generate Service Account Key

1. Go to Project Settings (gear icon)
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file
5. Keep this file secure - you'll need it for the backend

### 2.5 Get Firebase Config

1. Go to Project Settings
2. Scroll down to "Your apps"
3. Click "Add app" and select Web (</>) icon
4. Register your app with a nickname
5. Copy the Firebase configuration object

## 🔧 Step 3: MongoDB Setup

### Option A: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. Create a database named `academic-progress-tracker`

### Option B: MongoDB Atlas (Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Create a database user
5. Get your connection string

## 🔧 Step 4: Backend Setup

### 4.1 Navigate to Backend Directory

```bash
cd backend
```

### 4.2 Install Dependencies

```bash
npm install
```

### 4.3 Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` file with your configuration:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/academic-progress-tracker
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/academic-progress-tracker

# Firebase Configuration (from service account JSON)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4.4 Start Backend Server

```bash
npm run dev
```

The backend server will start on `http://localhost:5000`

## 🔧 Step 5: Frontend Setup

### 5.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

### 5.2 Install Dependencies

```bash
npm install
```

### 5.3 Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` file with your Firebase configuration:

```env
# Firebase Configuration (from Firebase Console)
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-firebase-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id

# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Environment
REACT_APP_ENV=development
```

### 5.4 Start Frontend Development Server

```bash
npm start
```

The frontend will start on `http://localhost:3000`

## 🔧 Step 6: Verify Installation

### 6.1 Check Backend Health

Visit `http://localhost:5000/api/health` in your browser. You should see:

```json
{
  "status": "OK",
  "timestamp": "2023-...",
  "environment": "development"
}
```

### 6.2 Check Frontend

Visit `http://localhost:3000` in your browser. You should see the login page.

### 6.3 Test Registration

1. Click "Create a new account" on the login page
2. Fill out the registration form
3. Choose your role (Instructor or Student)
4. Submit the form
5. You should be redirected to the dashboard

## 🚀 Step 7: First Steps

### 7.1 For Instructors

1. **Create a Course**:
   - Go to Courses page
   - Click "Create Course"
   - Fill in course details
   - Save the course

2. **Create an Assignment**:
   - Go to Assignments page
   - Click "Create Assignment"
   - Fill in assignment details
   - Publish the assignment

### 7.2 For Students

1. **Enroll in a Course**:
   - Go to Courses page
   - Find a course to enroll in
   - Click "Enroll"

2. **Submit an Assignment**:
   - Go to Assignments page
   - Find an assignment
   - Click "Submit Assignment"
   - Upload your work

## 🔧 Troubleshooting

### Common Issues

#### Backend Issues

**MongoDB Connection Error**:
- Check your MongoDB URI
- Ensure MongoDB is running
- Verify database credentials

**Firebase Authentication Error**:
- Check your Firebase service account key
- Verify Firebase project ID
- Ensure all Firebase environment variables are correct

#### Frontend Issues

**Firebase Configuration Error**:
- Check your Firebase config in `.env`
- Verify Firebase project settings
- Ensure Authentication is enabled

**API Connection Error**:
- Check if backend server is running
- Verify `REACT_APP_API_URL` in `.env`
- Check CORS settings in backend

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

### Logs

Check console logs for detailed error messages:
- Backend: Terminal where you ran `npm run dev`
- Frontend: Browser Developer Tools Console

## 📚 Next Steps

1. **Customize the Application**:
   - Modify the UI components
   - Add new features
   - Customize the styling

2. **Deploy to Production**:
   - Set up production databases
   - Configure production Firebase
   - Deploy to cloud platforms

3. **Add Advanced Features**:
   - Real-time notifications
   - File upload handling
   - Advanced analytics
   - Mobile responsiveness

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Verify all environment variables
4. Ensure all services are running
5. Check Firebase and MongoDB connections

For additional help, create an issue in the repository or contact support.

## 🎉 Congratulations!

You have successfully set up the Academic Progress Tracker application! You can now:

- Register users as Instructors or Students
- Create and manage courses
- Create and submit assignments
- Track academic progress
- View grades and analytics

Happy coding! 🚀
