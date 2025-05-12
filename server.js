const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const base64url = require('base64url');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = 4000;

// Simulated users DB
const users = [];

// WebAuthn Challenge
let challenge = null;

// Generate WebAuthn challenge
app.get('/generate-challenge', (req, res) => {
  challenge = base64url(crypto.randomBytes(32));
  res.json({
    challenge: challenge,
    rpId: 'localhost',
    userVerification: 'required'
  });
});

// Verify WebAuthn authentication (mock)
app.post('/verify-authentication', (req, res) => {
  const { id, response, type } = req.body;

  if (!id || !response || type !== 'public-key') {
    return res.status(400).send('Invalid response');
  }

  if (challenge) {
    console.log('WebAuthn response received!');
    challenge = null;
    return res.send({ verified: true });
  } else {
    return res.status(400).send('Challenge missing or expired');
  }
});

// Add new user
app.post('/admin/add-user', (req, res) => {
  const { name, phone, email, password, type, empId } = req.body;

  // Basic field check
  if (!name || !phone || !email || !password || !type || !empId) {
    return res.status(400).send('Missing fields');
  }

  // Password validation
  const passwordRegex = /^(?=.[a-z])(?=.[A-Z])(?=.\d)(?=.[\W_]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).send('Password must be at least 8 characters, include uppercase, lowercase, digit, and special character.');
  }

  const exists = users.find(u => u.email === email || u.empId === empId);
  if (exists) return res.status(400).send('User already exists');

  users.push({ name, phone, email, password, type, empId });
  res.send('User added successfully!');
});

// Get all users
app.get('/admin/users', (req, res) => {
  const sanitizedUsers = users.map(({ password, ...u }) => u);
  res.json(sanitizedUsers);
});

app.listen(port, () => {
  console.log(🟢 Server running at http://localhost:${port});
});