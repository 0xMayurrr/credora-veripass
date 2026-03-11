'use strict';
/**
 * oracleService.js — Blockchain Oracle for External Government Data
 * Brings real-world data onto the ledger in a trusted, tamper-evident way
 */

const https = require('https');

// ── Curated UGC accredited universities dataset ───────────────────────────────
const UGC_ACCREDITED_UNIVERSITIES = {
    'IITM001': { name: 'IIT Madras',          grade: 'A++', validUntil: '2030-03-31', naacGrade: 'A++' },
    'IITB002': { name: 'IIT Bombay',          grade: 'A++', validUntil: '2030-03-31', naacGrade: 'A++' },
    'ANNU003': { name: 'Anna University',      grade: 'A+',  validUntil: '2027-06-30', naacGrade: 'A+' },
    'VITV004': { name: 'VIT University',       grade: 'A+',  validUntil: '2028-03-31', naacGrade: 'A' },
    'RTNM005': { name: 'Rathinam College',     grade: 'A',   validUntil: '2026-03-31', naacGrade: 'A' },
    'BITS006': { name: 'BITS Pilani',          grade: 'A++', validUntil: '2029-03-31', naacGrade: 'A++' },
    'AMRT007': { name: 'Amrita University',    grade: 'A++', validUntil: '2029-06-30', naacGrade: 'A++' },
    'SAST008': { name: 'SASTRA University',    grade: 'A',   validUntil: '2027-03-31', naacGrade: 'A' },
    'MADM009': { name: 'University of Madras', grade: 'A+',  validUntil: '2028-06-30', naacGrade: 'A' },
    'BDHU010': { name: 'Bharathidasan University', grade: 'A', validUntil: '2026-03-31', naacGrade: 'A' },
};

// ── Oracle 1: UGC University Accreditation ────────────────────────────────────
async function fetchUniversityAccreditation(universityId) {
    // Production: Call UGC API — https://www.ugc.gov.in/api/institutions
    // Demo: Use curated dataset
    const record = UGC_ACCREDITED_UNIVERSITIES[universityId];

    if (!record) {
        return {
            universityId,
            isAccredited: false,
            name: 'Unknown Institution',
            accreditationGrade: null,
            validUntil: null,
            source: 'UGC_OFFLINE_DATASET',
            fetchedAt: new Date().toISOString(),
            note: 'Institution not found in UGC dataset. Manual verification required.'
        };
    }

    const isValid = new Date(record.validUntil) > new Date();
    return {
        universityId,
        isAccredited: isValid,
        name: record.name,
        accreditationGrade: record.grade,
        naacGrade: record.naacGrade,
        validUntil: record.validUntil,
        source: 'UGC_OFFLINE_DATASET',
        fetchedAt: new Date().toISOString()
    };
}

// ── Oracle 2: DigiLocker Document Cross-Verification ─────────────────────────
async function verifyWithDigiLocker(documentHash, citizenId) {
    // Production: OAuth flow with DigiLocker API (https://digilocker.gov.in/public/oauth2/1/)
    // Demo: Simulated response for development
    console.log(`[Oracle] DigiLocker verification request: citizen=${citizenId}, hash=${documentHash}`);

    return {
        isVerified: true,   // Simulated: would call real DigiLocker API in production
        documentType: 'DEGREE_CERTIFICATE',
        issuedBy: 'Anna University',
        issuedDate: '2023-05-15',
        source: 'DIGILOCKER_SIMULATED',
        verifiedAt: new Date().toISOString(),
        note: 'Production: integrate with DigiLocker OAuth2 API'
    };
}

// ── Oracle 3: Aadhaar eKYC Identity Verification ─────────────────────────────
async function verifyAadhaarKYC(maskedAadhaar, name, dob) {
    // Production: UIDAI eKYC API (https://uidai.gov.in/ekycservice.html)
    // CRITICAL: No raw Aadhaar data is stored — only pass/fail stored on ledger
    console.log(`[Oracle] Aadhaar KYC verification request for masked ID: ${maskedAadhaar}`);

    // For demo: return successful verification
    // In production: call UIDAI API → returns verified/not-verified boolean only
    return {
        isVerified: true,              // ONLY boolean stored — NO Aadhaar number on ledger!
        kycLevel: 'FULL',              // Full KYC vs OTP-based KYC
        verificationTimestamp: new Date().toISOString(),
        source: 'UIDAI_SIMULATED',
        note: 'Production: integrate with UIDAI eKYC. No PII stored on-chain, only verification result.'
    };
}

// ── Write oracle result to chain ──────────────────────────────────────────────
async function writeOracleDataToChain(oracleType, data, chaincodeService) {
    // In production: call a dedicated oracle chaincode transaction
    // This makes the external verification tamper-evident on the ledger
    console.log(`[Oracle] Writing ${oracleType} result to chain:`, JSON.stringify(data));

    // For now: log it — the pattern is: external data → trusted oracle service → ledger
    const oracleRecord = {
        oracleType,
        data,
        recordedAt: new Date().toISOString(),
        source: data.source || 'CREDORA_ORACLE'
    };

    // TODO: call identity/oracle chaincode to store oracle result on ledger
    // await chaincodeService.submitOracleResult('ADMIN', oracleRecord);

    return oracleRecord;
}

module.exports = {
    fetchUniversityAccreditation,
    verifyWithDigiLocker,
    verifyAadhaarKYC,
    writeOracleDataToChain
};
