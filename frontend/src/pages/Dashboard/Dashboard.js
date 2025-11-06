import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useQueryClient } from 'react-query';
import { api } from '../../services/api';
import { fetchCodingProfileData, refreshCodingProfileData } from '../../services/codingProfilesService';
import { 
  AcademicCapIcon, 
  ClipboardDocumentListIcon, 
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  BookOpenIcon,
  CalendarIcon,
  TrophyIcon,
  DocumentTextIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();

  // Handle course enrollment
  const handleEnroll = async (courseId) => {
    try {
      await api.post(`/courses/${courseId}/enroll`);
      // Refetch dashboard data to update the available courses list
      window.location.reload();
    } catch (error) {
      console.error('Enrollment error:', error);
    }
  };

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isLoadingDashboard, error: dashboardError, refetch: refetchDashboard, isFetching } = useQuery(
    ['dashboard', userProfile?.id], // Add user ID to query key to ensure fresh data
    async () => {
      try {
        console.log('Fetching dashboard data for user:', userProfile?.id, 'Role:', userProfile?.role);
        
        // Fetch data based on user role
        if (userProfile?.role === 'instructor') {
          // Fetch all students for instructor to have access to student data
          const [coursesRes, assignmentsRes, submissionsRes, studentsRes] = await Promise.all([
            api.get('/courses'),
            api.get('/assignments'),
            api.get('/submissions/instructor'),
            api.get('/users/students') // Fetch all students
          ]);
          
          console.log('Dashboard data fetched for instructor:', {
            coursesCount: coursesRes.data.courses?.length,
            assignmentsCount: assignmentsRes.data.assignments?.length,
            submissionsCount: submissionsRes.data.submissions?.length,
            studentsCount: studentsRes.data.students?.length,
            coursesData: coursesRes.data.courses,
            assignmentsData: assignmentsRes.data.assignments
          });
          
          return {
            courses: coursesRes.data.courses || [],
            assignments: assignmentsRes.data.assignments || [],
            submissions: submissionsRes.data.submissions || [],
            students: studentsRes.data.students || [] // Add students data
          };
        } else if (userProfile?.role === 'student') {
          const studentBatch = userProfile?.batch || '';
          const studentId = userProfile?._id || '';
          
          console.log('Fetching dashboard data for student:', { studentBatch, studentId }); // Debug log
          
          const [coursesRes, assignmentsRes, submissionsRes, codingProfilesRes] = await Promise.all([
            api.get('/courses'),
            studentBatch ? api.get(`/assignments/batch/${studentBatch}`) : api.get('/assignments'),
            api.get('/submissions/student'),
            api.get('/auth/profile/coding-data').catch(() => ({ data: { codingProfiles: {} } }))
          ]);
          
          console.log('Assignments fetched for student:', assignmentsRes.data.assignments?.length); // Debug log
          console.log('Courses fetched for student:', coursesRes.data.courses?.length); // Debug log
          
          // Filter courses by batch and enrollment
          const filteredCourses = studentBatch 
            ? (coursesRes.data.courses || []).filter(course => 
                course.batch === studentBatch || 
                !course.batch ||
                course.enrolledStudents?.some(enrollment => 
                  enrollment.studentId?._id === studentId || enrollment.studentId === studentId
                )
              )
            : coursesRes.data.courses || [];
          
          console.log('Filtered courses for student:', filteredCourses.length); // Debug log
          
          return {
            courses: filteredCourses,
            assignments: assignmentsRes.data.assignments || [],
            submissions: submissionsRes.data.submissions || [],
            codingProfiles: codingProfilesRes.data.codingProfiles
          };
        } else {
          const studentBatch = userProfile?.batch || '';
          const studentId = userProfile?._id || '';
          
          const [coursesRes, assignmentsRes] = await Promise.all([
            api.get('/courses'),
            studentBatch ? api.get(`/assignments/batch/${studentBatch}`) : api.get('/assignments')
          ]);
          
          const filteredCourses = studentBatch 
            ? (coursesRes.data.courses || []).filter(course => 
                course.batch === studentBatch || 
                !course.batch ||
                course.enrolledStudents?.some(enrollment => 
                  enrollment.studentId?._id === studentId || enrollment.studentId === studentId
                )
              )
            : coursesRes.data.courses || [];
          
          return {
            courses: filteredCourses,
            assignments: assignmentsRes.data.assignments || [],
            submissions: [],
            codingProfiles: {}
          };
        }
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        // Return empty data on error to prevent app crash
        return {
          courses: [],
          assignments: [],
          submissions: [],
          students: [], // Add empty students array
          codingProfiles: {}
        };
      }
    },
    {
      enabled: !!userProfile,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 0, // Don't cache data
      cacheTime: 0  // Don't cache data
    }
  );

  // Fetch coding profile data for students
  const { data: codingProfileData } = useQuery(
    'codingProfileData',
    fetchCodingProfileData,
    {
      enabled: !!userProfile && userProfile.role === 'student',
      retry: 1
    }
  );

  // Refresh coding profile data
  const { refetch: refreshCodingData } = useQuery(
    'refreshCodingData',
    refreshCodingProfileData,
    {
      enabled: false,
      retry: 1
    }
  );

  // Force refresh function
  const handleRefresh = async () => {
    console.log('Manual refresh triggered');
    try {
      // Invalidate the dashboard query and refetch
      queryClient.invalidateQueries(['dashboard', userProfile?.id]);
      await refetchDashboard();
      console.log('Dashboard refresh completed');
    } catch (error) {
      console.error('Error during manual refresh:', error);
    }
  };

  if (isLoadingDashboard && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Show loading state when fetching but we have data (refresh)
  if (isFetching && dashboardData) {
    console.log('Dashboard is refreshing, showing loading indicator');
  }

  if (dashboardError && !dashboardData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Error loading dashboard</h3>
        <p className="text-red-600 mb-4">There was a problem loading your dashboard data.</p>
        <button
          onClick={() => refetchDashboard()}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const courses = dashboardData?.courses || [];
  const assignments = dashboardData?.assignments || [];
  const submissions = dashboardData?.submissions || [];
  const students = dashboardData?.students || []; // Add students data

  // Debug log the data
  console.log('Dashboard data being used:', {
    courses: courses.length,
    assignments: assignments.length,
    submissions: submissions.length,
    students: students.length,
    coursesData: courses,
    assignmentsData: assignments
  });

  // For instructors: get recent submissions
  const recentSubmissions = userProfile?.role === 'instructor' 
    ? submissions.slice(0, 5) 
    : [];

  // For students: get upcoming assignments
  const upcomingAssignments = userProfile?.role === 'student' 
    ? assignments
      .filter(assignment => {
        // Show assignments that are either:
        // 1. Assigned to this specific student
        // 2. Or don't have specific student assignments (open to batch/all students)
        // 3. Or match the student's batch
        const isAssignedToStudent = assignment.assignedStudents && 
          Array.isArray(assignment.assignedStudents) && 
          assignment.assignedStudents.length > 0 && 
          assignment.assignedStudents.some(student => student._id === userProfile._id);
        
        const isOpenAssignment = !assignment.assignedStudents || 
          !Array.isArray(assignment.assignedStudents) || 
          assignment.assignedStudents.length === 0;
          
        const matchesBatch = assignment.batch === userProfile.batch ||
          assignment.batch === userProfile.batch?.toLowerCase() ||
          assignment.batch === userProfile.batch?.toUpperCase() ||
          !assignment.batch ||
          assignment.batch === '';
        
        // Check if assignment is upcoming
        const isUpcoming = new Date(assignment.dueDate) > new Date();
        
        // For debugging - remove in production
        console.log('Assignment filter check:', {
          title: assignment.title,
          batch: assignment.batch,
          studentBatch: userProfile.batch,
          assignedStudents: assignment.assignedStudents,
          isAssignedToStudent,
          isOpenAssignment,
          matchesBatch,
          isUpcoming,
          show: isUpcoming && (isAssignedToStudent || isOpenAssignment) && matchesBatch
        });
        
        return isUpcoming && (isAssignedToStudent || isOpenAssignment) && matchesBatch;
      })
      .slice(0, 5)
    : [];

  // For students: get recent grades
  const recentGrades = userProfile?.role === 'student' 
    ? submissions
        .filter(submission => submission.grade !== undefined)
        .slice(0, 5)
    : [];

  // For instructors: get assignments with student count
  const instructorAssignments = userProfile?.role === 'instructor' 
    ? assignments.slice(0, 5) // Show first 5 assignments
    : [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, {userProfile?.firstName || 'User'}! Here's what's happening with your courses today.
        </p>
        {userProfile?.role === 'instructor' && (
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className={`mt-2 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm ${
              isFetching 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
            }`}
          >
            {isFetching ? 'Refreshing...' : 'Refresh Dashboard'}
          </button>
        )}
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card-hover">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <AcademicCapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Courses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{courses.length}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-hover">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ClipboardDocumentListIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assignments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{assignments.length}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-hover">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <DocumentTextIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Submissions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{submissions.length}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-hover">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <UserGroupIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {userProfile?.role === 'instructor' ? 'Students' : 'Enrolled'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userProfile?.role === 'instructor' 
                  ? students.length // Show total students for instructors
                  : courses.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content based on role */}
      {userProfile?.role === 'instructor' ? (
        // Instructor dashboard
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent courses */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-subtitle flex items-center">
                <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Your Courses
              </h3>
              <Link to="/courses" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
                View all
              </Link>
            </div>
            {courses.length > 0 ? (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course) => (
                  <Link 
                    key={course._id} 
                    to={`/courses/${course._id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-all duration-200"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">{course.title}</h4>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                        {course.batch || 'All Batches'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {course.description}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      <span>{course.enrolledStudents?.length || 0} students</span>
                    </div>
                    {/* Show enrolled students preview */}
                    {course.enrolledStudents && course.enrolledStudents.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {course.enrolledStudents
                          .filter(enrollment => enrollment.status === 'active')
                          .slice(0, 3)
                          .map((enrollment) => (
                            <span 
                              key={enrollment.studentId?._id} 
                              className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs"
                            >
                              {enrollment.studentId?.firstName} {enrollment.studentId?.lastName} ({enrollment.studentId?.studentId || 'N/A'})
                            </span>
                          ))}
                        {course.enrolledStudents.filter(enrollment => enrollment.status === 'active').length > 3 && (
                          <span className="badge bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 text-xs">
                            +{course.enrolledStudents.filter(enrollment => enrollment.status === 'active').length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No courses created yet</p>
                <Link 
                  to="/courses/create" 
                  className="mt-3 inline-block btn-primary text-sm"
                >
                  Create your first course
                </Link>
              </div>
            )}
          </div>

          {/* Recent assignments */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-subtitle flex items-center">
                <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                Your Assignments
              </h3>
              <Link to="/assignments" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
                View all
              </Link>
            </div>
            {instructorAssignments.length > 0 ? (
              <div className="space-y-3">
                {instructorAssignments.map((assignment) => (
                  <Link 
                    key={assignment._id} 
                    to={`/assignments/${assignment._id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 dark:border-gray-700 dark:hover:border-green-500 dark:hover:bg-green-900/20 transition-all duration-200"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">{assignment.title}</h4>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full dark:bg-green-900/30 dark:text-green-400">
                        {assignment.assignedStudents?.length || 0} students
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Batch: {assignment.batch || 'All Batches'}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                    </div>
                    {/* Show assigned students preview */}
                    {assignment.assignedStudents && assignment.assignedStudents.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {assignment.assignedStudents
                          .slice(0, 3)
                          .map((student) => (
                            <span 
                              key={student._id} 
                              className="badge bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs"
                            >
                              {student.firstName} {student.lastName} ({student.studentId || 'N/A'})
                            </span>
                          ))}
                        {assignment.assignedStudents.length > 3 && (
                          <span className="badge bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 text-xs">
                            +{assignment.assignedStudents.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No assignments created yet</p>
                <Link 
                  to="/assignments/create" 
                  className="mt-3 inline-block btn-primary text-sm"
                >
                  Create your first assignment
                </Link>
              </div>
            )}
          </div>

          {/* Recent submissions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-subtitle flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                Recent Submissions
              </h3>
              <Link to="/submissions" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
                View all
              </Link>
            </div>
            {recentSubmissions.length > 0 ? (
              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
                  <div 
                    key={submission._id} 
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {submission.assignment?.title || submission.course?.title}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        submission.status === 'submitted' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : submission.status === 'graded' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {submission.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      by {submission.student?.firstName} {submission.student?.lastName} ({submission.student?.studentId || 'N/A'})
                    </p>
                    {/* Show attachment indicator if submission has attachments */}
                    {submission.hasAttachments && (
                      <div className="mt-1 flex items-center text-xs text-blue-600 dark:text-blue-400">
                        <PaperClipIcon className="h-4 w-4 mr-1" />
                        <span>Contains attachments</span>
                      </div>
                    )}
                    {/* Show quiz score for quiz submissions */}
                    {submission.type === 'quiz' && submission.quizScore !== undefined && (
                      <div className="mt-1 flex items-center text-xs text-purple-600 dark:text-purple-400">
                        <TrophyIcon className="h-4 w-4 mr-1" />
                        <span>Score: {submission.quizScore.toFixed(1)}%</span>
                      </div>
                    )}
                    {/* Show submission content preview */}
                    {submission.contentPreview && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <p className="text-gray-700 dark:text-gray-300">
                          {submission.contentPreview}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                      </div>
                      {/* Show grade if available */}
                      {submission.grade && submission.grade.points !== undefined && (
                        <div className="flex items-center">
                          <TrophyIcon className="h-4 w-4 mr-1 text-yellow-500" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {submission.grade.points}/{submission.assignment?.maxPoints || submission.quizMaxScore || 'N/A'}
                          </span>
                        </div>
                      )}
                      {/* Show quiz score if no grade but quiz data available */}
                      {submission.type === 'quiz' && !submission.grade && submission.quizScore !== undefined && (
                        <div className="flex items-center">
                          <TrophyIcon className="h-4 w-4 mr-1 text-yellow-500" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {submission.quizScore.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Link to view full submission */}
                    <div className="mt-2">
                      <Link 
                        to={`/submissions/${submission._id}`} 
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No submissions yet</p>
              </div>
            )}
          </div>

          {/* Student overview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-subtitle flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                Student Overview
              </h3>
              <Link to="/users" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
                View all
              </Link>
            </div>
            {students.length > 0 ? (
              <div className="space-y-3">
                {students.slice(0, 5).map((student) => (
                  <div 
                    key={student._id} 
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {student.firstName} {student.lastName}
                      </h4>
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-900/30 dark:text-yellow-400">
                        {student.batch || 'No Batch'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Hallticket: {student.studentId || 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No students registered yet</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Student dashboard
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enrolled courses */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-subtitle flex items-center">
                <BookOpenIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Your Courses
              </h3>
              <Link to="/courses" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
                View all
              </Link>
            </div>
            {courses.length > 0 ? (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course) => (
                  <Link 
                    key={course._id} 
                    to={`/courses/${course._id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-all duration-200"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">{course.title}</h4>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                        {course.batch || 'All Batches'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {course.description}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      <span>Instructor: {course.instructor?.firstName} {course.instructor?.lastName}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">You're not enrolled in any courses yet</p>
                <Link 
                  to="/courses" 
                  className="mt-3 inline-block btn-primary text-sm"
                >
                  Browse courses
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming assignments */}
          <div className="grid grid-cols-1 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-subtitle flex items-center">
                  <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                  Upcoming Assignments
                </h3>
                <Link to="/assignments" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
                  View all
                </Link>
              </div>
              {upcomingAssignments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAssignments.map((assignment) => (
                    <Link 
                      key={assignment._id} 
                      to={`/assignments/${assignment._id}`}
                      className="block p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 dark:border-gray-700 dark:hover:border-green-500 dark:hover:bg-green-900/20 transition-all duration-200"
                    >
                      <div className="flex justify-between">
                        <h4 className="font-medium text-gray-900 dark:text-white">{assignment.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          new Date(assignment.dueDate) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {Math.ceil((new Date(assignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Batch: {assignment.batch || 'All Batches'}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No upcoming assignments</p>
                </div>
              )}
            </div>

            {/* Recent grades */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-subtitle flex items-center">
                  <TrophyIcon className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                  Recent Grades
                </h3>
                <Link to="/grades" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
                  View all
                </Link>
              </div>
              {recentGrades.length > 0 ? (
                <div className="space-y-3">
                  {recentGrades.map((submission) => (
                    <div 
                      key={submission._id} 
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex justify-between">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {submission.assignment?.title}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          submission.grade?.points >= 80 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : submission.grade?.points >= 50 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {submission.grade?.points !== undefined ? submission.grade.points : 'N/A'}/{submission.assignment?.maxPoints || 100}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Batch: {submission.assignment?.batch || 'All Batches'}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>Graded: {new Date(submission.gradedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No grades available yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;