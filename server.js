const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

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

    // Validate required fields
    if (!fullName || !username || !nic || !empId || !phone || !email || !dob || !gender || !password || !userType) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }, { nic }, { empId }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email, username, NIC, or employee ID already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
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

    // Save user to database
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Get All Users Route
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -fingerprintData'); // Exclude sensitive fields
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));