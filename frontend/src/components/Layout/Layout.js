import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BurgerMenu from '../UI/BurgerMenu';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userProfile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex">
      {/* Sidebar - hidden by default on all screens, appears when burger menu is clicked */}
      <BurgerMenu 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        userProfile={userProfile}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          userProfile={userProfile}
        />
        
        {/* Page content */}
        <main className="flex-1 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="card mx-auto max-w-6xl">
              <Outlet />
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} Academic Tracker. All rights reserved.
              </div>
              <div className="mt-2 md:mt-0 flex space-x-6">
                <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm transition-colors duration-200">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm transition-colors duration-200">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm transition-colors duration-200">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;