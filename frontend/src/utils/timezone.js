/**
 * Timezone utility functions for handling IST (Indian Standard Time)
 */

// IST timezone offset in minutes (UTC+5:30)
const IST_OFFSET = 330; // 5 hours 30 minutes in minutes

/**
 * Convert a date to IST timezone
 * @param {Date} date - The date to convert
 * @returns {Date} - The date in IST timezone
 */
export const toIST = (date) => {
  if (!date) return null;
  
  // Create a new date to avoid mutating the original
  const utcDate = new Date(date);
  
  // Get the UTC time in milliseconds
  const utcTime = utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000);
  
  // Add IST offset (UTC+5:30)
  const istTime = utcTime + (IST_OFFSET * 60000);
  
  return new Date(istTime);
};

/**
 * Convert a date from IST to UTC
 * @param {Date} date - The IST date to convert
 * @returns {Date} - The date in UTC
 */
export const fromIST = (date) => {
  if (!date) return null;
  
  // Create a new date to avoid mutating the original
  const istDate = new Date(date);
  
  // Get the IST time in milliseconds
  const istTime = istDate.getTime();
  
  // Subtract IST offset to get UTC
  const utcTime = istTime - (IST_OFFSET * 60000);
  
  return new Date(utcTime);
};

/**
 * Format a date in IST for display
 * @param {string|Date} dateString - The date to format
 * @returns {string} - Formatted date string in IST
 */
export const formatISTDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const istDate = toIST(date);
  
  return istDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
};

/**
 * Format a date in IST for input fields
 * @param {string|Date} dateString - The date to format
 * @returns {string} - Formatted date string for input fields
 */
export const formatISTDateForInput = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const istDate = toIST(date);
  
  // Return date in YYYY-MM-DD format for input fields
  return istDate.toISOString().split('T')[0];
};

/**
 * Get IST time components (hours, minutes, period)
 * @param {string|Date} dateString - The date to extract time from
 * @returns {object} - Object with hour, minute, and period (AM/PM)
 */
export const getISTTimeComponents = (dateString) => {
  if (!dateString) return { hour: 12, minute: 0, period: 'AM' };
  
  const date = new Date(dateString);
  const istDate = toIST(date);
  
  let hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  hours = hours % 12 || 12;
  
  return { hour: hours, minute: minutes, period };
};

export default {
  toIST,
  fromIST,
  formatISTDate,
  formatISTDateForInput,
  getISTTimeComponents
};