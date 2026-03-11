const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        sparse: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
        sparse: true
    },
    name: {
        type: String,
        trim: true
    },
    did: {
        type: String,
        unique: true,
        sparse: true
    },
    role: {
        type: String,
        // All valid roles — old 'user'/'issuer' kept for backward compat
        enum: ['user', 'issuer', 'CITIZEN', 'ISSUER_OFFICER', 'APPROVER', 'ADMIN'],
        default: 'CITIZEN'
    },

    // ── Role-specific extra fields ────────────────────────────────────────────
    organizationName: { type: String, trim: true },   // Gov/University/Issuer
    employeeId:       { type: String, trim: true },   // Gov officer employee ID
    department:       { type: String, trim: true },   // Government department
    licenseNumber:    { type: String, trim: true },   // University registrar license
    registrarId:      { type: String, trim: true },   // University registrar ID
    companyId:        { type: String, trim: true },   // Employer/Verifier company ID
    verifierType:     { type: String, trim: true },   // 'bank' | 'employer' | 'other'
    website:          { type: String, trim: true },
    description:      { type: String },
    avatar:           { type: String },

    nonce: {
        type: String,
        default: () => `DeID Auth Nonce: ${crypto.randomBytes(16).toString('hex')}`
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
