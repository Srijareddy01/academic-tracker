import React from 'react';
import { BellIcon } from '@heroicons/react/24/outline';

const Notifications = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Stay updated with your academic progress
        </p>
      </div>

      <div className="card">
        <div className="text-center py-12">
          <BellIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No notifications yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You'll receive notifications about assignments, grades, and course updates here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
