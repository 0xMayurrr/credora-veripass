'use strict';
const { Contract } = require('fabric-contract-api');

// ── Certificate State Machine ────────────────────────────────────────────────
const CertState = {
    DRAFT:        'DRAFT',
    UNDER_REVIEW: 'UNDER_REVIEW',
    APPROVED:     'APPROVED',
    SIGNED:       'SIGNED',
    ISSUED:       'ISSUED',
    REVOKED:      'REVOKED'
};

const VALID_TRANSITIONS = {
    DRAFT:        ['UNDER_REVIEW'],
    UNDER_REVIEW: ['APPROVED', 'DRAFT'],       // Approver can send back for revision
    APPROVED:     ['SIGNED', 'UNDER_REVIEW'],  // Admin can request re-review
    SIGNED:       ['ISSUED'],
    ISSUED:       ['REVOKED'],
    REVOKED:      []                            // Terminal state
};

// Role required to perform each transition
const TRANSITION_ROLES = {
    'DRAFT->UNDER_REVIEW':     ['ISSUER_OFFICER', 'ADMIN'],
    'UNDER_REVIEW->APPROVED':  ['APPROVER', 'ADMIN'],
    'UNDER_REVIEW->DRAFT':     ['APPROVER', 'ADMIN'],
    'APPROVED->SIGNED':        ['ADMIN'],
    'APPROVED->UNDER_REVIEW':  ['ADMIN'],
    'SIGNED->ISSUED':          ['ADMIN'],
    'ISSUED->REVOKED':         ['ADMIN']
};

class CertificateLifecycle extends Contract {

    async initLedger(ctx) {
        console.log('CertificateLifecycle chaincode initialized');
    }

    // ISSUER_OFFICER creates a new certificate draft
    async createDraft(ctx, certId, recipientId, certType, ipfsDocURI, metadataJSON) {
        // Input validation
        if (!certId || !recipientId || !certType || !ipfsDocURI) {
            throw new Error('certId, recipientId, certType, and ipfsDocURI are required');
        }

        const validCertTypes = ['DEGREE', 'MARKSHEET', 'BONAFIDE', 'MIGRATION', 'DIPLOMA', 'PROVISIONAL'];
        if (!validCertTypes.includes(certType)) {
            throw new Error(`Invalid certType. Must be one of: ${validCertTypes.join(', ')}`);
        }

        // Verify caller role
        await this._requireRole(ctx, ['ISSUER_OFFICER', 'APPROVER', 'ADMIN']);

        // Check for duplicate certId
        const existing = await ctx.stub.getState(certId);
        if (existing && existing.length > 0) {
            throw new Error(`Certificate ${certId} already exists`);
        }

        let metadata = {};
        try {
            metadata = JSON.parse(metadataJSON || '{}');
        } catch (e) {
            throw new Error('metadataJSON must be valid JSON');
        }

        const now = new Date().toISOString();
        const callerID = ctx.clientIdentity.getID();
        const callerOrg = ctx.clientIdentity.getMSPID();

        const certificate = {
            docType:       'certificate',
            certId,
            recipientId,
            certType,
            ipfsDocURI,
            state:          CertState.DRAFT,
            createdBy:      callerID,
            createdByOrg:   callerOrg,
            createdAt:      now,
            updatedAt:      now,
            history: [{
                state:       CertState.DRAFT,
                changedBy:   callerID,
                changedByOrg: callerOrg,
                txId:        ctx.stub.getTxID(),
                timestamp:   now,
                remarks:     'Certificate draft created'
            }],
            approvals:   [],
            signatures:  [],
            isRevoked:   false,
            revocationReason: '',
            metadata
        };

        await ctx.stub.putState(certId, Buffer.from(JSON.stringify(certificate)));

        // Composite keys for rich queries
        const recipientKey = ctx.stub.createCompositeKey('cert~recipient', [recipientId, certId]);
        await ctx.stub.putState(recipientKey, Buffer.from('\u0000'));
        const stateKey = ctx.stub.createCompositeKey('cert~state', [CertState.DRAFT, certId]);
        await ctx.stub.putState(stateKey, Buffer.from('\u0000'));

        ctx.stub.setEvent('CertificateDraftCreated', Buffer.from(JSON.stringify({
            certId, recipientId, certType, createdBy: callerID, createdByOrg: callerOrg, txId: ctx.stub.getTxID(), timestamp: now
        })));

        return JSON.stringify(certificate);
    }

    // ISSUER_OFFICER submits draft for review
    async submitForReview(ctx, certId, remarks) {
        return await this._transitionState(ctx, certId, CertState.UNDER_REVIEW, remarks || 'Submitted for review');
    }

    // APPROVER approves the certificate
    async approveCertificate(ctx, certId, remarks) {
        const cert = await this._getCertOrThrow(ctx, certId);
        await this._requireRole(ctx, TRANSITION_ROLES[`${cert.state}->${CertState.APPROVED}`]);
        return await this._transitionState(ctx, certId, CertState.APPROVED, remarks || 'Certificate approved');
    }

    // APPROVER sends back for revision
    async sendBackForRevision(ctx, certId, remarks) {
        return await this._transitionState(ctx, certId, CertState.DRAFT, remarks || 'Returned for revision');
    }

    // ADMIN signs the certificate (digital signature hash)
    async signCertificate(ctx, certId, digitalSignatureHash, remarks) {
        if (!digitalSignatureHash) throw new Error('digitalSignatureHash is required');

        const cert = await this._transitionState(ctx, certId, CertState.SIGNED, remarks || 'Certificate digitally signed');
        const updatedCert = JSON.parse(cert);

        updatedCert.signatures.push({
            signedBy:    ctx.clientIdentity.getID(),
            signedByOrg: ctx.clientIdentity.getMSPID(),
            signatureHash: digitalSignatureHash,
            timestamp:   new Date().toISOString(),
            txId:        ctx.stub.getTxID()
        });
        updatedCert.updatedAt = new Date().toISOString();

        await ctx.stub.putState(certId, Buffer.from(JSON.stringify(updatedCert)));
        return JSON.stringify(updatedCert);
    }

    // ADMIN issues the certificate (recipient can now access)
    async issueCertificate(ctx, certId, remarks) {
        return await this._transitionState(ctx, certId, CertState.ISSUED, remarks || 'Certificate issued to recipient');
    }

    // ADMIN revokes the certificate with reason
    async revokeCertificate(ctx, certId, reason) {
        if (!reason) throw new Error('Revocation reason is required');
        const cert = await this._transitionState(ctx, certId, CertState.REVOKED, reason);
        const updatedCert = JSON.parse(cert);

        updatedCert.isRevoked = true;
        updatedCert.revocationReason = reason;
        updatedCert.revokedBy = ctx.clientIdentity.getID();
        updatedCert.revokedAt = new Date().toISOString();

        await ctx.stub.putState(certId, Buffer.from(JSON.stringify(updatedCert)));

        ctx.stub.setEvent('CertificateRevoked', Buffer.from(JSON.stringify({
            certId, reason, revokedBy: updatedCert.revokedBy, timestamp: updatedCert.revokedAt
        })));

        return JSON.stringify(updatedCert);
    }

    // Anyone can read a certificate
    async getCertificate(ctx, certId) {
        const cert = await this._getCertOrThrow(ctx, certId);
        return JSON.stringify(cert);
    }

    // Get the full blockchain history of a certificate
    async getCertificateHistory(ctx, certId) {
        const iterator = await ctx.stub.getHistoryForKey(certId);
        const history = [];

        let result = await iterator.next();
        while (!result.done) {
            const modification = {
                txId:      result.value.txId,
                timestamp: new Date(result.value.timestamp.seconds.low * 1000).toISOString(),
                isDelete:  result.value.isDelete,
                value:     result.value.value ? JSON.parse(result.value.value.toString('utf8')) : null
            };
            history.push(modification);
            result = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(history);
    }

    // Get all certificates for a recipient (CouchDB rich query)
    async getCertificatesByRecipient(ctx, recipientId) {
        const query = {
            selector: { docType: 'certificate', recipientId: recipientId },
            sort: [{ createdAt: 'desc' }]
        };
        return await this._runQuery(ctx, JSON.stringify(query));
    }

    // Get all certificates pending approvals (for APPROVER dashboard)
    async getPendingApprovals(ctx) {
        const query = {
            selector: {
                docType: 'certificate',
                state: CertState.UNDER_REVIEW
            },
            sort: [{ updatedAt: 'asc' }]
        };
        return await this._runQuery(ctx, JSON.stringify(query));
    }

    // Get all certificates by state
    async getCertificatesByState(ctx, state) {
        if (!Object.values(CertState).includes(state)) {
            throw new Error(`Invalid state: ${state}`);
        }
        const query = {
            selector: { docType: 'certificate', state: state },
            sort: [{ updatedAt: 'desc' }]
        };
        return await this._runQuery(ctx, JSON.stringify(query));
    }

    // Get dashboard stats for the caller's org
    async getDashboardStats(ctx) {
        const callerOrg = ctx.clientIdentity.getMSPID();
        const stats = {};

        for (const state of Object.values(CertState)) {
            const query = {
                selector: { docType: 'certificate', state: state, createdByOrg: callerOrg }
            };
            const results = JSON.parse(await this._runQuery(ctx, JSON.stringify(query)));
            stats[state] = results.length;
        }
        return JSON.stringify({ org: callerOrg, counts: stats });
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    async _transitionState(ctx, certId, newState, remarks) {
        const cert = await this._getCertOrThrow(ctx, certId);
        const currentState = cert.state;

        // Validate transition
        this._validateTransitionOrThrow(currentState, newState);

        // Verify caller role
        const requiredRoles = TRANSITION_ROLES[`${currentState}->${newState}`];
        await this._requireRole(ctx, requiredRoles);

        const now = new Date().toISOString();
        const callerID = ctx.clientIdentity.getID();
        const callerOrg = ctx.clientIdentity.getMSPID();

        // Remove composite key for old state, add for new state
        const oldStateKey = ctx.stub.createCompositeKey('cert~state', [currentState, certId]);
        await ctx.stub.deleteState(oldStateKey);
        const newStateKey = ctx.stub.createCompositeKey('cert~state', [newState, certId]);
        await ctx.stub.putState(newStateKey, Buffer.from('\u0000'));

        cert.state = newState;
        cert.updatedAt = now;
        cert.history.push({
            state:       newState,
            changedBy:   callerID,
            changedByOrg: callerOrg,
            txId:        ctx.stub.getTxID(),
            timestamp:   now,
            remarks
        });

        // Attach approval record for APPROVED state
        if (newState === CertState.APPROVED) {
            cert.approvals.push({
                approvedBy:  callerID,
                approvedOrg: callerOrg,
                timestamp:   now,
                txId:        ctx.stub.getTxID()
            });
        }

        await ctx.stub.putState(certId, Buffer.from(JSON.stringify(cert)));

        ctx.stub.setEvent('CertificateStateChanged', Buffer.from(JSON.stringify({
            certId, from: currentState, to: newState, changedBy: callerID, changedByOrg: callerOrg,
            txId: ctx.stub.getTxID(), timestamp: now
        })));

        return JSON.stringify(cert);
    }

    _validateTransitionOrThrow(currentState, newState) {
        const allowed = VALID_TRANSITIONS[currentState];
        if (!allowed) throw new Error(`Unknown state: ${currentState}`);
        if (!allowed.includes(newState)) {
            throw new Error(`Invalid transition: ${currentState} → ${newState}. Allowed: ${allowed.join(', ')}`);
        }
    }

    async _requireRole(ctx, allowedRoles) {
        const callerID = ctx.clientIdentity.getID();
        const callerMSP = ctx.clientIdentity.getMSPID();

        // Look up caller's registered role from identity ledger
        // (The identity chaincode stores role; we read it cross-chaincode via stub or trust MSP)
        // For simplicity and gas-efficiency: trust MSP-based attribute
        let callerRole = 'CITIZEN';
        try {
            const roleAttr = ctx.clientIdentity.getAttributeValue('role');
            if (roleAttr) callerRole = roleAttr;
        } catch (e) {
            // Fall back to MSP-based role assignment
            if (callerMSP === 'GovernmentMSP') callerRole = 'ADMIN';
            else if (callerMSP === 'UniversityMSP') callerRole = 'ISSUER_OFFICER';
            else if (callerMSP === 'VerifierMSP') callerRole = 'VERIFIER';
        }

        if (!allowedRoles.includes(callerRole) && callerRole !== 'ADMIN') {
            throw new Error(
                `Access denied: caller role '${callerRole}' from ${callerMSP} is not in [${allowedRoles.join(', ')}]`
            );
        }
    }

    async _getCertOrThrow(ctx, certId) {
        const raw = await ctx.stub.getState(certId);
        if (!raw || raw.length === 0) throw new Error(`Certificate ${certId} does not exist`);
        return JSON.parse(raw.toString());
    }

    async _runQuery(ctx, queryString) {
        const iterator = await ctx.stub.getQueryResult(queryString);
        const results = [];
        let result = await iterator.next();
        while (!result.done) {
            const record = JSON.parse(result.value.value.toString('utf8'));
            results.push(record);
            result = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(results);
    }
}

module.exports = CertificateLifecycle;
