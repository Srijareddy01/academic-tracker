/**
 * Timezone utility functions for handling IST (Indian Standard Time)
 */

// IST timezone offset in minutes (UTC+5:30)
const IST_OFFSET = 330; // 5 hours 30 minutes in minutes

/**
 * Convert a date to IST timezone
 * @param {Date|string|number} date - The date to convert
 * @returns {Date|null} - The date in IST timezone or null if invalid
 */
const toIST = (date) => {
  try {
    if (!date) return null;
    
    // Handle different input types
    let inputDate;
    if (typeof date === 'string' || typeof date === 'number') {
      inputDate = new Date(date);
    } else if (date instanceof Date) {
      inputDate = new Date(date);
    } else {
      return null;
    }
    
    // Check if date is valid
    if (isNaN(inputDate.getTime())) return null;
    
    // Create a new date to avoid mutating the original
    const utcDate = new Date(inputDate);
    
    // Get the UTC time in milliseconds
    const utcTime = utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000);
    
    // Add IST offset (UTC+5:30)
    const istTime = utcTime + (IST_OFFSET * 60000);
    
    return new Date(istTime);
  } catch (error) {
    console.error('Error in toIST:', error);
    return null;
  }
};

/**
 * Convert a date from IST to UTC
 * @param {Date|string|number} date - The IST date to convert
 * @returns {Date|null} - The date in UTC or null if invalid
 */
const fromIST = (date) => {
  try {
    if (!date) return null;
    
    // Handle different input types
    let inputDate;
    if (typeof date === 'string' || typeof date === 'number') {
      inputDate = new Date(date);
    } else if (date instanceof Date) {
      inputDate = new Date(date);
    } else {
      return null;
    }
    
    // Check if date is valid
    if (isNaN(inputDate.getTime())) return null;
    
    // Create a new date to avoid mutating the original
    const istDate = new Date(inputDate);
    
    // Get the IST time in milliseconds
    const istTime = istDate.getTime();
    
    // Subtract IST offset to get UTC
    const utcTime = istTime - (IST_OFFSET * 60000);
    
    return new Date(utcTime);
  } catch (error) {
    console.error('Error in fromIST:', error);
    return null;
  }
};

/**
 * Format a date in IST for display
 * @param {string|Date} dateString - The date to format
 * @returns {string} - Formatted date string in IST
 */
const formatISTDate = (dateString) => {
  try {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const istDate = toIST(date);
    if (!istDate) return '';
    
    return istDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch (error) {
    console.error('Error in formatISTDate:', error);
    return '';
  }
};

module.exports = {
  toIST,
  fromIST,
  formatISTDate
};