const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'SendGrid', // Or SMTP config
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: '"AgriTech Support" <support@agritech.com>',
      to,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};