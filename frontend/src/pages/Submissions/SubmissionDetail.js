import React from 'react';
import { useQuery } from 'react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { 
  ArrowLeftIcon, 
  DocumentTextIcon, 
  UserIcon, 
  CalendarIcon, 
  TrophyIcon,
  ClockIcon,
  PaperClipIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  console.log('SubmissionDetail component rendered with ID:', id);

  const { data: submission, isLoading, error } = useQuery(
    ['submission', id],
    async () => {
      console.log('Fetching submission with ID:', id);
      if (!id) {
        throw new Error('No submission ID provided');
      }
      
      try {
        const response = await api.get(`/submissions/${id}`);
        console.log('Submission response:', response.data);
        return response.data.submission;
      } catch (err) {
        console.error('Error fetching submission:', err);
        console.error('Error response:', err.response);
        throw err;
      }
    },
    {
      enabled: !!id,
      retry: 1
    }
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
      <div className="card">
        <div className="text-center py-12">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Error Loading Submission</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            There was an error loading this submission. Please try again.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate(-1)}
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has access to view this submission
  const hasAccess = userProfile?.role === 'instructor' || 
                   (userProfile?.role === 'student' && submission?.student?._id === userProfile?._id);

  if (!hasAccess) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            You don't have permission to view this submission.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate(-1)}
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          Submission Details
        </h1>
      </div>

      <div className="card">
        {/* Submission Info */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {submission?.assignment?.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Submitted by {submission?.student?.firstName} {submission?.student?.lastName} ({submission?.student?.studentId || 'N/A'})
              </p>
            </div>
            <div className="mt-2 md:mt-0">
              <span className={`badge ${getStatusColor(submission?.status)}`}>
                {submission?.status}
              </span>
            </div>
          </div>
        </div>

        {/* Submission Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Submission Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Submitted At:</span>
                <span className="text-gray-900 dark:text-white">{formatDate(submission?.submittedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Attempt Number:</span>
                <span className="text-gray-900 dark:text-white">#{submission?.attemptNumber || 1}</span>
              </div>
              {submission?.isLate && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Late Submission:</span>
                  <span className="text-red-600 dark:text-red-400">Yes</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <TrophyIcon className="h-4 w-4 mr-2" />
              Assignment Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                <span className="text-gray-900 dark:text-white">{formatDate(submission?.assignment?.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Max Points:</span>
                <span className="text-gray-900 dark:text-white">{submission?.assignment?.maxPoints || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Assignment Type:</span>
                <span className="text-gray-900 dark:text-white capitalize">{submission?.assignment?.assignmentType || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submission Content */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            {submission?.type === 'quiz' ? 'Quiz Response' : 'Submission Response'}
          </h3>
          {submission?.content ? (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-gray-900 dark:text-white">
                  {submission.content}
                </p>
              </div>
            </div>
          ) : submission?.type === 'quiz' ? (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
              <p className="text-gray-500 dark:text-gray-400">This is a quiz submission. Quiz details are shown below.</p>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
              <p className="text-gray-500 dark:text-gray-400">No content provided</p>
            </div>
          )}
        </div>

        {/* Quiz Response Details */}
        {submission?.type === 'quiz' && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
              Quiz Details
            </h3>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Score</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {submission.quizData?.score?.toFixed(1) || submission.quizDetails?.score?.toFixed(1) || 'N/A'}%
                  </p>
                </div>
                {submission.quizDetails?.correctAnswers !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Correct Answers</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {submission.quizDetails.correctAnswers}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Questions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {submission.quizDetails?.totalQuestions || submission.quizData?.answers?.length || 'N/A'}
                  </p>
                </div>
              </div>
              {submission.quizDetails?.answers && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Answers:</p>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <ul className="space-y-3">
                      {submission.quizDetails.answers.map((answer, index) => {
                        const question = submission.quizDetails?.title?.questions?.[index];
                        return (
                          <li key={index} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
                            <div className="flex items-start">
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${
                                answer.isCorrect 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {answer.isCorrect ? '✓' : '✗'}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  Question {index + 1}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  Selected: Option {answer.selectedOption !== null ? answer.selectedOption + 1 : 'None'}
                                </p>
                                {!answer.isCorrect && answer.correctOption !== null && (
                                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                    Correct: Option {answer.correctOption + 1}
                                  </p>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
              {!submission.quizDetails && submission.quizData?.answers && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Answers:</p>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <ul className="space-y-2">
                      {submission.quizData.answers.map((answer, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <span className="font-medium text-gray-900 dark:text-white mr-2">
                            Question {index + 1}:
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            Option {answer !== null ? answer + 1 : 'Not answered'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attachments Section */}
        {submission?.attachments && submission.attachments.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <PaperClipIcon className="h-4 w-4 mr-2" />
              Attachments
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {submission.attachments.map((attachment, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {attachment.mimeType && attachment.mimeType.startsWith('image/') ? (
                    // Display image preview
                    <div className="mb-2">
                      <img 
                        src={attachment.url.startsWith('http') ? attachment.url : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api${attachment.url}`} 
                        alt={attachment.originalName}
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          console.error('Image load error:', {
                            url: attachment.url,
                            constructedUrl: attachment.url.startsWith('http') ? attachment.url : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api${attachment.url}`,
                            attachment: attachment
                          });
                          // Fallback to full URL construction if direct path doesn't work
                          if (!attachment.url.startsWith('http')) {
                            e.target.src = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${attachment.url}`;
                          }
                        }}
                        onLoad={(e) => {
                          console.log('Image loaded successfully:', {
                            url: attachment.url,
                            constructedUrl: attachment.url.startsWith('http') ? attachment.url : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api${attachment.url}`,
                            attachment: attachment
                          });
                        }}
                      />
                    </div>
                  ) : (
                    // Display file icon for non-image files
                    <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded mb-2">
                      <DocumentTextIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {attachment.originalName}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {attachment.mimeType} • {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                    <a 
                      href={attachment.url.startsWith('http') ? attachment.url : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api${attachment.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs mt-1 inline-block"
                      onClick={(e) => {
                        const url = attachment.url.startsWith('http') ? attachment.url : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api${attachment.url}`;
                        console.log('Download link clicked:', {
                          url: url,
                          attachment: attachment
                        });
                      }}
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grade Information */}
        {submission?.grade && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <TrophyIcon className="h-4 w-4 mr-2" />
              Grade Information
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Points</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {submission.grade.points}/{submission.assignment?.maxPoints || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Percentage</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {submission.grade.percentage}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Letter Grade</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {submission.grade.letterGrade || 'N/A'}
                  </p>
                </div>
              </div>
              {submission.grade.feedback && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Feedback</p>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {submission.grade.feedback}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Graded by {submission.grade.gradedBy?.firstName} {submission.grade.gradedBy?.lastName} on {formatDate(submission.grade.gradedAt)}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Back
          </button>
          <Link
            to={`/assignments/${submission?.assignment?._id}`}
            className="btn-primary"
          >
            View Assignment
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetail;