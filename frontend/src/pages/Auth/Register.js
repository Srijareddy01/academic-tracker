import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle, userProfile } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        institution: data.institution,
        department: data.department,
        studentId: data.studentId,
        batch: data.batch
      });
      navigate('/dashboard');
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: error.message || 'Failed to create account'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      // Check if user needs to complete registration
      // If userProfile is null or undefined, user needs to complete registration
      if (!userProfile) {
        navigate('/complete-registration');
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: error.message || 'Failed to sign in with Google'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle className="h-5 w-5" />
            Sign up with Google
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    First Name
                  </label>
                  <input
                    {...register('firstName', {
                      required: 'First name is required',
                      minLength: {
                        value: 2,
                        message: 'First name must be at least 2 characters'
                      }
                    })}
                    type="text"
                    className="mt-1 input-field"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Name
                  </label>
                  <input
                    {...register('lastName', {
                      required: 'Last name is required',
                      minLength: {
                        value: 2,
                        message: 'Last name must be at least 2 characters'
                      }
                    })}
                    type="text"
                    className="mt-1 input-field"
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  autoComplete="email"
                  className="mt-1 input-field"
                  placeholder="john.doe@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="mt-1 input-field"
                >
                  <option value="">Select your role</option>
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="institution" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Institution
                </label>
                <input
                  {...register('institution')}
                  type="text"
                  className="mt-1 input-field"
                  placeholder="University Name"
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department
                </label>
                <input
                  {...register('department')}
                  type="text"
                  className="mt-1 input-field"
                  placeholder="Computer Science"
                />
              </div>

              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hallticket Number (if applicable)
                </label>
                <input
                  {...register('studentId')}
                  type="text"
                  className="mt-1 input-field"
                  placeholder="12345678"
                />
              </div>
              
              <div>
                <label htmlFor="batch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Batch (if applicable)
                </label>
                <select
                  {...register('batch')}
                  className="mt-1 input-field"
                >
                  <option value="">Select your batch</option>
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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 input-field"
                  placeholder="Create a password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 input-field"
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {errors.root && (
              <div className="text-sm text-red-600 text-center">
                {errors.root.message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;