// server/services/inviteService.js
import { envConfig } from '../config/env.config.js';
import nodemailer from 'nodemailer';

// ✅ SERVICE ONLY HANDLES EMAIL - NO DATABASE OPERATIONS
export const sendInvitationEmail = async ({ name, email, role, workspaceName }) => {
  // 🛑 Skip email if credentials missing
  if (!envConfig.mail.user || !envConfig.mail.pass) {
    console.warn('📧 Email credentials not configured — skipping email');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: envConfig.mail.service || 'gmail',
      auth: {
        user: envConfig.mail.user,
        pass: envConfig.mail.pass,
      },
    });

    // Verify connection (optional but helpful)
    await transporter.verify();

    const mailOptions = {
      from: `"CloudMaSa Team" <${envConfig.mail.user}>`,
      to: email,
      subject: `You're invited to CloudMaSa as ${role}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>CloudMaSa Invitation</h2>
          <p>Hello,</p>
          <p><strong>${name}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace as a <strong>${role}</strong>.</p>
          <p><a href="${envConfig.app.frontendURL}/login" 
             style="background-color: #F26A2E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Accept Invitation
          </a></p>
          <p>If you did not expect this email, ignore it.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent:', info.messageId);
  } catch (emailError) {
    console.error('📧 Failed to send email:', emailError.message);
  }
};