const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const errorHandler = require('./middleware/error.middleware');

// Import passport config
require('./config/passport');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const resourceRoutes = require('./modules/resource/resource.routes');
const pathwayRoutes = require('./modules/pathway/pathway.routes');
const hubRoutes = require('./modules/hub/hub.routes');
const interactionRoutes = require('./modules/interaction/interaction.routes');
const paymentRoutes = require('./modules/payment/payment.routes');
const notificationRoutes = require('./modules/notification/notification.routes');

const app = express();


const allowedOrigins = process.env.CLIENT_URLS 
  ? process.env.CLIENT_URLS.split(',') 
  : process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [];

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Session middleware (required for LinkedIn OAuth)
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session()); // Add this for session support

// Health check endpoint
app.get('/health', (req, res) => {
  const lagosTime = new Date().toLocaleString('en-US', { 
    timeZone: 'Africa/Lagos',
    dateStyle: 'full',
    timeStyle: 'long'
  });
  
  res.status(200).json({
    status: 'success',
    message: 'ResourceFull API is running',
    timestamp: new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
    iso: new Date().toISOString(),
    lagosTime: lagosTime
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/pathways', pathwayRoutes);
app.use('/api/v1/hubs', hubRoutes);
app.use('/api/v1/interactions', interactionRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;