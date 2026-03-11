'use strict';
/**
 * chaincodeService.js — Wraps all Fabric chaincode calls behind a clean service API
 * REST controllers call this service → it calls Fabric network via SDK
 */

const { submitTransaction, evaluateTransaction } = require('./fabricGateway');

// ── Determine which org to use as caller ────────────────────────────────────
function resolveOrgMSP(role) {
    if (['ADMIN', 'ISSUER_OFFICER', 'APPROVER'].includes(role)) return 'GovernmentMSP';
    if (role === 'UNIVERSITY') return 'UniversityMSP';
    if (role === 'VERIFIER')   return 'VerifierMSP';
    return 'GovernmentMSP'; // default to govt for admin ops
}

// ════════════════════════════════════════════════════════════════════════════
// CERTIFICATE LIFECYCLE
// ════════════════════════════════════════════════════════════════════════════

async function createCertificateDraft(callerRole, certData) {
    const org = resolveOrgMSP(callerRole);
    const { certId, recipientId, certType, ipfsDocURI, metadata } = certData;
    return submitTransaction(org, 'certificateLifecycle', 'createDraft',
        certId, recipientId, certType, ipfsDocURI, JSON.stringify(metadata || {}));
}

async function submitForReview(callerRole, certId, remarks) {
    const org = resolveOrgMSP(callerRole);
    return submitTransaction(org, 'certificateLifecycle', 'submitForReview', certId, remarks || '');
}

async function approveCertificate(callerRole, certId, remarks) {
    const org = resolveOrgMSP(callerRole);
    return submitTransaction(org, 'certificateLifecycle', 'approveCertificate', certId, remarks || '');
}

async function signCertificate(callerRole, certId, signatureHash, remarks) {
    const org = resolveOrgMSP(callerRole);
    return submitTransaction(org, 'certificateLifecycle', 'signCertificate',
        certId, signatureHash, remarks || '');
}

async function issueCertificate(callerRole, certId, remarks) {
    const org = resolveOrgMSP(callerRole);
    return submitTransaction(org, 'certificateLifecycle', 'issueCertificate', certId, remarks || '');
}

async function revokeCertificateLC(callerRole, certId, reason) {
    const org = resolveOrgMSP(callerRole);
    return submitTransaction(org, 'certificateLifecycle', 'revokeCertificate', certId, reason);
}

async function getCertificate(certId) {
    return evaluateTransaction('GovernmentMSP', 'certificateLifecycle', 'getCertificate', certId);
}

async function getCertificateHistory(certId) {
    return evaluateTransaction('GovernmentMSP', 'certificateLifecycle', 'getCertificateHistory', certId);
}

async function getCertificatesByRecipient(recipientId) {
    return evaluateTransaction('GovernmentMSP', 'certificateLifecycle', 'getCertificatesByRecipient', recipientId);
}

async function getPendingApprovals() {
    return evaluateTransaction('GovernmentMSP', 'certificateLifecycle', 'getPendingApprovals');
}

async function getDashboardStats(callerRole) {
    const org = resolveOrgMSP(callerRole);
    return evaluateTransaction(org, 'certificateLifecycle', 'getDashboardStats');
}

// ════════════════════════════════════════════════════════════════════════════
// CREDENTIAL REGISTRY
// ════════════════════════════════════════════════════════════════════════════

async function issueCredential(callerRole, credData, zkCommitment) {
    const org = resolveOrgMSP(callerRole);
    const { credentialId, subjectId, credentialType, ipfsMetadataURI, expiryDate } = credData;
    return submitTransaction(org, 'credentialRegistry', 'issueCredential',
        credentialId, subjectId, credentialType, ipfsMetadataURI,
        expiryDate || '', zkCommitment || '');
}

async function verifyCredential(credentialId) {
    return evaluateTransaction('GovernmentMSP', 'credentialRegistry', 'verifyCredential', credentialId);
}

async function verifyCredentialWithZK(credentialId, zkProof) {
    return evaluateTransaction('GovernmentMSP', 'credentialRegistry', 'verifyCredentialWithZK',
        credentialId, JSON.stringify(zkProof));
}

async function getCredentialsBySubject(subjectId) {
    return evaluateTransaction('GovernmentMSP', 'credentialRegistry', 'getCredentialsBySubject', subjectId);
}

async function suspendCredential(callerRole, credentialId, reason) {
    return submitTransaction(resolveOrgMSP(callerRole), 'credentialRegistry', 'suspendCredential', credentialId, reason);
}

async function reactivateCredential(callerRole, credentialId) {
    return submitTransaction(resolveOrgMSP(callerRole), 'credentialRegistry', 'reactivateCredential', credentialId);
}

// ════════════════════════════════════════════════════════════════════════════
// REVOCATION REGISTRY
// ════════════════════════════════════════════════════════════════════════════

async function revokeCredential(callerRole, credentialId, reason, evidenceHash) {
    const org = resolveOrgMSP(callerRole);
    return submitTransaction(org, 'revocationRegistry', 'revokeCredential',
        credentialId, reason, evidenceHash || '');
}

async function isRevoked(credentialId) {
    return evaluateTransaction('GovernmentMSP', 'revocationRegistry', 'isRevoked', credentialId);
}

async function getRevocationDetails(credentialId) {
    return evaluateTransaction('GovernmentMSP', 'revocationRegistry', 'getRevocationDetails', credentialId);
}

async function appealRevocation(credentialId, appealReason, evidenceHash) {
    // Citizens appeal — use GovernmentMSP for now (in production: citizen's own org)
    return submitTransaction('GovernmentMSP', 'revocationRegistry', 'appealRevocation',
        credentialId, appealReason, evidenceHash || '');
}

async function processAppeal(callerRole, credentialId, decision, remarks) {
    return submitTransaction(resolveOrgMSP(callerRole), 'revocationRegistry', 'processAppeal',
        credentialId, decision, remarks || '');
}

// ════════════════════════════════════════════════════════════════════════════
// IDENTITY MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

async function registerIdentity(callerRole, identityId, orgMSP, role, metadata) {
    const org = resolveOrgMSP(callerRole);
    return submitTransaction(org, 'identityManagement', 'registerIdentity',
        identityId, orgMSP, role, JSON.stringify(metadata || {}));
}

async function getIdentity(identityId) {
    return evaluateTransaction('GovernmentMSP', 'identityManagement', 'getIdentity', identityId);
}

async function getIdentitiesByOrg(orgMSP) {
    return evaluateTransaction('GovernmentMSP', 'identityManagement', 'getIdentitiesByOrg', orgMSP);
}

module.exports = {
    // Certificate Lifecycle
    createCertificateDraft,
    submitForReview,
    approveCertificate,
    signCertificate,
    issueCertificate,
    revokeCertificateLC,
    getCertificate,
    getCertificateHistory,
    getCertificatesByRecipient,
    getPendingApprovals,
    getDashboardStats,
    // Credential Registry
    issueCredential,
    verifyCredential,
    verifyCredentialWithZK,
    getCredentialsBySubject,
    suspendCredential,
    reactivateCredential,
    // Revocation Registry
    revokeCredential,
    isRevoked,
    getRevocationDetails,
    appealRevocation,
    processAppeal,
    // Identity Management
    registerIdentity,
    getIdentity,
    getIdentitiesByOrg,
};
