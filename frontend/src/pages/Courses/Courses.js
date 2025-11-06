import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PlusIcon, 
  AcademicCapIcon, 
  CalendarIcon, 
  UserGroupIcon,
  ClockIcon,
  BookOpenIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const Courses = () => {
  const { userProfile } = useAuth();
  const [viewMode, setViewMode] = useState('enrolled'); // 'enrolled' or 'available'

  // Fetch enrolled courses
  const { data: enrolledCourses, isLoading: isLoadingEnrolled, error: enrolledError, refetch: refetchEnrolled } = useQuery(
    'enrolledCourses',
    async () => {
      try {
        const response = await api.get('/courses');
        return response.data.courses || [];
      } catch (error) {
        console.error('Enrolled courses fetch error:', error);
        return [];
      }
    },
    {
      enabled: !!userProfile && userProfile.role === 'student',
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // Fetch available courses (for students)
  const { data: availableCourses, isLoading: isLoadingAvailable, error: availableError } = useQuery(
    'availableCourses',
    async () => {
      try {
        const response = await api.get('/courses/available');
        return response.data.courses || [];
      } catch (error) {
        console.error('Available courses fetch error:', error);
        return [];
      }
    },
    {
      enabled: !!userProfile && userProfile.role === 'student',
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // For instructors, we still use the original courses endpoint
  const { data: instructorCourses, isLoading: isLoadingInstructor, error: instructorError } = useQuery(
    'instructorCourses',
    async () => {
      try {
        const response = await api.get('/courses');
        return response.data.courses || [];
      } catch (error) {
        console.error('Instructor courses fetch error:', error);
        return [];
      }
    },
    {
      enabled: !!userProfile && userProfile.role === 'instructor',
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // Determine which courses to display based on user role and view mode
  let courses = [];
  let isLoading = false;
  let error = null;

  if (userProfile?.role === 'instructor') {
    courses = instructorCourses || [];
    isLoading = isLoadingInstructor;
    error = instructorError;
  } else if (userProfile?.role === 'student') {
    if (viewMode === 'enrolled') {
      courses = enrolledCourses || [];
      isLoading = isLoadingEnrolled;
      error = enrolledError;
    } else {
      courses = availableCourses || [];
      isLoading = isLoadingAvailable;
      error = availableError;
    }
  }

  // Handle course enrollment
  const handleEnroll = async (courseId) => {
    try {
      await api.post(`/courses/${courseId}/enroll`);
      toast.success('Successfully enrolled in course!');
      // Refetch enrolled courses
      refetchEnrolled();
    } catch (error) {
      console.error('Enrollment error:', error);
      // Display specific error message from backend if available
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to enroll in course. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Failed to load courses</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCourseStatus = (course) => {
    const now = new Date();
    const startDate = new Date(course.startDate);
    const endDate = new Date(course.endDate);

    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'completed';
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="page-title flex items-center">
              <BookOpenIcon className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
              Courses
            </h1>
            <p className="page-subtitle">
              {userProfile?.role === 'instructor' 
                ? 'Manage your courses and track progress' 
                : viewMode === 'enrolled' 
                  ? 'Your enrolled courses' 
                  : 'Available courses to enroll in'}
            </p>
          </div>
          {userProfile?.role === 'instructor' && (
            <div className="mt-4 md:mt-0">
              <Link
                to="/courses/create"
                className="btn-primary inline-flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Course
              </Link>
            </div>
          )}
        </div>
        
        {userProfile?.role === 'student' && (
          <div className="mt-6 flex space-x-2">
            <button
              onClick={() => setViewMode('enrolled')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === 'enrolled'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Enrolled Courses
            </button>
            <button
              onClick={() => setViewMode('available')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === 'available'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Available Courses
            </button>
          </div>
        )}
      </div>

      {/* Stats for students */}
      {userProfile?.role === 'student' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <BookOpenIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Enrolled Courses</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {enrolledCourses?.length || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <AcademicCapIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Courses</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {availableCourses?.length || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Progress</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {enrolledCourses && enrolledCourses.length > 0 
                    ? Math.round(enrolledCourses.reduce((acc, course) => acc + (course.progress || 0), 0) / enrolledCourses.length) + '%'
                    : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses grid */}
      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const status = getCourseStatus(course);
            return (
              <div key={course._id} className="card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
                      <AcademicCapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {course.code}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(status)}`}>
                    {status}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {course.description}
                </p>

                <div className="space-y-3 mb-5">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{formatDate(course.startDate)} - {formatDate(course.endDate)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <UserGroupIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{course.enrollmentCount || 0} students enrolled</span>
                  </div>
                  {course.instructor && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span className="mr-2">Instructor:</span>
                      <span className="font-medium">{course.instructor.firstName} {course.instructor.lastName}</span>
                    </div>
                  )}
                  {course.batch && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span className="mr-2">Batch:</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs dark:bg-blue-900/30 dark:text-blue-400">
                        {course.batch}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Link
                    to={`/courses/${course._id}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium flex items-center transition-colors duration-200"
                  >
                    View Details
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  {userProfile?.role === 'instructor' && (
                    <div className="flex space-x-2">
                      <Link
                        to={`/courses/${course._id}/edit`}
                        className="btn-secondary text-sm"
                      >
                        Edit
                      </Link>
                    </div>
                  )}
                  {userProfile?.role === 'student' && viewMode === 'available' && (
                    <button
                      onClick={() => handleEnroll(course._id)}
                      className="btn-primary text-sm"
                    >
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-5">
            <AcademicCapIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {userProfile?.role === 'instructor' 
              ? 'No courses found'
              : viewMode === 'enrolled'
                ? 'No enrolled courses'
                : 'No available courses'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {userProfile?.role === 'instructor' 
              ? 'Get started by creating your first course.'
              : viewMode === 'enrolled'
                ? 'You are not enrolled in any courses yet.'
                : 'There are no available courses to enroll in at this time.'}
          </p>
          {userProfile?.role === 'instructor' && (
            <Link
              to="/courses/create"
              className="btn-primary inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Course
            </Link>
          )}
          {userProfile?.role === 'student' && viewMode === 'available' && (
            <button
              onClick={() => setViewMode('enrolled')}
              className="btn-primary inline-flex items-center"
            >
              View Enrolled Courses
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Courses;