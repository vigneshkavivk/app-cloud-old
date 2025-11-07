const { envConfig } = require('../config/env.config');
const InviteUser = require('../models/inviteUser');
const nodemailer = require('nodemailer');

const sendInvitationEmail = async ({ name, email, role }) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: envConfig.mail.service,
      auth: {
        user: envConfig.mail.user,
        pass: envConfig.mail.pass,
      },
    });

    // Define email content
    const mailOptions = {
      from: `"CloudMaSa Team" <${envConfig.mail.user}>`,
      to: email,
      subject: `You're invited to CloudMaSa as ${role}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>CloudMaSa Invitation</h2>
          <p>Hello,</p>
          <p><strong>${name}</strong> has invited you to join <strong>CloudMaSa</strong> as a <strong>${role}</strong>.</p>
          <p>Please click the button below to accept the invitation:</p>
     <a href="${envConfig.app.frontendURL}/login" style="background-color: #F26A2E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>

  <p>If you did not expect this email, you can safely ignore it.</p>
        </div>
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);

    // Save to MongoDB
    const invite = new InviteUser({ name, email, role });
    await invite.save();

    return 'Invitation sent successfully.';
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw new Error('Failed to send invitation email.');
  }
};

module.exports = { sendInvitationEmail };
