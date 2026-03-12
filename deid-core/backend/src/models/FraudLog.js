const mongoose = require('mongoose');

const FraudLogSchema = new mongoose.Schema({
  // Credential info
  credentialId:    { type: String, index: true },
  credentialHash:  { type: String, index: true },
  issuerName:      { type: String, index: true },
  credentialType:  { type: String },
  recipientWallet: { type: String },

  // AI Analysis Results
  fraudScore:      { type: Number, required: true, min: 0, max: 100 },
  riskLevel:       { type: String, enum: ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  recommendation:  { type: String, enum: ['APPROVE', 'REVIEW', 'REJECT'] },
  action:          { type: String },

  // Triggered signals
  signals: [{
    signal:  String,
    score:   Number,
    detail:  String,
  }],

  // Was it overridden by a human?
  humanOverride:       { type: Boolean, default: false },
  humanOverrideReason: { type: String },
  overriddenBy:        { type: String },

  analyzedAt:   { type: Date, default: Date.now, index: true },
  modelVersion: { type: String, default: 'credora-fraud-v1.0' },
});

// Compound index for surge detection (issuer + time)
FraudLogSchema.index({ issuerName: 1, analyzedAt: -1 });

// TTL index — auto-delete logs older than 1 year (optional, remove if you want permanent logs)
// FraudLogSchema.index({ analyzedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('FraudLog', FraudLogSchema);
