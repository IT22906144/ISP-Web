const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  credentialId: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  counter: { type: Number, required: true, default: 0 }
});

module.exports = mongoose.model('Credential', credentialSchema);