const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Sends a password reset email to the user.
 * Logs the reset link to the console as a fallback in development.
 * 
 * @param {string} email - Recipient email address
 * @param {string} token - Password reset token
 */
const sendResetEmail = async (email, token) => {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  // Log the link so it's always readable in development logs
  logger.info(`🔑 Password Reset Link generated for ${email}: ${resetUrl}`);
  console.log(`\n==================================================`);
  console.log(`🔑 PASSWORD RESET LINK FOR ${email}:`);
  console.log(`${resetUrl}`);
  console.log(`==================================================\n`);

  // Check if SMTP is configured with placeholder values
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  if (!smtpUser || smtpUser === 'your_email@gmail.com' || !smtpPass || smtpPass === 'your_app_password') {
    logger.warn('⚠️ SMTP settings are using default placeholder values. Skipping actual email sending.');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"Call Intelligence CRM" <${process.env.FROM_EMAIL || 'noreply@callcrm.com'}>`,
      to: email,
      subject: 'Reset Password - Call Intelligence CRM',
      text: `To reset your password, please click on the following link: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">Reset Your Password</h2>
          <p style="color: #475569; font-size: 16px; line-height: 24px;">
            We received a request to reset the password for your Call Intelligence CRM account.
            Click the button below to choose a new password.
          </p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">
            This link is valid for 1 hour. If you did not request a password reset, please ignore this email.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            © 2026 Call Intelligence CRM. All rights reserved.
          </p>
        </div>
      `,
    });

    logger.info(`✉️ Reset email sent successfully to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`❌ Failed to send reset email to ${email} via SMTP: ${error.message}`);
    return false;
  }
};

module.exports = { sendResetEmail };
