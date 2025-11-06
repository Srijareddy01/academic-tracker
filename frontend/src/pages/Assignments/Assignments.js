import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PlusIcon, 
  ClipboardDocumentListIcon, 
  CalendarIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { toIST, formatISTDate } from '../../utils/timezone'; // Import timezone utilities

const Assignments = () => {
  const { userProfile } = useAuth();
  const [filter, setFilter] = useState('all');

  const { data: assignments, isLoading, error } = useQuery(
    ['assignments', userProfile?.batch],
    async () => {
      try {
        let response;
        if (userProfile?.role === 'student' && userProfile?.batch) {
          // For students, fetch assignments filtered by their batch
          response = await api.get(`/assignments/batch/${userProfile.batch}`);
        } else {
          // For instructors or students without a batch, fetch all assignments
          response = await api.get('/assignments');
        }
        return response.data.assignments || [];
      } catch (error) {
        console.error('Assignments fetch error:', error);
        return [];
      }
    },
    {
      enabled: !!userProfile && !!userProfile.role,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

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
        <p className="text-red-600 dark:text-red-400">Failed to load assignments</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return formatISTDate(dateString);
  };

  const getAssignmentStatus = (assignment) => {
    // Use IST timezone approach
    const now = toIST(new Date());
    
    // Parse dates ensuring we handle timezone correctly
    const dueDate = toIST(new Date(assignment.dueDate));
    const startDate = toIST(new Date(assignment.startDate));
    
    // Handle invalid dates
    if (isNaN(startDate.getTime()) || isNaN(dueDate.getTime())) {
      return 'unknown';
    }

    // Check if assignment hasn't started yet
    if (now < startDate) {
      return 'upcoming';
    }
    
    // Check if assignment is overdue
    if (now > dueDate) {
      return 'overdue';
    }
    
    // Otherwise, it's active
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'unknown':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const filteredAssignments = assignments?.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'active') return getAssignmentStatus(assignment) === 'active';
    if (filter === 'upcoming') return getAssignmentStatus(assignment) === 'upcoming';
    if (filter === 'overdue') return getAssignmentStatus(assignment) === 'overdue';
    
    // For students, also check if assignment is assigned to them or matches their batch
    if (userProfile?.role === 'student') {
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
      
      // For student role, we should show assignments that are:
      // 1. Assigned to this specific student, OR
      // 2. Open assignments (no specific students assigned), OR
      // 3. Match the batch filter (already handled by the API call)
      // But we still need to respect the status filter
      const matchesStatusFilter = filter === 'all' || getAssignmentStatus(assignment) === filter;
      return matchesStatusFilter && (isAssignedToStudent || isOpenAssignment) && matchesBatch;
    }
    
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Assignments
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track your assignments
          </p>
        </div>
        {userProfile?.role === 'instructor' && (
          <Link
            to="/assignments/create"
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Assignment
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        {['all', 'active', 'upcoming', 'overdue'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === filterOption
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </button>
        ))}
      </div>

      {/* Assignments list */}
      {filteredAssignments.length > 0 ? (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const status = getAssignmentStatus(assignment);
            const hasCodingChallenges = assignment.codingChallenges && assignment.codingChallenges.length > 0;
            
            return (
              <div key={assignment._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-4">
                      <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {assignment.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Batch: {assignment.batch || 'All Batches'} • {assignment.assignmentType}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-2">
                        {assignment.description}
                      </p>
                      
                      {/* Coding Challenges Preview */}
                      {hasCodingChallenges && (
                        <div className="mt-3">
                          <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                            <LinkIcon className="h-4 w-4 mr-1" />
                            <span>{assignment.codingChallenges.length} coding challenge{assignment.codingChallenges.length > 1 ? 's' : ''}</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            {assignment.codingChallenges.slice(0, 3).map((challenge, index) => (
                              <span 
                                key={index} 
                                className={`badge ${getDifficultyColor(challenge.difficulty)}`}
                              >
                                {challenge.platform}: {challenge.title}
                              </span>
                            ))}
                            {assignment.codingChallenges.length > 3 && (
                              <span className="badge bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                                +{assignment.codingChallenges.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Assigned Students Preview - Only for instructors */}
                      {userProfile?.role === 'instructor' && assignment.assignedStudents && assignment.assignedStudents.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned to:</p>
                          <div className="flex flex-wrap gap-1">
                            {assignment.assignedStudents.slice(0, 3).map((student, index) => (
                              <span key={student._id} className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs">
                                {student.firstName} {student.lastName} ({student.studentId || 'N/A'})
                              </span>
                            ))}
                            {assignment.assignedStudents.length > 3 && (
                              <span className="badge bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 text-xs">
                                +{assignment.assignedStudents.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(status)}`}>
                    {status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Due {formatDate(assignment.dueDate)}
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">{assignment.maxPoints} points</span>
                    </div>
                    {assignment.instructor && (
                      <div className="flex items-center">
                        <span className="mr-2">Instructor:</span>
                        {assignment.instructor.firstName} {assignment.instructor.lastName}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/assignments/${assignment._id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      View Details
                    </Link>
                    {userProfile?.role === 'instructor' && (
                      <Link
                        to={`/assignments/${assignment._id}/edit`}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No assignments found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {userProfile?.role === 'instructor' 
              ? 'Get started by creating your first assignment.'
              : 'No assignments match your current filter.'
            }
          </p>
          {userProfile?.role === 'instructor' && (
            <Link
              to="/assignments/create"
              className="btn-primary inline-flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Assignment
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default Assignments;