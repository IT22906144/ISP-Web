const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  nic: { type: String, required: true, unique: true },
  empId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dob: { type: Date, required: true },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  password: { type: String, required: true },
  userType: { type: String, required: true, enum: ['Employee', 'Admin'] },
  fingerprintData: { type: String },
  otp: { type: String },
  otpExpires: { type: Date },
  webauthnChallenge: { type: String }
});

module.exports = mongoose.model('User', userSchema);