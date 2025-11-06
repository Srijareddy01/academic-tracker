import { api } from './api';

/**
 * Update user's coding profiles
 * @param {Object} codingProfiles - Object containing profile URLs for each platform
 * @returns {Promise<Object>} Updated user data
 */
export const updateCodingProfiles = async (codingProfiles) => {
  try {
    const response = await api.put('/auth/profile', { codingProfiles });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update coding profiles');
  }
};

/**
 * Fetch user's coding profile data
 * @returns {Promise<Object>} User's coding profile data
 */
export const fetchCodingProfileData = async () => {
  try {
    const response = await api.get('/auth/profile/coding-data');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch coding profile data');
  }
};

/**
 * Refresh user's coding profile data from external platforms
 * @returns {Promise<Object>} Updated coding profile data
 */
export const refreshCodingProfileData = async () => {
  try {
    const response = await api.post('/auth/profile/coding-data/refresh');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to refresh coding profile data');
  }
};