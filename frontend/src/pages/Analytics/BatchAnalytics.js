import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BatchFilter from '../../components/UI/BatchFilter';
import { 
  ChartBarIcon, 
  AcademicCapIcon, 
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';

const BatchAnalytics = () => {
  const { userProfile } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState('2025-CSM-A');
  
  // Fetch batch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery(
    ['batchAnalytics', selectedBatch],
    async () => {
      try {
        const response = await api.get(`/analytics/batch/${selectedBatch}`);
        return response.data;
      } catch (error) {
        console.error('Analytics fetch error:', error);
        throw error;
      }
    },
    {
      enabled: !!userProfile && !!selectedBatch && selectedBatch !== 'all',
      retry: 1,
      refetchOnWindowFocus: false
    }
  );
  
  // Fetch performance trends
  const { data: trendsData } = useQuery(
    ['performanceTrends', selectedBatch],
    async () => {
      try {
        const response = await api.get(`/analytics/trends/${selectedBatch}?days=30`);
        return response.data;
      } catch (error) {
        console.error('Trends fetch error:', error);
        return { trends: [] };
      }
    },
    {
      enabled: !!userProfile && !!selectedBatch && selectedBatch !== 'all',
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
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading Analytics</h2>
        <p className="text-gray-600 dark:text-gray-400">
          There was an error loading the analytics data. Please try again.
        </p>
        <button 
          onClick={() => refetch()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const data = analyticsData || {};
  
  // Format numbers for display
  const formatPercentage = (value) => {
    return value ? value.toFixed(1) + '%' : '0%';
  };
  
  const formatNumber = (value) => {
    return value ? value.toFixed(0) : '0';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Batch Performance Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Evaluate and compare student performance across batches
          </p>
        </div>
        
        {/* Batch Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Batch:
          </label>
          <BatchFilter 
            selectedBatch={selectedBatch} 
            onBatchChange={setSelectedBatch} 
            className="text-sm"
          />
        </div>
      </div>
      
      <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.totalStudents || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <AcademicCapIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg Quiz Score
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatPercentage(data.averageQuizScore)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Submission Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatPercentage(data.averageAssignmentSubmissionRate)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <CodeBracketIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg Problems Solved
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(data.codingProfileSummary?.averageProblemsSolved)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Performance Trends Chart */}
          {trendsData?.trends?.length > 0 && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Performance Trends (Last 30 Days)
                </h2>
                <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="h-64 flex items-end space-x-2">
                {trendsData.trends.map((trend, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="flex items-end justify-center w-full h-48">
                      <div 
                        className="w-3/4 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                        style={{ height: `${Math.max(10, (trend.submissionCount / Math.max(...trendsData.trends.map(t => t.submissionCount))) * 100)}%` }}
                        title={`${trend.date}: ${trend.submissionCount} submissions`}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Top Performers */}
          {data.topPerformers?.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Top Performers
                </h2>
                <div className="space-y-3">
                  {data.topPerformers.map((student, index) => (
                    <div key={student.studentId} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-green-800 dark:text-green-400">
                            {index + 1}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Quiz: {formatPercentage(student.averageQuizScore)} • Assignments: {formatPercentage(student.assignmentSubmissionRate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatPercentage(student.performanceScore)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Bottom Performers */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Need Attention
                </h2>
                <div className="space-y-3">
                  {data.bottomPerformers?.map((student, index) => (
                    <div key={student.studentId} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-red-800 dark:text-red-400">
                            {data.totalStudents - 4 + index}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Quiz: {formatPercentage(student.averageQuizScore)} • Assignments: {formatPercentage(student.assignmentSubmissionRate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatPercentage(student.performanceScore)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Student Metrics Table */}
          {data.studentMetrics?.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                All Students Performance
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Student
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quiz Score
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Assignment Rate
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Performance
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.studentMetrics.map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {student.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatPercentage(student.averageQuizScore)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatPercentage(student.assignmentSubmissionRate)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {student.submittedAssignments}/{student.totalAssignments}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatPercentage(student.performanceScore)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.performanceScore >= 80 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : student.performanceScore >= 60 
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {student.performanceScore >= 80 ? 'Excellent' : 
                             student.performanceScore >= 60 ? 'Good' : 'Needs Help'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
    </div>
  );
};

export default BatchAnalytics;