import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import Quiz from '../../components/Courses/Quiz'; // Import the Quiz component

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Check if we're creating a new course (no id) or viewing an existing one
  const isCreateMode = !id || id === 'create';

  // State for form fields
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    startDate: '',
    endDate: '',
    tags: [],
    batch: ''
  });
  
  // State for student selection
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // State for file uploads
  const [pdfFiles, setPdfFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // State for quizzes
  const [quizzes, setQuizzes] = useState([]);

  // State for form errors
  const [errors, setErrors] = useState({});

  // State for loading
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for quiz functionality
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizResults, setQuizResults] = useState({});

  const { data: course, isLoading, error } = useQuery(
    ['course', id],
    async () => {
      // Don't fetch if we're in create mode
      if (isCreateMode) {
        return null;
      }
      
      try {
        const response = await api.get(`/courses/${id}`);
        return response.data.course;
      } catch (error) {
        console.error('Course fetch error:', error);
        toast.error('Failed to load course details. Please try again.');
        throw error;
      }
    },
    {
      enabled: !isCreateMode // Only fetch if we're not in create mode
    }
  );
  
  // Fetch students by batch
  const { data: studentsData, isLoading: isLoadingStudents, error: studentsError } = useQuery(
    ['students', selectedBatch],
    async () => {
      const response = await api.get(`/users/students/batch/${selectedBatch}`);
      return response.data.students;
    },
    { 
      enabled: isCreateMode && !!userProfile, // Only fetch in create mode
      retry: 1,
      onError: (error) => {
        console.error('Students fetch error:', error);
        toast.error('Failed to load students. Please try again.');
      }
    }
  );

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      toast.error('Only PDF files are allowed');
    }
    
    setPdfFiles(prev => [...prev, ...pdfFiles]);
  };

  // Remove a file from the list
  const removeFile = (index) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Add a new quiz
  const addQuiz = () => {
    setQuizzes(prev => [...prev, {
      id: Date.now(),
      title: '',
      questions: []
    }]);
  };

  // Remove a quiz
  const removeQuiz = (quizId) => {
    setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
  };

  // Add a question to a quiz
  const addQuestion = (quizId) => {
    setQuizzes(prev => prev.map(quiz => {
      if (quiz.id === quizId) {
        return {
          ...quiz,
          questions: [...quiz.questions, {
            id: Date.now(),
            text: '',
            options: ['', ''],
            correctAnswer: 0
          }]
        };
      }
      return quiz;
    }));
  };

  // Remove a question from a quiz
  const removeQuestion = (quizId, questionId) => {
    setQuizzes(prev => prev.map(quiz => {
      if (quiz.id === quizId) {
        return {
          ...quiz,
          questions: quiz.questions.filter(q => q.id !== questionId)
        };
      }
      return quiz;
    }));
  };

  // Handle quiz input changes
  const handleQuizChange = (quizId, field, value) => {
    setQuizzes(prev => prev.map(quiz => {
      if (quiz.id === quizId) {
        return {
          ...quiz,
          [field]: value
        };
      }
      return quiz;
    }));
  };

  // Handle question input changes
  const handleQuestionChange = (quizId, questionId, field, value) => {
    setQuizzes(prev => prev.map(quiz => {
      if (quiz.id === quizId) {
        return {
          ...quiz,
          questions: quiz.questions.map(question => {
            if (question.id === questionId) {
              return {
                ...question,
                [field]: value
              };
            }
            return question;
          })
        };
      }
      return quiz;
    }));
  };

  // Handle option changes
  const handleOptionChange = (quizId, questionId, optionIndex, value) => {
    setQuizzes(prev => prev.map(quiz => {
      if (quiz.id === quizId) {
        return {
          ...quiz,
          questions: quiz.questions.map(question => {
            if (question.id === questionId) {
              const newOptions = [...question.options];
              newOptions[optionIndex] = value;
              return {
                ...question,
                options: newOptions
              };
            }
            return question;
          })
        };
      }
      return quiz;
    }));
  };

  // Add an option to a question
  const addOption = (quizId, questionId) => {
    setQuizzes(prev => prev.map(quiz => {
      if (quiz.id === quizId) {
        return {
          ...quiz,
          questions: quiz.questions.map(question => {
            if (question.id === questionId) {
              return {
                ...question,
                options: [...question.options, '']
              };
            }
            return question;
          })
        };
      }
      return quiz;
    }));
  };

  // Remove an option from a question
  const removeOption = (quizId, questionId, optionIndex) => {
    setQuizzes(prev => prev.map(quiz => {
      if (quiz.id === quizId) {
        return {
          ...quiz,
          questions: quiz.questions.map(question => {
            if (question.id === questionId) {
              const newOptions = [...question.options];
              newOptions.splice(optionIndex, 1);
              return {
                ...question,
                options: newOptions
              };
            }
            return question;
          })
        };
      }
      return quiz;
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Course title is required';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Course code is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Course description is required';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (startDate >= endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare form data
      const courseData = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        tags: formData.tags.filter(tag => tag.trim() !== ''),
        selectedStudents, // Add selected students to course data
        // Process quizzes to remove frontend-only id fields
        quizzes: quizzes.map(quiz => ({
          title: quiz.title,
          questions: quiz.questions.map(question => ({
            text: question.text,
            options: question.options,
            correctAnswer: question.correctAnswer
          }))
        }))
      };
      
      // Submit course data
      const response = await api.post('/courses', courseData);
      
      // If we have PDF files, upload them
      if (pdfFiles.length > 0 && response.data.course._id) {
        const formDataFiles = new FormData();
        pdfFiles.forEach(file => {
          formDataFiles.append('pdfFiles', file);
        });
        
        try {
          await api.post(`/courses/${response.data.course._id}/materials`, formDataFiles, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 60000 // Increase timeout for file uploads
          });
          toast.success('Course materials uploaded successfully!');
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          toast.error('Course created but failed to upload materials. You can upload them later.');
        }
      }
      
      toast.success('Course created successfully!');
      
      // Navigate to the newly created course
      navigate(`/courses/${response.data.course._id}`);
    } catch (error) {
      console.error('Course creation error:', error);
      
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please check your internet connection and try again.');
      } else if (error.response?.status === 400 && error.response.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 403) {
        toast.error('You are not authorized to create courses.');
      } else if (!error.response) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('Failed to create course. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading && !isCreateMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error && !isCreateMode) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Failed to load course</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render create course form
  if (isCreateMode) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create New Course
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                  placeholder="Enter course title"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>
              
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course Code *
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                  placeholder="Enter course code"
                />
                {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
              </div>
              
              <div>
                <label htmlFor="batch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Batch
                </label>
                <select
                  id="batch"
                  name="batch"
                  value={formData.batch}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
            </div>
            
            <div className="mt-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                placeholder="Enter course description"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>
          </div>

          {/* Schedule */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Schedule
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
              </div>
            </div>
          </div>

          {/* Student Selection - Only for instructors in create mode */}
          {isCreateMode && userProfile?.role === 'instructor' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Assign Students
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
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select a batch to filter students
                </p>
              </div>
              
              {/* Select All Checkbox */}
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectAll}
                  onChange={(e) => {
                    setSelectAll(e.target.checked);
                    if (e.target.checked) {
                      setSelectedStudents(studentsData?.map(student => student._id) || []);
                    } else {
                      setSelectedStudents([]);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="select-all" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Select All Students
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
                      onClick={() => {
                        // Refetch students data
                        // We can simulate a refetch by changing the selectedBatch state
                        const currentBatch = selectedBatch;
                        setSelectedBatch('2026-CSE-A');
                        setTimeout(() => setSelectedBatch(currentBatch), 100);
                      }} 
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
                              } else {
                                setSelectedStudents(prev => prev.filter(id => id !== student._id));
                                setSelectAll(false); // Uncheck select all if any item is unchecked
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {student?.firstName} {student?.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Hallticket: {student?.studentId || 'N/A'}
                            </p>
                            {student?.batch && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Batch: {student.batch}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))
                  }
                  </ul>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <p>No students found for the selected batch.</p>
                    <p className="text-sm mt-1">Current batch filter: {selectedBatch}</p>
                    <button 
                      onClick={() => {
                        // Refetch students data
                        // We can simulate a refetch by changing the selectedBatch state
                        const currentBatch = selectedBatch;
                        setSelectedBatch('2026-CSE-A');
                        setTimeout(() => setSelectedBatch(currentBatch), 100);
                      }} 
                      className="mt-2 btn-primary text-sm"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Selected: {selectedStudents.length} students
              </div>
            </div>
          )}

          {/* PDF Files Upload */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Course Materials (PDF Files)
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload PDF Files
              </label>
              <div className="flex items-center">
                <label className="btn-secondary cursor-pointer">
                  <span>Select PDF Files</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileChange}
                  />
                </label>
                <p className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                  Only PDF files are allowed
                </p>
              </div>
            </div>
            
            {pdfFiles.length > 0 && (
              <div className="mt-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                  Selected Files:
                </h3>
                <ul className="space-y-2">
                  {pdfFiles.map((file, index) => (
                    <li key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Quizzes */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quizzes
              </h2>
              <button
                type="button"
                onClick={addQuiz}
                className="btn-secondary"
              >
                Add Quiz
              </button>
            </div>
            
            {quizzes.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No quizzes added yet. Click "Add Quiz" to create one.
              </p>
            ) : (
              <div className="space-y-6">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <input
                        type="text"
                        value={quiz.title}
                        onChange={(e) => handleQuizChange(quiz.id, 'title', e.target.value)}
                        placeholder="Quiz title"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeQuiz(quiz.id)}
                        className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove Quiz
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {quiz.questions.map((question) => (
                        <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <div className="mb-3">
                            <input
                              type="text"
                              value={question.text}
                              onChange={(e) => handleQuestionChange(quiz.id, question.id, 'text', e.target.value)}
                              placeholder="Question"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center">
                                <input
                                  type="radio"
                                  name={`correct-answer-${question.id}`}
                                  checked={question.correctAnswer === optionIndex}
                                  onChange={() => handleQuestionChange(quiz.id, question.id, 'correctAnswer', optionIndex)}
                                  className="mr-2"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => handleOptionChange(quiz.id, question.id, optionIndex, e.target.value)}
                                  placeholder={`Option ${optionIndex + 1}`}
                                  className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(quiz.id, question.id, optionIndex)}
                                    className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-2 flex justify-between">
                            <button
                              type="button"
                              onClick={() => addOption(quiz.id, question.id)}
                              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Add Option
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(quiz.id, question.id)}
                              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Remove Question
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => addQuestion(quiz.id)}
                      className="mt-3 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Add Question
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Course'
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Render course details for students and instructors
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {course?.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-1">
              {course?.code}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Instructor: {course?.instructor?.firstName} {course?.instructor?.lastName}
            </p>
          </div>
          <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            {course?.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {course?.description}
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Schedule</h3>
            <div className="space-y-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <span className="w-24">Start Date:</span>
                <span>{course?.startDate && formatDate(course.startDate)}</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <span className="w-24">End Date:</span>
                <span>{course?.endDate && formatDate(course.endDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Students - Only for instructors */}
      {userProfile?.role === 'instructor' && course?.enrolledStudents && course.enrolledStudents.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Enrolled Students
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Hallticket Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Enrollment Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {course.enrolledStudents
                  .filter(enrollment => enrollment.status === 'active')
                  .map((enrollment) => (
                    <tr key={enrollment.studentId?._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {enrollment.studentId?.firstName} {enrollment.studentId?.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {enrollment.studentId?.studentId || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(enrollment.enrolledAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          {enrollment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Course Materials (PDFs) */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Course Materials
        </h2>
        {course?.materials && course.materials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {course.materials.map((material, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">{material.originalName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(material.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <a 
                    href={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${material.filename}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm w-full text-center"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            No course materials available.
          </p>
        )}
      </div>

      {/* Quizzes & Assignments */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quizzes & Assignments
        </h2>
        {activeQuiz !== null ? (
          // Show the active quiz
          <Quiz 
            quiz={course.quizzes[activeQuiz]} 
            quizIndex={activeQuiz}
            courseId={course?._id} 
            onSubmit={(result) => {
              setQuizResults(prev => ({
                ...prev,
                [activeQuiz]: result
              }));
              setActiveQuiz(null); // Close the quiz after submission
              toast.success('Quiz submitted successfully!');
            }}
          />
        ) : (
          // Show the list of quizzes
          <>
            {course?.quizzes && course.quizzes.length > 0 ? (
              <div className="space-y-4">
                {course.quizzes.map((quiz, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{quiz.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {quiz.questions.length} questions
                        </p>
                        {quizResults[index] && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Score: {quizResults[index].score?.toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <span className="badge bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Quiz
                      </span>
                    </div>
                    <div className="mt-4">
                      <button 
                        onClick={() => {
                          // Set this quiz as the active quiz using its index
                          setActiveQuiz(index);
                        }}
                        className="btn-primary text-sm"
                      >
                        Start Quiz
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No quizzes available for this course.
              </p>
            )}
            
            {course?.assignments && course.assignments.length > 0 ? (
              <div className="mt-6 space-y-4">
                {course.assignments
                  .filter(assignment => assignment.assignmentType !== 'quiz')
                  .map((assignment) => (
                    <div key={assignment._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{assignment.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {assignment.description}
                          </p>
                          {/* Show assigned students for instructors */}
                          {userProfile?.role === 'instructor' && assignment.assignedStudents && assignment.assignedStudents.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned to:</p>
                              <div className="flex flex-wrap gap-1">
                                {assignment.assignedStudents.slice(0, 3).map((student, index) => (
                                  <span key={student?._id} className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs">
                                    {student?.firstName} {student?.lastName} ({student?.studentId || 'N/A'})
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
                        <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {assignment.assignmentType}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span>Due: {assignment.dueDate && formatDate(assignment.dueDate)}</span>
                        <span className="mx-2">•</span>
                        <span>{assignment.maxPoints} points</span>
                      </div>
                      <div className="mt-4">
                        <button className="btn-primary text-sm">
                          View Assignment
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 mt-4">
                No assignments available for this course.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;