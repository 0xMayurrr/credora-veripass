'use strict';
/**
 * aiService.js — AI Fraud Detection for Credora
 * Rule-based fraud scoring system (Phase 1 implementation)
 * Future: integrate Python ML microservice via HTTP
 */

// ── Verified institution database (subset — expand for production) ────────────
const VERIFIED_INSTITUTIONS = new Set([
    'iit madras', 'iit bombay', 'iit delhi', 'iit kanpur', 'iit kharagpur',
    'nit trichy', 'nit surathkal', 'nit warangal',
    'rathinam college', 'anna university', 'vit university',
    'bits pilani', 'amrita university', 'sastra university',
    'university of madras', 'bharathiyar university', 'bharathidasan university',
    'osmania university', 'jadavpur university', 'calcutta university',
    'du delhi university', 'bhu banaras hindu university',
]);

// Certificate types that each org type is authorized to issue
const AUTHORIZED_CERT_TYPES = {
    GovernmentMSP:  ['BONAFIDE', 'MIGRATION', 'DOMICILE', 'INCOME'],
    UniversityMSP:  ['DEGREE', 'MARKSHEET', 'DIPLOMA', 'PROVISIONAL', 'BONAFIDE', 'MIGRATION'],
    VerifierMSP:    [],  // Read-only — not authorized to issue
};

// ── Main fraud analysis ───────────────────────────────────────────────────────

/**
 * Analyze a credential/certificate for fraud indicators
 * @returns {{ riskScore: number, flags: string[], recommendation: 'APPROVE'|'REVIEW'|'REJECT' }}
 */
async function analyzeCredential(credentialData) {
    const flags = [];
    let riskScore = 0;

    const {
        issuerOrg,
        certType,
        recipientId,
        organizationName,
        issuanceDate,
        expiryDate,
        metadata = {}
    } = credentialData;

    // ── Check 1: Is cert type authorized for this org? ─────────────────────
    const authorized = AUTHORIZED_CERT_TYPES[issuerOrg] || [];
    if (certType && !authorized.includes(certType)) {
        flags.push(`UNAUTHORIZED_CERT_TYPE: ${certType} not allowed for ${issuerOrg}`);
        riskScore += 40;
    }

    // ── Check 2: Institution name verification ─────────────────────────────
    if (organizationName) {
        const normalized = organizationName.toLowerCase().trim();
        if (!VERIFIED_INSTITUTIONS.has(normalized)) {
            flags.push(`UNVERIFIED_INSTITUTION: "${organizationName}" not in accredited list`);
            riskScore += 20;
        }
    }

    // ── Check 3: Date anomaly — future issuance date ───────────────────────
    if (issuanceDate && new Date(issuanceDate) > new Date()) {
        flags.push('FUTURE_ISSUANCE_DATE: certificate dated in the future');
        riskScore += 30;
    }

    // ── Check 4: Expiry date before issuance date ──────────────────────────
    if (issuanceDate && expiryDate) {
        if (new Date(expiryDate) <= new Date(issuanceDate)) {
            flags.push('INVALID_DATE_RANGE: expiryDate is before or equal to issuanceDate');
            riskScore += 25;
        }
    }

    // ── Check 5: Metadata completeness ────────────────────────────────────
    const requiredFields = ['graduationYear', 'programName'];
    const missingFields = requiredFields.filter(f => !metadata[f]);
    if (missingFields.length > 0) {
        flags.push(`INCOMPLETE_METADATA: missing fields: ${missingFields.join(', ')}`);
        riskScore += 10 * missingFields.length;
    }

    // ── Check 6: Duplicate submission check (simple hash check) ───────────
    const fingerprintKey = `${recipientId}_${certType}_${organizationName}_${metadata.graduationYear || ''}`;
    const isDuplicate = await checkDuplicateFingerprint(fingerprintKey);
    if (isDuplicate) {
        flags.push(`DUPLICATE_SUBMISSION: similar certificate already issued for this recipient`);
        riskScore += 50;
    }

    // ── Cap score at 100 ─────────────────────────────────────────────────
    riskScore = Math.min(riskScore, 100);

    // ── Recommendation ──────────────────────────────────────────────────
    let recommendation;
    if (riskScore >= 60)      recommendation = 'REJECT';
    else if (riskScore >= 25) recommendation = 'REVIEW';
    else                      recommendation = 'APPROVE';

    return {
        riskScore,
        flags,
        recommendation,
        analyzedAt: new Date().toISOString(),
        fingerprintKey
    };
}

// ── Batch analysis (detect systemic fraud patterns) ──────────────────────────
async function detectSystemicFraud(orgId, timeWindowDays = 30) {
    // In production: query MongoDB for recent certificates from this org
    // and analyze for patterns: surge, similar hashes, unusual types
    const report = {
        orgId,
        timeWindowDays,
        analyzedAt: new Date().toISOString(),
        findings: [],
        overallRisk: 'LOW'
    };

    // Placeholder: return clean report (extend with MongoDB aggregation later)
    return report;
}

// ── Fraud report generation ──────────────────────────────────────────────────
async function generateFraudReport(startDate, endDate) {
    return {
        reportPeriod: { from: startDate, to: endDate },
        generatedAt: new Date().toISOString(),
        summary: {
            totalCredentialsAnalyzed: 0,
            highRiskCount: 0,
            mediumRiskCount: 0,
            lowRiskCount: 0,
            flagTypes: {}
        },
        recommendations: [
            'Enable real-time ML scoring by integrating Python fraud service',
            'Expand verified institution list via UGC API',
        ]
    };
}

// ── Internal: duplicate fingerprint check ────────────────────────────────────
const _fingerprintCache = new Set(); // In-memory; replace with Redis in production

async function checkDuplicateFingerprint(fingerprintKey) {
    if (_fingerprintCache.has(fingerprintKey)) return true;
    _fingerprintCache.add(fingerprintKey);
    return false;
}

module.exports = {
    analyzeCredential,
    detectSystemicFraud,
    generateFraudReport
};
