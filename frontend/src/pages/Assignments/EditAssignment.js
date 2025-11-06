import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import CreateAssignment from './CreateAssignment';

const EditAssignment = () => {
  const { id } = useParams();

  // Fetch assignment data for editing
  const { data: assignment, isLoading, error } = useQuery(
    ['assignment', id],
    async () => {
      const response = await api.get(`/assignments/${id}`);
      return response.data.assignment;
    },
    {
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
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Failed to load assignment for editing</p>
      </div>
    );
  }

  return <CreateAssignment assignmentToEdit={assignment} />;
};

export default EditAssignment;