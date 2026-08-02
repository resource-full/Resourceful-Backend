const app = require('./app');
const connectDB = require('./config/db');
const { PORT } = require('./config/env');
const paymentReconciliation = require('./services/paymentReconciliation.service');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Connect to database
connectDB();

const server = app.listen(PORT, () => {
  console.log(`ResourceFull API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: https://backend-ta1r.onrender.com/health`);

  // Start payment reconciliation service
  paymentReconciliation.start();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully');
  paymentReconciliation.stop();
  server.close(() => {
    console.log('Process terminated!');
  });
});

module.exports = server;