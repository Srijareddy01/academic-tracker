import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { api } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const Quiz = ({ quiz, quizIndex, courseId, onSubmit }) => {
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle answer selection
  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  // Submit quiz
  const submitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/submissions/quiz', {
        courseId,
        quizIndex,
        answers: answers
      });
      
      toast.success(`Quiz submitted successfully! Score: ${response.data.score.toFixed(1)}%`);
      onSubmit(response.data);
    } catch (error) {
      console.error('Quiz submission error:', error);
      toast.error('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if all questions have been answered
  const isQuizComplete = quiz.questions.every((_, index) => answers[index] !== undefined || answers[index.toString()] !== undefined);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{quiz.title}</h2>
      
      <div className="space-y-8">
        {quiz.questions.map((question, questionIndex) => (
          <div key={questionIndex} className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {questionIndex + 1}. {question.text}
            </h3>
            
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => (
                <div 
                  key={optionIndex}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    answers[questionIndex] === optionIndex
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                  onClick={() => handleAnswerSelect(questionIndex, optionIndex)}
                >
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                    answers[questionIndex] === optionIndex
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {answers[questionIndex] === optionIndex && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">{option}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-end">
        <button
          onClick={submitQuiz}
          disabled={!isQuizComplete || isSubmitting}
          className={`btn-primary flex items-center ${
            (!isQuizComplete || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="small" className="mr-2" />
              Submitting...
            </>
          ) : (
            'Submit Quiz'
          )}
        </button>
      </div>
      
      {!isQuizComplete && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-4">
          Please answer all questions before submitting.
        </p>
      )}
    </div>
  );
};

export default Quiz;