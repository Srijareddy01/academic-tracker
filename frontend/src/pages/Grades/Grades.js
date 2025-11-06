import React from 'react';
import { useQuery } from 'react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Grades = () => {
  const { userProfile } = useAuth();
  
  const { data: grades, isLoading, error } = useQuery(
    'grades',
    async () => {
      try {
        // Only fetch grades for students
        if (userProfile?.role === 'student') {
          const response = await api.get('/grades/student');
          return response.data.grades || [];
        } else {
          // Return empty array for non-students
          return [];
        }
      } catch (error) {
        console.error('Grades fetch error:', error);
        return [];
      }
    },
    {
      enabled: !!userProfile,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

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
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading Grades</h2>
        <p className="text-gray-600 dark:text-gray-400">
          There was an error loading your grades. Please try refreshing the page.
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

  // Show message for instructors who don't have grades
  if (userProfile?.role === 'instructor') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Grades
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View your grades and academic progress
          </p>
        </div>

        <div className="card">
          <p className="text-gray-600 dark:text-gray-400">
            As an instructor, you don't have grades. You can view student grades for your courses in the course or assignment details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Grades
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View your grades and academic progress
        </p>
      </div>

      <div className="card">
        <p className="text-gray-600 dark:text-gray-400">
          Grades page will be implemented here
        </p>
        {grades && grades.length > 0 && (
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            You have {grades.length} grade(s).
          </p>
        )}
      </div>
    </div>
  );
};

export default Grades;