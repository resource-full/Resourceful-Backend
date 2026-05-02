const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/error.middleware');

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

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/pathways', pathwayRoutes);
app.use('/api/hubs', hubRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

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