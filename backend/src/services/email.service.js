const { Resend } = require('resend');
const config = require('../config/env');

// Validate email configuration on initialization
const validateEmailConfig = () => {
  const requiredVars = [
    'RESEND_API_KEY',
    'SMTP_FROM'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    // Only throw error in production, warn in development
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Email service not configured. Missing environment variables: ${missingVars.join(', ')}. ` +
        'Password reset emails will fail.'
      );
    } else {
      console.warn(
        `Email service not fully configured. Missing: ${missingVars.join(', ')}. ` +
        'Emails will not be sent in development mode.'
      );
      return false;
    }
  }
  
  return true;
};

// Initialize Resend client lazily
let resendClient = null;

const getResendClient = () => {
  if (resendClient) return resendClient;
  
  if (!validateEmailConfig()) {
    return null;
  }
  
  try {
    resendClient = new Resend(process.env.RESEND_API_KEY);
    return resendClient;
  } catch (error) {
    console.error('Failed to create Resend client:', error.message);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    return null;
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  const resend = getResendClient();
  
  if (!resend) {
    const error = new Error('Email service not configured');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    });
    
    if (error) {
      console.error(
        `Email delivery failed to ${to.replace(/(.{2}).*@/, '$1***@')}:`,
        error.message
      );
      
      const sanitizedError = new Error('Failed to send email');
      sanitizedError.code = 'EMAIL_SEND_FAILED';
      sanitizedError.originalError = error.message;
      throw sanitizedError;
    }
    
    // Log success without exposing sensitive data
    console.log(`Email sent successfully to ${to.replace(/(.{2}).*@/, '$1***@')}: ${subject}`);
    
    return { id: data?.id };
  } catch (error) {
    // Log error without exposing secrets
    console.error(
      `Email delivery failed to ${to.replace(/(.{2}).*@/, '$1***@')}:`,
      error.message
    );
    
    // Re-throw with sanitized error
    const sanitizedError = new Error('Failed to send email');
    sanitizedError.code = 'EMAIL_SEND_FAILED';
    sanitizedError.originalError = error.message;
    throw sanitizedError;
  }
};

const sendPasswordResetEmail = async (email, resetUrl, expirationMinutes = 15) => {
  const subject = 'Reset Your ResourceFull Password';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4a90e2; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4a90e2; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ResourceFull</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password. Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p><code>${resetUrl}</code></p>
          
          <div class="warning">
            <strong>Important:</strong>
            <ul>
              <li>This link will expire in ${expirationMinutes} minutes</li>
              <li>If you didn't request a password reset, please ignore this email</li>
              <li>For security, this link can only be used once</li>
            </ul>
          </div>
          
          <p>If you have any questions, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>This email was sent from ResourceFull. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Password Reset Request

Hello,

We received a request to reset your password. Use the following link to reset your password:
${resetUrl}

This link will expire in ${expirationMinutes} minutes.

If you didn't request a password reset, please ignore this email.

For security, this link can only be used once.

Best regards,
ResourceFull Team
  `;
  
  return sendEmail({ to: email, subject, html, text });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  validateEmailConfig
};
