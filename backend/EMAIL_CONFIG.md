# Email Configuration for Password Reset

## Required Environment Variables for Render Deployment

### Mandatory Email Configuration
These variables MUST be set in Render environment variables for password reset to work:

```bash
SMTP_HOST=smtp.gmail.com  # or your email provider's SMTP host
SMTP_PORT=587              # or 465 for SSL, 587 for TLS
SMTP_SECURE=false          # true for port 465, false for 587
SMTP_USER=your-email@gmail.com  # Your email address
SMTP_PASS=your-app-password     # App-specific password, NOT your regular password
SMTP_FROM=noreply@resourcefull.com  # From address for emails
FRONTEND_DOMAIN=https://resourcefull-v2.vercel.app  # Frontend URL for reset links
```

### Optional Configuration
```bash
RETURN_RESET_LINK_IN_RESPONSE=false  # Set to true for development only
```

## Important Notes

### For Gmail:
1. Enable 2-Factor Authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password as SMTP_PASS, NOT your regular Gmail password

### For Other Providers:
- SMTP settings vary by provider
- Common ports: 587 (TLS), 465 (SSL), 25 (standard)
- Check your provider's documentation for correct settings

### Security:
- NEVER commit email credentials to git
- Use Render's environment variables for sensitive data
- SMTP_PASS should be an app-specific password, not your main password
- Emails are sent from SMTP_FROM which should be a valid domain you control

### Behavior:
- In PRODUCTION: Email service MUST be configured or password reset will fail with clear error
- In DEVELOPMENT: Missing configuration logs warnings but doesn't block execution
- Password reset emails include:
  - Clear reset instructions
  - Expiration period (15 minutes)
  - Warning to ignore if not requested
  - Unique link with token

### Redeployment:
Yes, the application needs to be redeployed after adding new environment variables on Render. Environment variables are read at startup.

## Testing Configuration

Test email configuration by:
1. Setting the environment variables in Render
2. Redeploying the application
3. Making a POST request to /api/v1/auth/forgot-password
4. Checking logs for email delivery status
