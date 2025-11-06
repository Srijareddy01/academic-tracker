import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Register user in backend
  const registerUser = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      setUserProfile(response.data.user);
      // Store user profile in localStorage
      localStorage.setItem('userProfile', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Get user profile from backend
  const fetchUserProfile = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Auto-enroll student in batch courses if they have a batch
      if (response.data.user.role === 'student' && response.data.user.batch) {
        try {
          await api.post('/courses/auto-enroll', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (enrollError) {
          console.error('Auto-enrollment error:', enrollError);
        }
        
        // Auto-assign student to batch assignments
        try {
          const assignResponse = await api.post('/assignments/auto-assign', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Auto-assignment result:', assignResponse.data);
        } catch (assignError) {
          console.error('Auto-assignment error:', assignError);
        }
      }
      
      setUserProfile(response.data.user);
      // Store user profile in localStorage
      localStorage.setItem('userProfile', JSON.stringify(response.data.user));
      return response.data.user;
    } catch (error) {
      console.error('Profile fetch error:', error);
      
      // Handle different types of errors
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error') || error.message.includes('CORS')) {
        console.error('Network error - backend might not be running');
        toast.error('Unable to connect to server. Please check your connection and ensure the backend server is running.');
      } else if (error.response?.status === 500) {
        console.error('Server error - backend might have issues');
        toast.error('Server error. Please try again later.');
      } else if (error.response?.status === 404) {
        // User doesn't exist in backend
        console.log('User profile not found in backend - needs registration');
        return null;
      }
      
      // If user doesn't exist in backend, they need to complete registration
      return null;
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, userData) => {
    try {
      setLoading(true);
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase profile
      await updateProfile(firebaseUser, {
        displayName: `${userData.firstName} ${userData.lastName}`
      });

      // Register user in backend
      const registrationData = {
        ...userData,
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email
      };
      
      await registerUser(registrationData);
      
      toast.success('Account created successfully!');
      return firebaseUser;
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user profile from backend
      const profile = await fetchUserProfile(firebaseUser);
      
      if (!profile) {
        await signOut(auth);
        throw new Error('User profile not found. Please complete registration.');
      }
      
      toast.success('Signed in successfully!');
      return firebaseUser;
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Handle network errors specifically
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        toast.error('Unable to connect to server. Please check if the backend is running.');
      } else {
        toast.error(error.message || 'Failed to sign in');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      // Fetch user profile from backend
      const profile = await fetchUserProfile(firebaseUser);
      
      // If user doesn't exist in backend, they need to complete registration
      if (!profile) {
        // User is authenticated with Google but not registered in our system
        // They will be redirected to complete registration
        toast.success('Google authentication successful! Please complete your registration.');
        return null; // Indicates user needs to complete registration
      } else {
        toast.success('Signed in successfully!');
        return profile; // Indicates user is already registered
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register new user with Google data
  const registerWithGoogle = async (registrationData, batch = '') => {
    try {
      setLoading(true);
      if (!user) {
        throw new Error('No user is currently signed in');
      }

      // If registrationData is not already prepared, prepare it from individual parameters
      let dataToSend;
      if (typeof registrationData === 'object' && registrationData !== null) {
        // New format - registrationData is already prepared
        dataToSend = {
          ...registrationData,
          firebaseUid: user.uid,
          email: user.email,
          profilePicture: user.photoURL || ''
        };
      } else {
        // Old format - individual parameters
        const role = registrationData;
        dataToSend = {
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          role: role,
          firebaseUid: user.uid,
          profilePicture: user.photoURL || '',
          batch: role === 'student' ? batch : ''
        };
      }
      
      // Register user in backend and update userProfile state
      const response = await registerUser(dataToSend);
      setUserProfile(response.user);
      
      toast.success('Registration completed successfully!');
      return user;
    } catch (error) {
      console.error('Google registration error:', error);
      toast.error(error.message || 'Failed to complete registration');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      // Clear user profile from localStorage
      localStorage.removeItem('userProfile');
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send password reset email');
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (profileData) => {
    try {
      const token = await user.getIdToken();
      const response = await api.put('/auth/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile(response.data.user);
      // Update user profile in localStorage
      localStorage.setItem('userProfile', JSON.stringify(response.data.user));
      toast.success('Profile updated successfully!');
      return response.data.user;
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Handle network errors specifically
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        toast.error('Unable to connect to server. Please check your connection.');
      } else {
        toast.error('Failed to update profile');
      }
      
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user profile from backend
        const profile = await fetchUserProfile(firebaseUser);
        if (profile) {
          // Set user profile when successfully fetched
          setUserProfile(profile);
        } else {
          // User exists in Firebase but not in backend
          // This means they need to complete registration
          console.log('User needs to complete registration');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        // Clear user profile from localStorage
        localStorage.removeItem('userProfile');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    registerWithGoogle,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};