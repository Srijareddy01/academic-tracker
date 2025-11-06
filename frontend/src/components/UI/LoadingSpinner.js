import React from 'react';
import clsx from 'clsx';

const LoadingSpinner = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const borderClasses = {
    small: 'border-2',
    medium: 'border-3',
    large: 'border-4',
    xl: 'border-4'
  };

  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400',
          sizeClasses[size],
          borderClasses[size]
        )}
      />
    </div>
  );
};

export default LoadingSpinner;