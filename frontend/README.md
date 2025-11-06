# Academic Progress Tracker - Frontend

React.js frontend for the Academic Progress Tracker application with Firebase Authentication, real-time updates, and modern UI.

## 🚀 Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with your Firebase credentials.

4. Start the development server:
```bash
npm start
```

## 📁 Project Structure

```
frontend/src/
├── components/         # Reusable components
│   ├── Layout/         # Layout components
│   ├── UI/            # UI components
│   └── Auth/          # Authentication components
├── pages/             # Page components
│   ├── Auth/          # Authentication pages
│   ├── Dashboard/      # Dashboard pages
│   ├── Courses/       # Course pages
│   ├── Assignments/   # Assignment pages
│   ├── Submissions/   # Submission pages
│   ├── Grades/        # Grade pages
│   ├── Profile/       # Profile pages
│   └── Notifications/ # Notification pages
├── contexts/          # React contexts
│   ├── AuthContext.js # Authentication context
│   └── ThemeContext.js # Theme context
├── services/          # API services
│   └── api.js         # Axios configuration
├── config/            # Configuration files
│   └── firebase.js    # Firebase configuration
└── App.js            # Main App component
```

## 🎨 UI Components

### Layout Components
- `Layout` - Main application layout
- `Header` - Top navigation header
- `Sidebar` - Side navigation menu

### UI Components
- `LoadingSpinner` - Loading indicator
- `ProtectedRoute` - Route protection

### Authentication Components
- `Login` - User login page
- `Register` - User registration page

## 🔧 Features

### Authentication
- Firebase Authentication integration
- Role-based access control
- Secure token management
- User profile management

### Dashboard
- Role-based dashboard
- Real-time statistics
- Quick actions
- Recent activity

### Course Management
- Course listing and details
- Enrollment management
- Course creation (instructor)
- Course analytics

### Assignment Management
- Assignment listing and details
- Assignment creation (instructor)
- Assignment submission (student)
- File upload support

### Grade Management
- Grade tracking
- Progress visualization
- Grade analytics
- Performance insights

### Real-time Features
- Live notifications
- Real-time updates
- Progress tracking
- Instant feedback

## 🎨 Styling

The application uses Tailwind CSS for styling with:
- Custom color palette
- Dark mode support
- Responsive design
- Modern UI components
- Accessibility features

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication
3. Enable Firestore
4. Configure your project settings
5. Add your configuration to `.env`

### Environment Variables
See `.env.example` for all required environment variables.

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first design
- Tablet optimization
- Desktop enhancement
- Touch-friendly interfaces

## 🌙 Dark Mode

The application supports dark mode with:
- System preference detection
- Manual theme switching
- Persistent theme selection
- Smooth transitions

## 🚀 Performance

- Code splitting
- Lazy loading
- Optimized images
- Efficient state management
- React Query for data fetching

## 🧪 Testing

Run tests with:
```bash
npm test
```

## 🚀 Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to your preferred platform:
- Vercel
- Netlify
- Firebase Hosting
- AWS S3 + CloudFront

## 📦 Dependencies

### Core Dependencies
- React 18
- React Router DOM
- React Query
- Firebase SDK
- Tailwind CSS

### UI Dependencies
- Heroicons
- Headless UI
- Framer Motion
- React Hot Toast

### Form Dependencies
- React Hook Form
- React Dropzone

### Chart Dependencies
- Recharts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
