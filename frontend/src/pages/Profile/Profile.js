import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../services/api';
import { updateCodingProfiles } from '../../services/codingProfilesService';
import { 
  UserCircleIcon, 
  PencilIcon, 
  XMarkIcon, 
  CheckIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  AcademicCapIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { 
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const Profile = () => {
  const { userProfile, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    institution: '',
    department: '',
    studentId: '',
    batch: ''
  });
  const [codingProfiles, setCodingProfiles] = useState({
    leetcode: '',
    hackerrank: '',
    codechef: '',
    codeforces: ''
  });

  // Initialize profile data from user data
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        bio: userProfile.bio || '',
        institution: userProfile.institution || '',
        department: userProfile.department || '',
        studentId: userProfile.studentId || '',
        batch: userProfile.batch || ''
      });
      
      // Initialize coding profiles from user data - only for students
      if (userProfile.role === 'student' && userProfile.codingProfiles) {
        setCodingProfiles({
          leetcode: userProfile.codingProfiles.leetcode?.url || '',
          hackerrank: userProfile.codingProfiles.hackerrank?.url || '',
          codechef: userProfile.codingProfiles.codechef?.url || '',
          codeforces: userProfile.codingProfiles.codeforces?.url || ''
        });
      }
    }
  }, [userProfile]);

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCodingProfileChange = (platform, url) => {
    setCodingProfiles(prev => ({
      ...prev,
      [platform]: url
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const response = await updateProfile(profileData);
      updateUserProfile(response.user);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handleSaveCodingProfiles = async () => {
    try {
      // Format the data for the API
      const formattedProfiles = {};
      Object.keys(codingProfiles).forEach(platform => {
        formattedProfiles[platform] = { url: codingProfiles[platform] };
      });
      
      const response = await updateCodingProfiles(formattedProfiles);
      updateUserProfile(response.user);
      setIsEditing(false);
      toast.success('Coding profiles updated successfully!');
    } catch (error) {
      console.error('Error saving coding profiles:', error);
      toast.error('Failed to update coding profiles. Please try again.');
    }
  };

  // Platform icons mapping
  const platformIcons = {
    leetcode: <AcademicCapIcon className="h-5 w-5 text-orange-500" />,
    hackerrank: <AcademicCapIcon className="h-5 w-5 text-green-500" />,
    codechef: <AcademicCapIcon className="h-5 w-5 text-blue-500" />,
    codeforces: <AcademicCapIcon className="h-5 w-5 text-purple-500" />
  };

  // Platform colors mapping
  const platformColors = {
    leetcode: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    hackerrank: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    codechef: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    codeforces: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="card">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            {userProfile?.profilePicture ? (
              <img
                className="h-24 w-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"
                src={userProfile.profilePicture}
                alt={userProfile.firstName}
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <UserCircleIcon className="h-16 w-16 text-white" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                userProfile?.role === 'instructor' 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {userProfile?.role === 'instructor' ? (
                  <AcademicCapIcon className="h-4 w-4" />
                ) : (
                  <UserIcon className="h-4 w-4" />
                )}
              </div>
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userProfile?.firstName} {userProfile?.lastName}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 capitalize flex items-center justify-center md:justify-start">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                userProfile?.role === 'instructor' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {userProfile?.role === 'instructor' ? (
                  <AcademicCapIcon className="h-4 w-4 mr-1" />
                ) : (
                  <UserIcon className="h-4 w-4 mr-1" />
                )}
                {userProfile?.role}
              </span>
            </p>
            {profileData.bio && (
              <p className="mt-2 text-gray-700 dark:text-gray-300 max-w-md">
                {profileData.bio}
              </p>
            )}
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Personal Information
                </h3>
              </div>
              <button 
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="btn-secondary text-sm flex items-center"
              >
                {isEditingProfile ? (
                  <>
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </>
                ) : (
                  <>
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </button>
            </div>
            
            {isEditingProfile ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => handleProfileChange('firstName', e.target.value)}
                      className="input w-full"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => handleProfileChange('lastName', e.target.value)}
                      className="input w-full"
                      placeholder="Last name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    className="input w-full"
                    rows="3"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Institution
                  </label>
                  <div className="relative">
                    <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.institution}
                      onChange={(e) => handleProfileChange('institution', e.target.value)}
                      className="input w-full pl-10"
                      placeholder="Institution name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <div className="relative">
                    <AcademicCapIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.department}
                      onChange={(e) => handleProfileChange('department', e.target.value)}
                      className="input w-full pl-10"
                      placeholder="Department"
                    />
                  </div>
                </div>
                
                {userProfile?.role === 'student' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Student ID
                      </label>
                      <div className="relative">
                        <IdentificationIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={profileData.studentId}
                          onChange={(e) => handleProfileChange('studentId', e.target.value)}
                          className="input w-full pl-10"
                          placeholder="Student ID"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Batch
                      </label>
                      <input
                        type="text"
                        value={profileData.batch}
                        onChange={(e) => handleProfileChange('batch', e.target.value)}
                        className="input w-full"
                        placeholder="Batch"
                      />
                    </div>
                  </>
                )}
                
                <div className="flex justify-end space-x-3 pt-2">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="btn-secondary flex items-center"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="btn-primary flex items-center"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3">
                    <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Full Name
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {profileData.firstName} {profileData.lastName}
                    </p>
                  </div>
                </div>
                
                {profileData.bio && (
                  <div className="flex items-start">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3 mt-1">
                      <PencilIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Bio
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {profileData.bio}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Institution
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {profileData.institution || 'Not specified'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3">
                    <AcademicCapIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Department
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {profileData.department || 'Not specified'}
                    </p>
                  </div>
                </div>
                
                {userProfile?.role === 'student' && profileData.studentId && (
                  <div className="flex items-center">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3">
                      <IdentificationIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Student ID
                      </label>
                      <p className="text-gray-900 dark:text-white font-mono">
                        {profileData.studentId}
                      </p>
                    </div>
                  </div>
                )}
                
                {userProfile?.role === 'student' && profileData.batch && (
                  <div className="flex items-center">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3">
                      <AcademicCapIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Batch
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {profileData.batch}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
            <div className="flex items-center mb-6">
              <EnvelopeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Account Information
              </h3>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-center">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email Address
                  </label>
                  <p className="text-gray-900 dark:text-white break-all">
                    {userProfile?.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3">
                  <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Role
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userProfile?.role === 'instructor' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {userProfile?.role === 'instructor' ? (
                      <AcademicCapIcon className="h-4 w-4 mr-1" />
                    ) : (
                      <UserIcon className="h-4 w-4 mr-1" />
                    )}
                    {userProfile?.role}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3">
                  <CalendarIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Member Since
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mr-3">
                  <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Last Login
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {userProfile?.lastLogin ? new Date(userProfile.lastLogin).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coding Profiles Section - Only for students */}
        {userProfile?.role === 'student' && (
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Coding Profiles
                </h3>
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="btn-secondary text-sm flex items-center"
              >
                {isEditing ? (
                  <>
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </>
                ) : (
                  <>
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </button>
            </div>
            
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.entries(codingProfiles).map(([platform, url]) => (
                  <div key={platform} className={`border rounded-lg p-4 ${platformColors[platform]}`}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      {platformIcons[platform]}
                      <span className="ml-2 capitalize">{platform} Profile URL</span>
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => handleCodingProfileChange(platform, e.target.value)}
                        className="input w-full pl-10"
                        placeholder={`https://${platform}.com/username`}
                      />
                    </div>
                  </div>
                ))}
                
                <div className="md:col-span-2 flex justify-end space-x-3 pt-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary flex items-center"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveCodingProfiles}
                    className="btn-primary flex items-center"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Save Profiles
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(codingProfiles).map(([platform, url]) => (
                  <div 
                    key={platform} 
                    className={`border rounded-lg p-5 transition-all duration-200 hover:shadow-md ${platformColors[platform]}`}
                  >
                    <div className="flex items-center mb-3">
                      <div className="mr-3">
                        {platformIcons[platform]}
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                        {platform}
                      </h4>
                    </div>
                    {url ? (
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                      >
                        <span className="truncate max-w-[120px]">{url.replace('https://', '').replace('www.', '')}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 text-sm italic">
                        Not linked
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;