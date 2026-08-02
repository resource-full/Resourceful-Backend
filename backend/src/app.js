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
const walletRoutes = require('./modules/wallet/wallet.routes');
const walletWebhookRoutes = require('./modules/wallet/webhook.routes');

const app = express();

// Raw body capture for webhook signature verification (must be before express.json())
app.use('/api/v1/webhooks/paystack', (req, res, next) => {
  let rawBody = '';
  req.on('data', chunk => { rawBody += chunk; });
  req.on('end', () => {
    req.rawBody = rawBody;
    next();
  });
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Webhook routes
app.use('/api/v1/webhooks/paystack', walletWebhookRoutes)

// CORS
const allowedOrigins = process.env.CLIENT_URLS 
  ? process.env.CLIENT_URLS.split(',') 
  : process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [];

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

// Body parsing (after webhook route)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Session middleware (required for Google and LinkedIn OAuth)
app.use(session({
   secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
   resave: false,
   saveUninitialized: false,
   cookie: {
     secure: process.env.NODE_ENV === 'production',
     httpOnly: true,
     maxAge: 24 * 60 * 60 * 1000
   }
 }));

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev'));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

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
app.use('/api/v1/wallet', walletRoutes);
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