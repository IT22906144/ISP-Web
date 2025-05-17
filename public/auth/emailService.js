const nodemailer = require('nodemailer');

// Global transporter object
let transporter;

// Initialize the email transporter with your credentials
const initializeTransporter = () => {
  // Create transporter with email service configuration
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, 
    auth: {
      user: process.env.EMAIL_USER,     
      pass: process.env.EMAIL_PASSWORD, 
    },
  });
  
  // Verify the connection configuration
  transporter.verify((error) => {
    if (error) {
      console.error('Email service error:', error);
    } else {
      console.log('Email service is ready to send messages');
    }
  });
};

// Alternative setup using SMTP directly (more customizable)
const initializeSmtpTransporter = () => {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,          
    port: process.env.SMTP_PORT,          
    secure: process.env.SMTP_SECURE === 'true', 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  
  // Verify connection
  transporter.verify((error) => {
    if (error) {
      console.error('SMTP connection error:', error);
    } else {
      console.log('SMTP server is ready to send messages');
    }
  });
};

module.exports = {
  initializeTransporter,
  initializeSmtpTransporter,
  // Other email-related functions would be exported here
};