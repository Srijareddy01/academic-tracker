import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import CompleteRegistration from './pages/Auth/CompleteRegistration';
import Dashboard from './pages/Dashboard/Dashboard';
import Courses from './pages/Courses/Courses';
import CourseDetail from './pages/Courses/CourseDetail';
import Assignments from './pages/Assignments/Assignments';
import AssignmentDetail from './pages/Assignments/AssignmentDetail';
import CreateAssignment from './pages/Assignments/CreateAssignment';
import EditAssignment from './pages/Assignments/EditAssignment';
import Submissions from './pages/Submissions/Submissions';
import SubmissionDetail from './pages/Submissions/SubmissionDetail';
import Grades from './pages/Grades/Grades';
import BatchAnalytics from './pages/Analytics/BatchAnalytics';
import Profile from './pages/Profile/Profile';
import Notifications from './pages/Notifications/Notifications';
import NotFound from './pages/NotFound/NotFound';

function App() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  // Apply theme to document
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
        />
        <Route 
          path="/complete-registration" 
          element={<CompleteRegistration />} 
        />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/create" element={<ProtectedRoute requiredRole="instructor"><CourseDetail /></ProtectedRoute>} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="assignments/create" element={<ProtectedRoute requiredRole="instructor"><CreateAssignment /></ProtectedRoute>} />
          <Route path="assignments/:id/edit" element={<ProtectedRoute requiredRole="instructor"><EditAssignment /></ProtectedRoute>} />
          <Route path="assignments/:id" element={<AssignmentDetail />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="submissions/:id" element={<SubmissionDetail />} />
          <Route path="analytics" element={<ProtectedRoute requiredRole="instructor"><BatchAnalytics /></ProtectedRoute>} />
          <Route path="grades" element={<Grades />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;