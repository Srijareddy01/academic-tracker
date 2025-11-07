const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Set timezone to IST (Indian Standard Time)
process.env.TZ = 'Asia/Kolkata';

const app = express();

// Trust proxy - needed for rate limiting to work properly behind proxies
app.set('trust proxy', 1);

// Serve static files from uploads directory - moved to the very beginning
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Increase timeout for file uploads
app.use((req, res, next) => {
  // Set timeout to 5 minutes for all requests
  req.setTimeout(5 * 60 * 1000);
  res.setTimeout(5 * 60 * 1000);
  next();
});

// CORS configuration - moved to the very beginning to handle preflight requests properly
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Increased limit for file uploads

// MongoDB connection with better options for Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic-progress-tracker';

console.log('Attempting to connect to MongoDB...');
console.log('Using connection string:', MONGODB_URI.replace(/\/\/.*@/, '//****:****@')); // Hide credentials

// Variable to track if database is connected
let isDatabaseConnected = false;

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increase server selection timeout
      socketTimeoutMS: 45000, // Increase socket timeout
      bufferCommands: true, // Changed to true to allow buffering commands before connection
      retryWrites: true
    });
    console.log('MongoDB connected successfully');
    isDatabaseConnected = true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.error('Failed to connect to MongoDB. Please check your connection string and network connectivity.');
    console.error('Connection string:', MONGODB_URI.replace(/\/\/.*@/, '//****:****@')); // Hide credentials
    console.error('Environment variables:');
    console.error('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    console.error('- NODE_ENV:', process.env.NODE_ENV || 'Not set');
    
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Add event listeners for MongoDB connection
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
  isDatabaseConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
  isDatabaseConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
  isDatabaseConnected = false;
});

// Check connection status periodically
setInterval(() => {
  const state = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  console.log(`MongoDB connection state: ${states[state]} (${state})`);
}, 30000); // Log every 30 seconds

// Connect to MongoDB
connectDB();

// Middleware to check if database is connected before processing requests
const checkDatabaseConnection = (req, res, next) => {
  if (!isDatabaseConnected && mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      message: 'Database connection not available',
      error: 'Service temporarily unavailable due to database connection issues'
    });
  }
  next();
};

// Apply database connection check to all routes
app.use(checkDatabaseConnection);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/grades', require('./routes/grades'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/firestore', require('./routes/firestore'));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
 


// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  const mongoState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongoDB: {
      status: mongoStatus,
      state: mongoState,
      readyState: mongoose.connection.readyState
    }
  });
});

// Test route to verify uploads directory is accessible
app.get('/api/test-upload/:filename', (req, res) => {
  const filename = req.params.filename;
  console.log('Testing upload file access:', filename);
  // This will automatically use the static middleware to serve the file
  // If the file exists, it will be served, otherwise it will hit the 404 handler
  res.redirect(`/uploads/${filename}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res, next) => {
  console.log(`404 Error - Route not found: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  res.status(404).json({ message: 'Route not found', path: req.originalUrl, method: req.method });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Listening on address: 0.0.0.0:${PORT}`);
});

// Add error handling for the server
server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('listening', () => {
  const addr = server.address();
  console.log(`Server is listening on ${addr.address}:${addr.port}`);
});

module.exports = app;