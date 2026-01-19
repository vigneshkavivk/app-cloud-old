// const express = require('express');
// const nodemailer = require('nodemailer');
// const cors = require('cors');
// require('dotenv').config();

// const router = express.Router();

// // Middleware
// router.use(cors());
// router.use(express.json());

// // Nodemailer Transporter setup
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Email sending route
// router.post('/send-email', (req, res) => {
//   const { name, email, role } = req.body;

//   if (!name || !email || !role) {
//     return res.status(400).json({ message: 'Name, email and role are required.' });
//   }

//   const subject = `You've been given access to CloudMaSa`;
//   const message = `
//     <div style="font-family: Arial, sans-serif; line-height: 1.6;">
//       <p>You've been given access to CloudMaSa.</p>
      
//       <p><strong>${name}</strong> has given you ${role} access to the CloudMaSa account with WebSpaceKit.</p>
      
//       <p>To accept the invite, please click on the link below:</p>
      
//       <p><a href="https://cloudmasa.com/accept-invite" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">Accept invitation</a></p>
      
//       <p>Invitations are valid for 7 days from the time of issue. After that time, you will need to request a new invite from the account administrator.</p>
//     </div>
//   `;

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: subject,
//     html: message,
//   };

//   transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//       console.error('Error sending email:', error);
//       return res.status(500).json({ message: 'Failed to send email.' });
//     }
//     res.status(200).json({ message: 'Invitation sent successfully!' });
//   });
// });

// module.exports = router;