import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BatchFilter from '../../components/UI/BatchFilter';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  DocumentTextIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const Submissions = () => {
  const { userProfile } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState('all');
  
  const { data: submissions, isLoading, error, refetch } = useQuery(
    ['submissions', selectedBatch],
    async () => {
      try {
        if (userProfile?.role === 'student') {
          const response = await api.get('/submissions/student');
          return response.data.submissions || [];
        } else if (userProfile?.role === 'instructor') {
          const response = await api.get(`/submissions/instructor${selectedBatch !== 'all' ? `?batch=${selectedBatch}` : ''}`);
          return response.data.submissions || [];
        } else {
          return [];
        }
      } catch (error) {
        console.error('Submissions fetch error:', error);
        return [];
      }
    },
    {
      enabled: !!userProfile,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // Add effect to refetch when batch changes
  React.useEffect(() => {
    if (userProfile) {
      refetch();
    }
  }, [selectedBatch, userProfile, refetch]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'graded':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'returned':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading Submissions</h2>
        <p className="text-gray-600 dark:text-gray-400">
          There was an error loading your submissions. Please try refreshing the page.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Show submissions for instructors
  if (userProfile?.role === 'instructor') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Student Submissions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track submissions from your students
            </p>
          </div>
          
          {/* Batch Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Batch:
            </label>
            <BatchFilter 
              selectedBatch={selectedBatch} 
              onBatchChange={setSelectedBatch} 
              className="text-sm"
            />
          </div>
        </div>

        {submissions && submissions.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {submissions.map((submission) => (
                <div key={submission._id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {submission.assignment?.title || submission.course?.title}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span className="truncate">
                          {submission.student?.firstName} {submission.student?.lastName}
                        </span>
                        <span className="mx-2">•</span>
                        <span className="truncate">
                          {submission.course?.title} ({submission.course?.code})
                        </span>
                        <span className="mx-2">•</span>
                        <span>
                          {formatDate(submission.submittedAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center text-xs text-gray-400 dark:text-gray-500">
                        <span>Student Batch: {submission.student?.batch || 'N/A'}</span>
                        <span className="mx-2">•</span>
                        <span>Course Batch: {submission.course?.batch || 'N/A'}</span>
                      </div>
                      {/* Show submission content preview */}
                      {submission.contentPreview && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                          <p className="text-gray-700 dark:text-gray-300 truncate">
                            {submission.contentPreview}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex items-center space-x-3">
                      <span className={`badge ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                      {submission.grade?.points !== undefined && (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {submission.grade.points}/{submission.assignment?.maxPoints || 100}
                        </span>
                      )}
                      {/* Link to view details */}
                      <Link 
                        to={`/submissions/${submission._id}`}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        ) : (
          <div className="card text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No submissions found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No submissions found for {selectedBatch} batch.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Show submissions for students
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Submissions
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your assignment submissions
        </p>
      </div>

      {submissions && submissions.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {submissions.map((submission) => (
              <div key={submission._id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {submission.assignment?.title || submission.course?.title}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span className="truncate">
                        {submission.course?.title} ({submission.course?.code})
                      </span>
                      <span className="mx-2">•</span>
                      <span>
                        {formatDate(submission.submittedAt)}
                      </span>
                    </div>
                    {/* Show submission content preview for students */}
                    {submission.contentPreview && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                        <p className="text-gray-700 dark:text-gray-300 truncate">
                          {submission.contentPreview}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex items-center">
                    <span className={`badge ${getStatusColor(submission.status)}`}>
                      {submission.status}
                    </span>
                    {submission.grade?.points !== undefined && (
                      <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                        {submission.grade.points}/{submission.assignment?.maxPoints || 100}
                      </span>
                    )}
                    {/* Link to view details */}
                    <Link 
                      to={`/submissions/${submission._id}`}
                      className="ml-3 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No submissions yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You haven't submitted any assignments yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default Submissions;