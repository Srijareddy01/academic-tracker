import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, PlusIcon, TrashIcon, LinkIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { fromIST } from '../../utils/timezone';

const CreateAssignment = ({ assignmentToEdit }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const [codingChallenges, setCodingChallenges] = useState([
    { platform: 'leetcode', title: '', url: '', assignmentNumber: '', difficulty: 'medium' }
  ]);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Fetch students
  const { data: studentsData, isLoading: isLoadingStudents, error: studentsError, refetch: refetchStudents } = useQuery(
    ['students', selectedBatch],
    async () => {
      const res = await api.get(`/users/students/batch/${selectedBatch}`);
      return res.data.students;
    },
    { 
      enabled: !!userProfile && userProfile.role === 'instructor' && !assignmentToEdit,
      onError: (error) => {
        console.error('Students fetch error:', error);
        toast.error('Failed to load students. Please try again.');
      }
    }
  );

  // Fetch courses (optional if needed)
  const { data: courses, isLoading: coursesLoading } = useQuery(
    'instructor-courses',
    async () => {
      const res = await api.get('/courses');
      return res.data.courses || [];
    },
    { enabled: !!userProfile && userProfile.role === 'instructor' }
  );

  // Initialize form if editing
  useEffect(() => {
    if (!assignmentToEdit) return;
    const dueDate = new Date(assignmentToEdit.dueDate);
    const startDate = new Date(assignmentToEdit.startDate);

    const formatDate = (date) => date.toISOString().split('T')[0];

    reset({
      title: assignmentToEdit.title,
      startDate: formatDate(startDate),
      startHour: startDate.getHours() % 12 || 12,
      startPeriod: startDate.getHours() >= 12 ? 'PM' : 'AM',
      dueDate: formatDate(dueDate),
      dueHour: dueDate.getHours() % 12 || 12,
      duePeriod: dueDate.getHours() >= 12 ? 'PM' : 'AM',
      maxPoints: assignmentToEdit.maxPoints,
      assignmentNumber: assignmentToEdit.assignmentNumber,
      description: assignmentToEdit.description,
      batch: assignmentToEdit.batch || ''
    });

    if (assignmentToEdit.codingChallenges?.length) {
      setCodingChallenges(assignmentToEdit.codingChallenges);
    }
  }, [assignmentToEdit, reset]);

  // Add, remove, update coding challenges
  const addCodingChallenge = () => setCodingChallenges([...codingChallenges, { platform: 'leetcode', title: '', url: '', assignmentNumber: '', difficulty: 'medium' }]);
  const removeCodingChallenge = (index) => setCodingChallenges(prev => prev.filter((_, i) => i !== index));
  const updateCodingChallenge = (index, field, value) => setCodingChallenges(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));

  // Handle select all
  useEffect(() => {
    if (selectAll && studentsData) {
      setSelectedStudents(studentsData.map(s => s._id));
    } else if (!selectAll) {
      setSelectedStudents([]);
    }
  }, [selectAll, studentsData]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      console.log('Form data being submitted:', data); // Debug log
      
      // Combine date and time, properly handling timezone
      let dueDateTime;
      if (data.dueHour && data.duePeriod) {
        // Convert 12-hour format to 24-hour format for storage
        let hour = parseInt(data.dueHour, 10);
        const period = data.duePeriod;
        
        if (hour === 12) {
          hour = (period === 'AM') ? 0 : 12;
        } else if (period === 'PM') {
          hour = hour + 12;
        }
        
        dueDateTime = new Date(`${data.dueDate}T${hour.toString().padStart(2, '0')}:00:00`);
      } else {
        // If no time specified, use end of day in local timezone
        dueDateTime = new Date(`${data.dueDate}T23:59:59`);
      }
      
      // Handle start date
      let startDateTime;
      if (data.startHour && data.startPeriod) {
        // Convert 12-hour format to 24-hour format for storage
        let hour = parseInt(data.startHour, 10);
        const period = data.startPeriod;
        
        if (hour === 12) {
          hour = (period === 'AM') ? 0 : 12;
        } else if (period === 'PM') {
          hour = hour + 12;
        }
        
        startDateTime = new Date(`${data.startDate}T${hour.toString().padStart(2, '0')}:00:00`);
      } else {
        // If no time specified, use start of day in local timezone
        startDateTime = new Date(`${data.startDate}T00:00:00`);
      }
      
      // Debug logging
      console.log('Date processing:', {
        inputDate: data.dueDate,
        inputHour: data.dueHour,
        inputPeriod: data.duePeriod,
        combinedDateTime: dueDateTime,
        isoString: dueDateTime.toISOString(),
        localString: dueDateTime.toString(),
        timezoneOffset: dueDateTime.getTimezoneOffset()
      });
      
      // Filter out empty coding challenges
      const validChallenges = codingChallenges.filter(
        challenge => challenge.title.trim() && challenge.url.trim()
      );

      const assignmentData = {
        ...data,
        codingChallenges: validChallenges,
        assignmentType: validChallenges.length > 0 ? 'coding' : 'homework',
        maxPoints: Number(data.maxPoints) || 100, // Ensure it's a number
        startDate: startDateTime.toISOString(),
        dueDate: dueDateTime.toISOString(),
        // Add selected students for new assignments
        ...(assignmentToEdit ? {} : { selectedStudents })
      };

      // Remove course field from assignmentData
      delete assignmentData.course;

      console.log('Sending assignment data:', assignmentData); // Debug log

      let response;
      if (assignmentToEdit) {
        // Update existing assignment
        response = await api.put(`/assignments/${assignmentToEdit._id}`, assignmentData);
        toast.success('Assignment updated successfully!');
      } else {
        // Create new assignment
        response = await api.post('/assignments', assignmentData);
        if (response.data.autoPublished) {
          toast.success('Assignment created and published successfully!');
        } else {
          toast.success('Assignment created successfully!');
        }
      }

      navigate('/assignments');
    } catch (error) {
      console.error('Assignment creation error:', error);
      console.error('Full error response:', error.response);
      
      // Show detailed error information
      let errorMessage = assignmentToEdit ? 'Failed to update assignment' : 'Failed to create assignment';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Show validation errors with more detail
        const validationErrors = error.response.data.errors;
        console.log('Validation errors:', validationErrors); // Debug log
        // Log each error individually to see what they contain
        validationErrors.forEach((err, index) => {
          console.log(`Validation error ${index}:`, err);
        });
        errorMessage = validationErrors.map(e => {
          if (e.param && e.msg) {
            return `${e.param}: ${e.msg}`;
          } else if (e.msg) {
            return e.msg;
          } else {
            return JSON.stringify(e);
          }
        }).join(', ');
      } else if (error.response?.data) {
        errorMessage = JSON.stringify(error.response.data, null, 2); // Pretty print JSON
      }
      
      console.error('Error message to display:', errorMessage); // Debug log
      toast.error(errorMessage);
    }
  };

  if ((assignmentToEdit && !assignmentToEdit) || (userProfile?.role === 'instructor' && coursesLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {assignmentToEdit ? 'Edit Assignment' : 'Create Assignment'}
          </h1>
        </div>
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

            {/* Batch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Batch
              </label>
              <select
                {...register('batch')}
                className="input"
              >
                <option value="">Select a batch (optional)</option>
                <option value="2026-CSE-A">2026-CSE-A</option>
                <option value="2026-CSE-B">2026-CSE-B</option>
                <option value="2026-CSM-A">2026-CSM-A</option>
                <option value="2026-CSM-B">2026-CSM-B</option>
                <option value="2026-CSM-C">2026-CSM-C</option>
                <option value="2026-CSD">2026-CSD</option>
                <option value="2026-CSC">2026-CSC</option>
                <option value="2026-ECE">2026-ECE</option>
                <option value="2027-CSE-A">2027-CSE-A</option>
                <option value="2027-CSE-B">2027-CSE-B</option>
                <option value="2027-CSM-A">2027-CSM-A</option>
                <option value="2027-CSM-B">2027-CSM-B</option>
                <option value="2027-CSM-C">2027-CSM-C</option>
                <option value="2027-CSD">2027-CSD</option>
                <option value="2027-CSC">2027-CSC</option>
                <option value="2027-ECE">2027-ECE</option>
              </select>
            </div>

            {/* Start Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Hour
                </label>
                <select
                  {...register('startHour')}
                  className="input"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AM/PM
                </label>
                <select
                  {...register('startPeriod')}
                  className="input"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* Due Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deadline Date
                </label>
                <input
                  type="date"
                  {...register('dueDate', { required: 'Deadline date is required' })}
                  className="input"
                />
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deadline Hour
                </label>
                <select
                  {...register('dueHour')}
                  className="input"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AM/PM
                </label>
                <select
                  {...register('duePeriod')}
                  className="input"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* Max Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maximum Points
              </label>
              <input
                type="number"
                {...register('maxPoints', { required: 'Maximum points is required' })}
                className="input"
                placeholder="100"
                min="1"
              />
              {errors.maxPoints && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.maxPoints.message}
                </p>
              )}
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
              ></textarea>
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
              className="btn-primary flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Challenge
            </button>
          </div>

          {codingChallenges.map((challenge, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="md:col-span-2">
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
                  <option value="codeforces">CodeForces</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Challenge Title
                </label>
                <input
                  type="text"
                  value={challenge.title}
                  onChange={(e) => updateCodingChallenge(index, 'title', e.target.value)}
                  className="input"
                  placeholder="Challenge title"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={challenge.url}
                  onChange={(e) => updateCodingChallenge(index, 'url', e.target.value)}
                  className="input"
                  placeholder="https://leetcode.com/problems/example"
                />
              </div>

              <div className="md:col-span-2">
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

              <div className="md:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={() => removeCodingChallenge(index)}
                  className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}

          {codingChallenges.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <LinkIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>No coding challenges added yet</p>
              <button
                type="button"
                onClick={addCodingChallenge}
                className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Add your first challenge
              </button>
            </div>
          )}
        </div>

        {/* Student Assignment Section - Only for instructors creating new assignments */}
        {!assignmentToEdit && userProfile?.role === 'instructor' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Assign to Students
            </h2>
            
            {/* Batch Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="input"
              >
                <option value="2026-CSE-A">2026-CSE-A</option>
                <option value="2026-CSE-B">2026-CSE-B</option>
                <option value="2026-CSM-A">2026-CSM-A</option>
                <option value="2026-CSM-B">2026-CSM-B</option>
                <option value="2026-CSM-C">2026-CSM-C</option>
                <option value="2026-CSD">2026-CSD</option>
                <option value="2026-CSC">2026-CSC</option>
                <option value="2026-ECE">2026-ECE</option>
                <option value="2027-CSE-A">2027-CSE-A</option>
                <option value="2027-CSE-B">2027-CSE-B</option>
                <option value="2027-CSM-A">2027-CSM-A</option>
                <option value="2027-CSM-B">2027-CSM-B</option>
                <option value="2027-CSM-C">2027-CSM-C</option>
                <option value="2027-CSD">2027-CSD</option>
                <option value="2027-CSC">2027-CSC</option>
                <option value="2027-ECE">2027-ECE</option>
              </select>
            </div>

            {/* Select All Checkbox */}
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="select-all"
                checked={selectAll}
                onChange={(e) => setSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoadingStudents || studentsError || !studentsData || studentsData.length === 0}
              />
              <label htmlFor="select-all" className="ml-2 block text-sm text-gray-900 dark:text-white">
                Select All Students ({studentsData ? studentsData.length : 0} total)
              </label>
            </div>

            {/* Students List */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto">
              {isLoadingStudents ? (
                <div className="p-4 text-center">
                  <LoadingSpinner size="small" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading students...</p>
                </div>
              ) : studentsError ? (
                <div className="p-4 text-center text-red-600 dark:text-red-400">
                  <p>Error loading students: {studentsError.message}</p>
                  <button 
                    onClick={() => refetchStudents()} 
                    className="mt-2 btn-primary text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : studentsData && studentsData.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {studentsData.map((student) => (
                    <li key={student._id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(prev => [...prev, student._id]);
                              // If all students are now selected, check the select all checkbox
                              if (studentsData && selectedStudents.length + 1 === studentsData.length) {
                                setSelectAll(true);
                              }
                            } else {
                              setSelectedStudents(prev => prev.filter(id => id !== student._id));
                              setSelectAll(false); // Uncheck select all if any item is unchecked
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Hallticket: {student.studentId || 'N/A'} | Batch: {student.batch || 'No Batch'}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <p>No students found for the selected batch.</p>
                  <p className="text-sm mt-1">Current batch filter: {selectedBatch}</p>
                  <button 
                    onClick={() => refetchStudents()} 
                    className="mt-2 btn-primary text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {assignmentToEdit ? 'Update Assignment' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAssignment;