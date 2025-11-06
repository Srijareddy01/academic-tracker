import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useForm } from 'react-hook-form';
import { api, apiUpload } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  ClockIcon,
  LinkIcon,
  AcademicCapIcon,
  ChartBarIcon,
  PlusIcon,
  TrashIcon,
  PaperClipIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const [codingChallenges, setCodingChallenges] = useState([
    { platform: 'leetcode', title: '', url: '', assignmentNumber: '', difficulty: 'medium' }
  ]);

  // Always call useQuery hook, but conditionally enable it
  const { data: assignment, isLoading, error } = useQuery(
    ['assignment', id],
    async () => {
      try {
        const response = await api.get(`/assignments/${id}`);
        return response.data.assignment;
      } catch (error) {
        console.error('Assignment fetch error:', error);
        throw error;
      }
    },
    {
      enabled: !!userProfile && !!id && id !== 'create',
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // Check if student has already submitted - always call hook but conditionally enable
  const { data: submissionData, isLoading: submissionLoading } = useQuery(
    ['submission', id, userProfile?.id],
    async () => {
      if (!id || userProfile?.role !== 'student') return null;
      
      try {
        // This would require a new endpoint to check if student has submitted
        // For now, we'll just return null
        return null;
      } catch (error) {
        console.error('Error checking submission status:', error);
        return null;
      }
    },
    {
      enabled: !!id && userProfile?.role === 'student',
      retry: 1
    }
  );

  // Check if this is a create route
  if (id === 'create') {
    // Add a new coding challenge field
    const addCodingChallenge = () => {
      setCodingChallenges([
        ...codingChallenges,
        { platform: 'leetcode', title: '', url: '', assignmentNumber: '', difficulty: 'medium' }
      ]);
    };

    // Remove a coding challenge field
    const removeCodingChallenge = (index) => {
      if (codingChallenges.length > 1) {
        const newChallenges = [...codingChallenges];
        newChallenges.splice(index, 1);
        setCodingChallenges(newChallenges);
      }
    };

    // Update a coding challenge field
    const updateCodingChallenge = (index, field, value) => {
      const newChallenges = [...codingChallenges];
      newChallenges[index][field] = value;
      setCodingChallenges(newChallenges);
    };

    // Handle form submission
    const onSubmit = async (data) => {
      try {
        // Filter out empty coding challenges
        const validChallenges = codingChallenges.filter(
          challenge => challenge.title.trim() && challenge.url.trim()
        );

        // Convert 12-hour format to 24-hour format for storage
        let dueDateTime;
        if (data.dueHour && data.duePeriod) {
          let hour = parseInt(data.dueHour, 10);
          const period = data.duePeriod;
          
          if (hour === 12) {
            hour = (period === 'AM') ? 0 : 12;
          } else if (period === 'PM') {
            hour = hour + 12;
          }
          
          dueDateTime = new Date(`${data.dueDate}T${hour.toString().padStart(2, '0')}:00:00`);
        } else {
          dueDateTime = new Date(`${data.dueDate}T23:59:59`);
        }
        
        let startDateTime;
        if (data.startHour && data.startPeriod) {
          let hour = parseInt(data.startHour, 10);
          const period = data.startPeriod;
          
          if (hour === 12) {
            hour = (period === 'AM') ? 0 : 12;
          } else if (period === 'PM') {
            hour = hour + 12;
          }
          
          startDateTime = new Date(`${data.startDate}T${hour.toString().padStart(2, '0')}:00:00`);
        } else {
          startDateTime = new Date(`${data.startDate}T00:00:00`);
        }

        const assignmentData = {
          ...data,
          codingChallenges: validChallenges,
          assignmentType: validChallenges.length > 0 ? 'coding' : 'homework',
          maxPoints: data.maxPoints || 100,
          startDate: startDateTime.toISOString(),
          dueDate: dueDateTime.toISOString()
        };

        const response = await api.post('/assignments', assignmentData);
        
        toast.success('Assignment created successfully!');
        navigate('/assignments');
      } catch (error) {
        console.error('Assignment creation error:', error);
        toast.error(error.response?.data?.message || 'Failed to create assignment');
      }
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Assignment
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Assignment Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  {...register('title', { required: 'Title is required' })}
                  className="input"
                  placeholder="Enter assignment title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course
                </label>
                <select
                  {...register('course', { required: 'Course is required' })}
                  className="input"
                >
                  <option value="">Select a course</option>
                  <option value="course1">Course 1</option>
                  <option value="course2">Course 2</option>
                </select>
                {errors.course && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.course.message}
                  </p>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  {...register('startDate', { required: 'Start date is required' })}
                  className="input"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              {/* Start Hour and Period */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Hour
                  </label>
                  <select
                    {...register('startHour')}
                    className="input"
                    defaultValue="9"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Period
                  </label>
                  <select
                    {...register('startPeriod')}
                    className="input"
                    defaultValue="AM"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  {...register('dueDate', { required: 'Due date is required' })}
                  className="input"
                />
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>

              {/* Due Hour and Period */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deadline Hour
                  </label>
                  <select
                    {...register('dueHour')}
                    className="input"
                    defaultValue="11"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Period
                  </label>
                  <select
                    {...register('duePeriod')}
                    className="input"
                    defaultValue="PM"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* Max Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Points
                </label>
                <input
                  type="number"
                  {...register('maxPoints', { 
                    required: 'Max points is required',
                    min: { value: 0, message: 'Points must be at least 0' }
                  })}
                  className="input"
                  placeholder="100"
                  defaultValue="100"
                />
                {errors.maxPoints && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.maxPoints.message}
                  </p>
                )}
              </div>

              {/* Assignment Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assignment Number
                </label>
                <input
                  type="text"
                  {...register('assignmentNumber')}
                  className="input"
                  placeholder="e.g., HW1, Lab2, etc."
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description', { required: 'Description is required' })}
                  rows={4}
                  className="input"
                  placeholder="Enter assignment description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Coding Challenges Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Coding Challenges
              </h2>
              <button
                type="button"
                onClick={addCodingChallenge}
                className="btn-secondary inline-flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Challenge
              </button>
            </div>

            {codingChallenges.map((challenge, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Challenge {index + 1}
                  </h3>
                  {codingChallenges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCodingChallenge(index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Platform */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Platform
                    </label>
                    <select
                      value={challenge.platform}
                      onChange={(e) => updateCodingChallenge(index, 'platform', e.target.value)}
                      className="input"
                    >
                      <option value="leetcode">LeetCode</option>
                      <option value="hackerrank">HackerRank</option>
                      <option value="codechef">CodeChef</option>
                      <option value="codeforces">Codeforces</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={challenge.difficulty}
                      onChange={(e) => updateCodingChallenge(index, 'difficulty', e.target.value)}
                      className="input"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Assignment Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Assignment Number
                    </label>
                    <input
                      type="text"
                      value={challenge.assignmentNumber}
                      onChange={(e) => updateCodingChallenge(index, 'assignmentNumber', e.target.value)}
                      className="input"
                      placeholder="e.g., 1, Two Sum, etc."
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Challenge Title
                    </label>
                    <input
                      type="text"
                      value={challenge.title}
                      onChange={(e) => updateCodingChallenge(index, 'title', e.target.value)}
                      className="input"
                      placeholder="Enter challenge title"
                    />
                  </div>

                  {/* URL */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Challenge URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LinkIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        value={challenge.url}
                        onChange={(e) => updateCodingChallenge(index, 'url', e.target.value)}
                        className="input pl-10"
                        placeholder="https://leetcode.com/problems/two-sum/"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {codingChallenges.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <LinkIcon className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>No coding challenges added yet</p>
                <button
                  type="button"
                  onClick={addCodingChallenge}
                  className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Add your first challenge
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/assignments')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Create Assignment
            </button>
          </div>
        </form>
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
        <p className="text-red-600 dark:text-red-400">Failed to load assignment</p>
      </div>
    );
  }

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

  // Submission form for students
  const SubmissionForm = () => {
    const { register, handleSubmit, formState: { errors }, reset } = useForm();
    const [attachments, setAttachments] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onFileChange = (e) => {
      const files = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...files]);
    };

    const removeAttachment = (index) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data) => {
      setIsSubmitting(true);
      try {
        // Debug log assignment data
        console.log('Assignment data:', assignment);
        console.log('Assignment ID:', assignment._id);
        console.log('Assignment type:', typeof assignment._id);
        
        // Validate assignment ID format
        if (!assignment._id || typeof assignment._id !== 'string') {
          throw new Error('Invalid assignment ID format');
        }
        
        // Check if assignment ID is a valid MongoDB ObjectId
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        if (!objectIdRegex.test(assignment._id)) {
          throw new Error('Assignment ID is not a valid MongoDB ObjectId');
        }
        
        // First, create/update the draft submission
        const submissionData = {
          assignment: assignment._id,
          content: data.content,
          attachments: [] // We'll handle file uploads separately if needed
        };

        console.log('Sending submission data:', submissionData); // Debug log

        const response = await api.post('/submissions', submissionData);
        const submissionId = response.data.submission._id;
        console.log('Submission created with ID:', submissionId);

        // Handle file uploads if there are attachments
        if (attachments.length > 0) {
          const formData = new FormData();
          attachments.forEach((file) => {
            formData.append('attachments', file);
          });

          try {
            console.log('Uploading files...');
            await apiUpload.post(`/submissions/${submissionId}/upload`, formData);
            console.log('Files uploaded successfully');
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            toast.error('Failed to upload files: ' + (uploadError.response?.data?.message || uploadError.message));
            throw uploadError;
          }
        }

        // Then submit the assignment
        console.log('Submitting assignment...');
        await api.post(`/submissions/${submissionId}/submit`);
        console.log('Assignment submitted successfully');

        toast.success('Assignment submitted successfully!');
        // Reset form
        reset();
        setAttachments([]);
      } catch (error) {
        console.error('Submission error:', error);
        console.error('Error response:', error.response);
        
        if (!error.response) {
          toast.error('Network error. Please check your connection.');
        } else {
          // Check if it's a validation error
          if (error.response.data?.errors) {
            const validationErrors = error.response.data.errors;
            const errorMessages = validationErrors.map(err => 
              `${err.param}: ${err.msg}`
            ).join(', ');
            toast.error(`Validation error: ${errorMessages}`);
          } else if (error.response.data?.details) {
            // Show detailed error for assignment not open
            const details = error.response.data.details;
            toast.error(`${error.response.data.message}: Assignment is ${details.isActive ? 'active' : 'inactive'}, ${details.isPublished ? 'published' : 'not published'}`);
          } else {
            toast.error(error.response?.data?.message || 'Failed to submit assignment');
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Submit Assignment
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Response
            </label>
            <textarea
              {...register('content', { required: 'Please provide your response' })}
              rows={6}
              className="input"
              placeholder="Enter your assignment response here..."
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.content.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Attach Files
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <PaperClipIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                    <span>Upload files</span>
                    <input 
                      type="file" 
                      className="sr-only" 
                      multiple 
                      onChange={onFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Any file type up to 10MB
                </p>
              </div>
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Attached files:</h4>
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-white">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                reset();
                setAttachments([]);
              }}
              className="btn-secondary"
            >
              Clear
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Submission status display for students
  const SubmissionStatus = () => {
    // In a real implementation, we would check the actual submission status
    // For now, we'll just show the submission form for students
    return (
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Submission
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          You haven't submitted this assignment yet.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {assignment?.title}
        </h1>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Assignment Info */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Assignment Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Description
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {assignment?.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Course
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {assignment?.course?.title} ({assignment?.course?.code})
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Type
                  </h3>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {assignment?.assignmentType}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Start Date
                  </h3>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(assignment?.startDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Deadline
                  </h3>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(assignment?.dueDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Points
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {assignment?.maxPoints} points
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructor Info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Instructor
            </h2>
            
            <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-3">
                <AcademicCapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {assignment?.instructor?.firstName} {assignment?.instructor?.lastName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Instructor
                </p>
              </div>
            </div>
            
            {/* Assigned Students - Only for instructors */}
            {userProfile?.role === 'instructor' && assignment?.assignedStudents && assignment.assignedStudents.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Assigned Students
                </h2>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <ul className="space-y-3">
                    {assignment.assignedStudents.map((student) => (
                      <li key={student._id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {student.firstName} {student.lastName}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {student.studentId || 'N/A'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coding Challenges Section */}
      {assignment?.codingChallenges && assignment.codingChallenges.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Coding Challenges
          </h2>
          
          <div className="space-y-4">
            {assignment.codingChallenges.map((challenge, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {challenge.title}
                  </h3>
                  <span className={`badge ${getDifficultyColor(challenge.difficulty)}`}>
                    {challenge.difficulty}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Platform
                    </h4>
                    <p className="text-gray-900 dark:text-white capitalize">
                      {challenge.platform}
                    </p>
                  </div>
                  
                  {challenge.assignmentNumber && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Assignment Number
                      </h4>
                      <p className="text-gray-900 dark:text-white">
                        {challenge.assignmentNumber}
                      </p>
                    </div>
                  )}
                </div>
                
                <a
                  href={challenge.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  Open Challenge
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission Status or Form for Students */}
      {userProfile?.role === 'student' && (
        <>
          <SubmissionStatus />
          <SubmissionForm />
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        {userProfile?.role === 'instructor' && (
          <button 
            className="btn-secondary"
            onClick={() => navigate(`/assignments/${assignment?._id}/edit`)}
          >
            Edit Assignment
          </button>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetail;