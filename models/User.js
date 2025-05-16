const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  nic: { type: String, required: true, unique: true },
  empId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dob: { type: Date, required: true },
  gender: { type: String, required: true, enum: ['male', 'female', 'other'] },
  password: { type: String, required: true },
  userType: { type: String, required: true, enum: ['user', 'admin'] },
  fingerprintData: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);