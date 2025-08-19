/**
 * Email Service for FleetTracker
 * Currently logs emails to console for development
 * Can be easily extended to use real email services like SendGrid, AWS SES, etc.
 */

class EmailService {
    constructor() {
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@fleettracker.com';
        this.fromName = process.env.FROM_NAME || 'FleetTracker';
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(userEmail, userName, resetToken, resetUrl) {
        const subject = 'Password Reset Request - FleetTracker';
        const html = this.generatePasswordResetEmailHTML(userName, resetToken, resetUrl);
        const text = this.generatePasswordResetEmailText(userName, resetToken, resetUrl);

        return this.sendEmail(userEmail, subject, html, text);
    }

    /**
     * Send email (currently logs to console)
     */
    async sendEmail(to, subject, html, text) {
        const emailData = {
            to,
            from: `${this.fromName} <${this.fromEmail}>`,
            subject,
            html,
            text,
            timestamp: new Date().toISOString()
        };

        // For development, log the email
        console.log('\n📧 EMAIL SENT:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📨 To: ${emailData.to}`);
        console.log(`📤 From: ${emailData.from}`);
        console.log(`📋 Subject: ${emailData.subject}`);
        console.log(`⏰ Time: ${emailData.timestamp}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📄 HTML Content:');
        console.log(emailData.html);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // In production, you would integrate with a real email service here
        // Example with SendGrid:
        /*
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        try {
            await sgMail.send({
                to: emailData.to,
                from: emailData.from,
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text
            });
            console.log('✅ Email sent successfully via SendGrid');
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            throw error;
        }
        */

        return { success: true, messageId: `dev_${Date.now()}` };
    }

    /**
     * Generate HTML email template for password reset
     */
    generatePasswordResetEmailHTML(userName, resetToken, resetUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - FleetTracker</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚛 FleetTracker</h1>
            <p>Password Reset Request</p>
        </div>
        
        <div class="content">
            <h2>Hello ${userName},</h2>
            
            <p>We received a request to reset your password for your FleetTracker account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>For security, this link can only be used once</li>
                </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 4px;">
                ${resetUrl}
            </p>
            
            <p>Best regards,<br>The FleetTracker Team</p>
        </div>
        
        <div class="footer">
            <p>This email was sent to you because someone requested a password reset for your FleetTracker account.</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generate plain text email template for password reset
     */
    generatePasswordResetEmailText(userName, resetToken, resetUrl) {
        return `
Password Reset Request - FleetTracker

Hello ${userName},

We received a request to reset your password for your FleetTracker account.

To reset your password, please visit this link:
${resetUrl}

IMPORTANT:
- This link will expire in 1 hour
- If you didn't request this reset, please ignore this email
- For security, this link can only be used once

If you have any questions, please contact our support team.

Best regards,
The FleetTracker Team

---
This email was sent to you because someone requested a password reset for your FleetTracker account.
        `;
    }
}

module.exports = new EmailService(); 
