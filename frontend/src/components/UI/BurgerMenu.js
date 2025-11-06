import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BellIcon,
  UserIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

const BurgerMenu = ({ isOpen, onClose, userProfile }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Courses', href: '/courses', icon: AcademicCapIcon },
    { name: 'Assignments', href: '/assignments', icon: ClipboardDocumentListIcon },
    { name: 'Submissions', href: '/submissions', icon: DocumentTextIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, role: 'instructor' },
    { name: 'Grades', href: '/grades', icon: ChartBarIcon },
    { name: 'Notifications', href: '/notifications', icon: BellIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item => {
    if (item.role === 'instructor') {
      return userProfile?.role === 'instructor';
    }
    return true;
  });

  // Toggle sidebar collapse state
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar - hidden by default on all screens, appears when burger menu is clicked */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'w-20' : 'w-64'
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
            {!collapsed ? (
              <>
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
                    <AcademicCapIcon className="h-6 w-6 text-white" />
                  </div>
                  <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                    Academic<span className="text-blue-600 dark:text-blue-400">Tracker</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  onClick={onClose}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </>
            ) : (
              <div className="flex w-full justify-center">
                <button
                  type="button"
                  className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  onClick={onClose}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {/* Collapse/Expand toggle button */}
          <div className="flex justify-end px-2 py-2">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              onClick={toggleCollapse}
            >
              {collapsed ? (
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-400 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                  )}
                  onClick={onClose}
                >
                  <Icon
                    className={clsx(
                      'flex-shrink-0',
                      isActive(item.href)
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                      collapsed ? 'h-6 w-6 mx-auto' : 'h-5 w-5 mr-3'
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed && item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              {userProfile?.profilePicture ? (
                <img
                  className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                  src={userProfile.profilePicture}
                  alt={userProfile.firstName}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-medium text-white">
                    {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
                  </span>
                </div>
              )}
              {!collapsed && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {userProfile?.firstName} {userProfile?.lastName}
                  </p>
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      userProfile?.role === 'instructor' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {userProfile?.role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BurgerMenu;