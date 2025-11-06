# Academic Progress Tracker - Production Deployment Guide

This guide covers deploying the Academic Progress Tracker application to production with Firestore in production mode.

## 🚀 Prerequisites

Before deploying to production, ensure you have:

- **Firebase Project** with Authentication and Firestore enabled
- **MongoDB Atlas** cluster for production database
- **Domain names** for frontend and backend
- **SSL certificates** for HTTPS
- **Cloud hosting** (Heroku, Railway, DigitalOcean, AWS, etc.)

## 🔧 Step 1: Firebase Production Setup

### 1.1 Create Production Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project: "Academic Progress Tracker Production"
3. Enable Authentication with Email/Password
4. Enable Firestore Database
5. Configure security rules (see `backend/firestore.rules`)

### 1.2 Configure Firestore Security Rules

Deploy the security rules to your production Firestore:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules
```

### 1.3 Generate Production Service Account

1. Go to Project Settings → Service Accounts
2. Generate new private key
3. Download the JSON file
4. Extract the required values for your `.env.production` file

## 🔧 Step 2: MongoDB Production Setup

### 2.1 Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Configure network access (whitelist your server IPs)
4. Create database user
5. Get connection string

### 2.2 Configure Production Database

```bash
# Connect to your MongoDB Atlas cluster
mongosh "mongodb+srv://username:password@cluster.mongodb.net/academic-progress-tracker-prod"

# Create production database
use academic-progress-tracker-prod

# Create indexes for better performance
db.users.createIndex({ "email": 1 })
db.users.createIndex({ "firebaseUid": 1 })
db.courses.createIndex({ "instructor": 1 })
db.assignments.createIndex({ "course": 1, "dueDate": 1 })
db.submissions.createIndex({ "student": 1, "assignment": 1 })
```

## 🔧 Step 3: Backend Production Deployment

### 3.1 Configure Environment Variables

Copy the production environment file:

```bash
cp .env.production .env
```

Update the values in `.env`:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/academic-progress-tracker-prod
FIREBASE_PROJECT_ID=your-production-project-id
# ... other production values
```

### 3.2 Deploy Firestore Configuration

```bash
# Install dependencies
npm install

# Deploy Firestore configuration
npm run deploy:firestore

# Set up production collections
npm run setup:production
```

### 3.3 Deploy to Cloud Platform

#### Option A: Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create Heroku app
heroku create academic-progress-tracker-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set FIREBASE_PROJECT_ID=your-firebase-project-id
# ... set all other environment variables

# Deploy
git push heroku main
```

#### Option B: Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize Railway project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set MONGODB_URI=your-mongodb-uri
# ... set all other environment variables

# Deploy
railway up
```

#### Option C: DigitalOcean App Platform

1. Go to DigitalOcean App Platform
2. Create new app
3. Connect your GitHub repository
4. Configure build settings
5. Set environment variables
6. Deploy

### 3.4 Configure Production Firestore

```bash
# Run the Firestore deployment script
node scripts/deploy-firestore.js
```

This will:
- Set up production collections
- Create necessary indexes
- Deploy security rules
- Configure system settings

## 🔧 Step 4: Frontend Production Deployment

### 4.1 Configure Environment Variables

Copy the production environment file:

```bash
cp .env.production .env
```

Update the values in `.env`:

```env
REACT_APP_ENV=production
REACT_APP_FIREBASE_API_KEY=your-production-api-key
REACT_APP_API_URL=https://your-api-domain.com/api
# ... other production values
```

### 4.2 Build for Production

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### 4.3 Deploy to Cloud Platform

#### Option A: Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=build
```

#### Option C: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase hosting
firebase init hosting

# Build and deploy
npm run build
firebase deploy --only hosting
```

## 🔧 Step 5: Production Configuration

### 5.1 Configure Firestore Production Settings

```javascript
// In your production environment
const firestore = admin.firestore();
firestore.settings({
  cacheSizeBytes: admin.firestore.CACHE_SIZE_UNLIMITED,
  ignoreUndefinedProperties: true,
  maxRetries: 3,
  timeout: 30000
});
```

### 5.2 Set Up Monitoring

```bash
# Install monitoring tools
npm install --save @google-cloud/monitoring

# Configure error reporting
npm install --save @google-cloud/error-reporting
```

### 5.3 Configure Backup Strategy

```bash
# Set up automated backups
# This can be done through MongoDB Atlas or Firebase
# Configure backup schedules and retention policies
```

## 🔧 Step 6: Security Configuration

### 6.1 Firestore Security Rules

Ensure your production Firestore has proper security rules:

```javascript
// Deploy security rules
firebase deploy --only firestore:rules
```

### 6.2 CORS Configuration

Update CORS settings for production:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### 6.3 Rate Limiting

Configure production rate limiting:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

## 🔧 Step 7: Testing Production Deployment

### 7.1 Health Check

Test your production API:

```bash
curl https://your-api-domain.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2023-...",
  "environment": "production"
}
```

### 7.2 Firestore Connection Test

Test Firestore connectivity:

```bash
curl https://your-api-domain.com/api/firestore/notifications
```

### 7.3 Frontend Connection Test

Test frontend-backend connection:

1. Visit your production frontend URL
2. Try to register a new user
3. Test login functionality
4. Verify real-time notifications

## 🔧 Step 8: Monitoring and Maintenance

### 8.1 Set Up Monitoring

- **Firebase Console**: Monitor Firestore usage and performance
- **MongoDB Atlas**: Monitor database performance
- **Application Logs**: Set up log aggregation
- **Error Tracking**: Configure error reporting

### 8.2 Performance Optimization

```javascript
// Enable Firestore offline persistence
firestore.settings({
  cacheSizeBytes: admin.firestore.CACHE_SIZE_UNLIMITED
});

// Configure connection pooling
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 8.3 Backup Strategy

- **MongoDB**: Set up automated backups through Atlas
- **Firestore**: Configure export schedules
- **Application**: Set up database dumps

## 🚨 Troubleshooting

### Common Issues

#### Firestore Connection Issues
```bash
# Check Firebase configuration
firebase projects:list
firebase use your-project-id
```

#### MongoDB Connection Issues
```bash
# Test MongoDB connection
mongosh "your-connection-string"
```

#### CORS Issues
- Verify CORS origin settings
- Check HTTPS configuration
- Ensure proper headers

#### Performance Issues
- Monitor Firestore usage
- Check database indexes
- Optimize queries
- Enable caching

## 📊 Production Monitoring

### Key Metrics to Monitor

1. **API Response Times**
2. **Database Query Performance**
3. **Firestore Read/Write Operations**
4. **Error Rates**
5. **User Activity**
6. **System Resource Usage**

### Alerts to Set Up

1. **High Error Rates** (>5%)
2. **Slow Response Times** (>2s)
3. **Database Connection Issues**
4. **Firestore Quota Exceeded**
5. **Memory Usage High** (>80%)

## 🎉 Production Checklist

- [ ] Firebase project configured
- [ ] Firestore security rules deployed
- [ ] MongoDB Atlas cluster set up
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Performance testing completed
- [ ] Security audit completed
- [ ] Documentation updated

## 🆘 Support

For production issues:

1. Check application logs
2. Monitor Firebase Console
3. Review MongoDB Atlas metrics
4. Check cloud platform status
5. Contact support team

Your Academic Progress Tracker is now ready for production use! 🚀
