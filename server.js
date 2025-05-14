const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const connectToDB = require('./backend/db');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory OTP map (temporary; in production use Redis or DB)
const otpMap = new Map();

// Register Endpoint (you already had this)
app.post('/register', async (req, res) => {
  const userData = req.body;

  try {
    const db = await connectToDB();
    const collection = db.collection('users');
    const result = await collection.insertOne(userData);
    res.status(201).send({ message: 'User registered successfully', id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Registration failed' });
  }
});

// Login Endpoint with OTP sending
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const db = await connectToDB();
    const user = await db.collection('users').findOne({ username, password });

    if (!user) {
      return res.json({ success: false, message: 'Invalid username or password' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpMap.set(username, otp);

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.json({ success: false, message: 'Failed to send OTP email' });
      } else {
        console.log('OTP email sent: ' + info.response);
        return res.json({ success: true });
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// (Optional) Endpoint to verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { username, otp } = req.body;
  const validOtp = otpMap.get(username);

  if (otp === validOtp) {
    otpMap.delete(username); // Remove after verification
    return res.json({ success: true });
  } else {
    return res.json({ success: false, message: 'Invalid OTP' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

const { generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');
const base64url = require('base64url');

const userAuthMap = new Map(); // store user credentials (temporary for demo)
const challengeMap = new Map();

// WebAuthn Challenge Endpoint
app.post('/api/auth-challenge', async (req, res) => {
  const { username } = req.body;

  const options = generateAuthenticationOptions({
    timeout: 60000,
    userVerification: 'required',
  });

  challengeMap.set(username, options.challenge);
  res.json(options);
});

// WebAuthn Verification Endpoint
app.post('/api/verify-auth', async (req, res) => {
  const { username, assertion } = req.body;
  const expectedChallenge = challengeMap.get(username);
  challengeMap.delete(username);

  // You must retrieve the correct user's credential from the DB or memory.
  const userCred = userAuthMap.get(username);
  if (!userCred) return res.json({ success: false, message: 'No credential found for user' });

  try {
    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: 'http://localhost:3000', // Change based on your domain
      expectedRPID: 'localhost',
      authenticator: {
        credentialID: base64url.toBuffer(userCred.credentialID),
        credentialPublicKey: base64url.toBuffer(userCred.credentialPublicKey),
        counter: userCred.counter,
      },
    });

    if (verification.verified) {
      userCred.counter = verification.authenticationInfo.newCounter;
      return res.json({ success: true });
    } else {
      return res.json({ success: false });
    }
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: 'Verification failed' });
  }
});
