const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Credential = require('./models/Credential');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Function to send OTP email
async function sendOtpEmail(email, otp) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">OTP Verification</h2>
          <p style="color: #555; font-size: 16px;">Your One-Time Password (OTP) for authentication is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; background-color: #f5f5f5; padding: 10px 20px; border-radius: 5px;">${otp}</span>
          </div>
          <p style="color: #555; font-size: 14px;">This OTP will expire in 10 minutes. Please do not share this with anyone.</p>
          <p style="color: #888; font-size: 12px; text-align: center; margin-top: 40px;">If you did not request this OTP, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// WebAuthn utility functions
function generateChallenge() {
  return crypto.randomBytes(32).toString('base64');
}

function arrayBufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

// Register Route
app.post('/register', async (req, res) => {
  try {
    const {
      fullName,
      username,
      nic,
      empId,
      phone,
      email,
      dob,
      gender,
      password,
      userType,
      fingerprintData,
    } = req.body;

    if (!fullName || !username || !nic || !empId || !phone || !email || !dob || !gender || !password || !userType) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }, { nic }, { empId }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email, username, NIC, or employee ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const user = new User({
      fullName,
      username,
      nic,
      empId,
      phone,
      email,
      dob,
      gender,
      password: hashedPassword,
      userType,
      fingerprintData,
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// WebAuthn Registration Routes
app.post('/api/webauthn/register', async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const challenge = generateChallenge();
    
    // Store challenge temporarily (in production, use a session or temporary storage)
    user.webauthnChallenge = challenge;
    await user.save();

    const publicKey = {
      challenge,
      rp: {
        name: "Biometric Auth System",
        id: process.env.RP_ID || "localhost"
      },
      user: {
        id: Buffer.from(user._id.toString()).toString('base64'),
        name: user.username,
        displayName: user.fullName
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    };

    res.json(publicKey);
  } catch (error) {
    console.error('WebAuthn registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/webauthn/verify-registration', async (req, res) => {
  try {
    const { username, attestation } = req.body;
    const user = await User.findOne({ username });

    if (!user || !user.webauthnChallenge) {
      return res.status(400).json({ message: 'Invalid registration request' });
    }

    // Verify challenge
    const expectedChallenge = user.webauthnChallenge;
    const clientDataJSON = Buffer.from(attestation.response.clientDataJSON, 'base64');
    const clientData = JSON.parse(clientDataJSON.toString());

    if (clientData.challenge !== expectedChallenge) {
      return Amsterdamres.status(400).json({ message: 'Invalid challenge' });
    }

    // Store credential
    const credential = new Credential({
      userId: user._id,
      credentialId: attestation.id,
      publicKey: attestation.response.attestationObject,
      counter: 0
    });

    await credential.save();
    
    // Clear challenge
    user.webauthnChallenge = undefined;
    await user.save();

    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('WebAuthn verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// WebAuthn Authentication Routes
app.post('/api/webauthn/authenticate', async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const credentials = await Credential.find({ userId: user._id });
    const challenge = generateChallenge();

    user.webauthnChallenge = challenge;
    await user.save();

    const publicKey = {
      challenge,
      rpId: process.env.RP_ID || "localhost",
      allowCredentials: credentials.map(cred => ({
        type: "public-key",
        id: cred.credentialId
      })),
      userVerification}
    });
  } catch (error) {
    console.error('WebAuthn authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
});

app.post('/api/webauthn/verify-assertion', async (req, res) => {
  try {
    const { username, assertion } = req.body;
    const user = await User.findOne({ username });

    if (!user || !user.webauthnChallenge) {
      return res.status(400).json({ message: 'Invalid authentication request' });
    }

    const credential = await Credential.findOne({ credentialId: assertion.id });
    if (!credential) {
      return res.status(400).json({ message: 'Credential not found' });
    }

    // Verify challenge
    const clientDataJSON = Buffer.from(assertion.response.clientDataJSON, 'base64');
    const clientData = JSON.parse(clientDataJSON.toString());

    if (clientData.challenge !== user.webauthnChallenge) {
      return res.status(400).json({ message: 'Invalid challenge' });
    }

    // In production, verify signature and authenticator data
    // This is a simplified version
    user.webauthnChallenge = undefined;
    await user.save();

    res.json({ success: true, message: 'Authentication successful' });
  } catch (error) {
    console.error('WebAuthn assertion verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Login Route
app.get('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const hardcodedOtps = ['467982', '968543', '740156', '782361', '231569', '246902'];
    const otp = hardcodedOtps[Math.floor(Math.random() * hardcodedOtps.length)];
    
    const emailSent = await sendOtpEmail(user.email, otp);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    res.json({ 
      message: 'Login successful. OTP sent to your email.',
      token,
      otpSent: true 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// OTP Verification Route
app.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }
    
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// Get All Users Route
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -fingerprintData -otp -otpExpires');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Resend OTP Route
app.post('/resend-otp', verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (req.user.email !== email) {
      return res.status(403).json({ message: 'Unauthorized request' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const hardcodedOtps = ['467982', '968543', '740156', '782361', '231569', '246902'];
    const otp = hardcodedOtps[Math.floor(Math.random() * hardcodedOtps.length)];
    
    const emailSent = await sendOtpEmail(user.email, otp);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }
    
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    
    res.json({ message: 'New OTP sent successfully', otpSent: true });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error while resending OTP' });
  }
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));