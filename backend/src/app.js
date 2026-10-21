const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const errorHandler = require('./middleware/error.middleware');
let rateLimit;
try { rateLimit = require('express-rate-limit'); } catch(e) { rateLimit = null; }

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
const walletRoutes = require('./modules/wallet/wallet.routes');
const walletWebhookRoutes = require('./modules/wallet/webhook.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const exploreRoutes = require('./modules/explore/explore.routes');

const app = express();

// CORS first
const allowedOrigins = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(',').map(o => o.trim())
  : process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

// Raw body for Paystack webhook only - must be before JSON parser
app.use('/api/v1/webhooks/paystack', express.raw({ type: 'application/json', limit: '1mb' }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Request timing & basic observability
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Session middleware - require explicit SESSION_SECRET
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET not set, session cookies will be insecure');
}
app.use(session({
   secret: process.env.SESSION_SECRET,
   resave: false,
   saveUninitialized: false,
   cookie: {
     secure: process.env.NODE_ENV === 'production',
     httpOnly: true,
     sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
     maxAge: 24 * 60 * 60 * 1000
   }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting for sensitive routes
if (rateLimit) {
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
  const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1/payments', paymentLimiter);
  app.use('/api/v1/wallet', paymentLimiter);
}

// Webhook routes after raw parser
app.use('/api/v1/webhooks/paystack', walletWebhookRoutes)

// Health check endpoint with DB ping
app.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    await mongoose.connection.db.admin().ping();
    const lagosTime = new Date().toLocaleString('en-US', { 
      timeZone: 'Africa/Lagos',
      dateStyle: 'full',
      timeStyle: 'long'
    });
    
    res.status(200).json({
      status: 'success',
      message: 'ResourceFull API is running',
      db: 'connected',
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
      iso: new Date().toISOString(),
      lagosTime: lagosTime
    });
  } catch (e) {
    res.status(503).json({ status: 'error', message: 'DB unavailable', error: e.message });
  }
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
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/explore', exploreRoutes);

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
