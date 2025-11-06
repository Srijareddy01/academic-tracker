import axios from 'axios';
import { auth } from '../config/firebase';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for file uploads
const apiUpload = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 60000, // Increased timeout to 60 seconds for file uploads
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Request interceptor to add auth token
const addAuthToken = async (config) => {
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
  }
  return config;
};

// Add interceptors
api.interceptors.request.use(addAuthToken, (error) => Promise.reject(error));
apiUpload.interceptors.request.use(addAuthToken, (error) => Promise.reject(error));

// Response interceptor for error handling
const handleError = (error) => {
  if (error.response?.status === 401) {
    // Token expired or invalid
    auth.signOut();
    window.location.href = '/login';
  }
  
  // Handle network errors
  if (!error.response) {
    error.message = 'Network error. Please check your connection and ensure the backend server is running.';
  }
  
  return Promise.reject(error);
};

api.interceptors.response.use((response) => response, handleError);
apiUpload.interceptors.response.use((response) => response, handleError);

// Export both instances
export { api, apiUpload };

// Profile update functions
export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateProfilePicture = async (profilePictureUrl) => {
  try {
    const response = await api.post('/auth/profile-picture', { profilePictureUrl });
    return response.data;
  } catch (error) {
    throw error;
  }
};
