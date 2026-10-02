# Email Configuration for Password Reset

## Required Environment Variables for Render Deployment

### Mandatory Email Configuration
These variables MUST be set in Render environment variables for password reset to work:

```bash
RESEND_API_KEY=re_your_resend_api_key_here
SMTP_FROM=noreply@resourcefull.store
FRONTEND_DOMAIN=https://resourcefull-v2.vercel.app  # Frontend URL for reset links
```

### Optional Configuration
```bash
RETURN_RESET_LINK_IN_RESPONSE=false  # Set to true for development only
```

## Important Notes

### Resend Setup:
1. Sign up at resend.com
2. Add your domain (e.g., resourcefull.store) and verify with DNS records
3. Create an API key in Resend dashboard
4. Use the API key as RESEND_API_KEY
5. SMTP_FROM must be a verified domain email address

### Security:
- NEVER commit RESEND_API_KEY to git
- Use Render's environment variables for sensitive data
- SMTP_FROM must be a verified domain in Resend
- Domain verification ensures good deliverability

### Resend Free Tier:
- 100 emails/day
- 3,000 emails/month
- Perfect for password resets

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
