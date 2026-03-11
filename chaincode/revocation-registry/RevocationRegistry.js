'use strict';
const { Contract } = require('fabric-contract-api');

class RevocationRegistry extends Contract {

    async initLedger(ctx) {
        console.log('RevocationRegistry chaincode initialized');
    }

    // Revoke a credential with reason and optional evidence
    async revokeCredential(ctx, credentialId, reason, evidenceIPFSHash) {
        if (!credentialId || !reason) throw new Error('credentialId and reason are required');

        await this._requireRole(ctx, ['ADMIN', 'ISSUER_OFFICER']);

        // Check it's not already revoked
        const revokeKey = `revoke_${credentialId}`;
        const existing = await ctx.stub.getState(revokeKey);
        if (existing && existing.length > 0) {
            throw new Error(`Credential ${credentialId} is already revoked`);
        }

        const now          = new Date().toISOString();
        const callerID     = ctx.clientIdentity.getID();
        const callerOrg    = ctx.clientIdentity.getMSPID();

        const revocationRecord = {
            docType:          'revocation',
            credentialId,
            reason,
            evidenceIPFSHash: evidenceIPFSHash || '',
            revokedBy:        callerID,
            revokedByOrg:     callerOrg,
            revokedAt:        now,
            txId:             ctx.stub.getTxID(),
            status:           'REVOKED',  // can change to OVERTURNED via appeal
            appeals:          []
        };

        await ctx.stub.putState(revokeKey, Buffer.from(JSON.stringify(revocationRecord)));

        // Composite index for org-based queries
        const orgKey = ctx.stub.createCompositeKey('revoke~org', [callerOrg, credentialId]);
        await ctx.stub.putState(orgKey, Buffer.from('\u0000'));

        ctx.stub.setEvent('CredentialRevoked', Buffer.from(JSON.stringify({
            credentialId, reason, revokedBy: callerID, revokedByOrg: callerOrg,
            txId: ctx.stub.getTxID(), timestamp: now
        })));

        return JSON.stringify(revocationRecord);
    }

    // Fast read: is this credential revoked?
    async isRevoked(ctx, credentialId) {
        const revokeKey = `revoke_${credentialId}`;
        const raw = await ctx.stub.getState(revokeKey);

        if (!raw || raw.length === 0) {
            return JSON.stringify({ credentialId, isRevoked: false });
        }

        const record = JSON.parse(raw.toString());
        return JSON.stringify({
            credentialId,
            isRevoked: record.status === 'REVOKED',
            status:    record.status,
            reason:    record.reason,
            revokedAt: record.revokedAt
        });
    }

    // Get full revocation record with all details
    async getRevocationDetails(ctx, credentialId) {
        const revokeKey = `revoke_${credentialId}`;
        const raw = await ctx.stub.getState(revokeKey);
        if (!raw || raw.length === 0) {
            throw new Error(`No revocation record found for credential ${credentialId}`);
        }
        return raw.toString();
    }

    // Get all revocations by issuing org (CouchDB query)
    async getRevocationsByOrg(ctx, orgMSP) {
        const query = {
            selector: {
                docType: 'revocation',
                revokedByOrg: orgMSP
            },
            sort: [{ revokedAt: 'desc' }]
        };
        return await this._runQuery(ctx, JSON.stringify(query));
    }

    // Citizen files an appeal against revocation
    async appealRevocation(ctx, credentialId, appealReason, evidenceIPFSHash) {
        if (!appealReason) throw new Error('appealReason is required');

        const revokeKey = `revoke_${credentialId}`;
        const raw = await ctx.stub.getState(revokeKey);
        if (!raw || raw.length === 0) {
            throw new Error(`No revocation record for ${credentialId}`);
        }

        const record = JSON.parse(raw.toString());
        if (record.status === 'OVERTURNED') throw new Error('Revocation already overturned');

        const appeal = {
            appealedBy:        ctx.clientIdentity.getID(),
            appealedByOrg:     ctx.clientIdentity.getMSPID(),
            appealReason,
            evidenceIPFSHash:  evidenceIPFSHash || '',
            filedAt:           new Date().toISOString(),
            txId:              ctx.stub.getTxID(),
            decision:          'PENDING'
        };

        record.appeals.push(appeal);
        record.hasOpenAppeal = true;

        await ctx.stub.putState(revokeKey, Buffer.from(JSON.stringify(record)));

        ctx.stub.setEvent('RevocationAppealed', Buffer.from(JSON.stringify({
            credentialId, appealedBy: appeal.appealedBy, timestamp: appeal.filedAt
        })));

        return JSON.stringify(record);
    }

    // ADMIN processes a citizen's appeal
    async processAppeal(ctx, credentialId, decision, remarks) {
        if (!['UPHELD', 'OVERTURNED'].includes(decision)) {
            throw new Error("decision must be 'UPHELD' or 'OVERTURNED'");
        }

        await this._requireRole(ctx, ['ADMIN']);

        const revokeKey = `revoke_${credentialId}`;
        const raw = await ctx.stub.getState(revokeKey);
        if (!raw || raw.length === 0) throw new Error(`No revocation record for ${credentialId}`);

        const record = JSON.parse(raw.toString());

        // Mark the latest open appeal as decided
        const openAppeal = record.appeals.find(a => a.decision === 'PENDING');
        if (!openAppeal) throw new Error('No open appeal to process');

        openAppeal.decision     = decision;
        openAppeal.decidedBy    = ctx.clientIdentity.getID();
        openAppeal.decidedAt    = new Date().toISOString();
        openAppeal.remarks      = remarks || '';

        record.hasOpenAppeal = false;

        if (decision === 'OVERTURNED') {
            // Credential is reinstated — remove revocation flag
            record.status = 'OVERTURNED';
            record.overturnedAt = new Date().toISOString();
            record.overturnedBy = ctx.clientIdentity.getID();
        }

        await ctx.stub.putState(revokeKey, Buffer.from(JSON.stringify(record)));

        ctx.stub.setEvent('RevocationAppealProcessed', Buffer.from(JSON.stringify({
            credentialId, decision, decidedBy: openAppeal.decidedBy, timestamp: openAppeal.decidedAt
        })));

        return JSON.stringify(record);
    }

    // Get all pending appeals across all credentials
    async getPendingAppeals(ctx) {
        await this._requireRole(ctx, ['ADMIN']);
        const query = {
            selector: {
                docType: 'revocation',
                hasOpenAppeal: true,
                status: 'REVOKED'
            }
        };
        return await this._runQuery(ctx, JSON.stringify(query));
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    async _requireRole(ctx, allowedRoles) {
        const callerMSP = ctx.clientIdentity.getMSPID();
        let callerRole = 'CITIZEN';
        try {
            const roleAttr = ctx.clientIdentity.getAttributeValue('role');
            if (roleAttr) callerRole = roleAttr;
        } catch (e) {
            if (callerMSP === 'GovernmentMSP') callerRole = 'ADMIN';
            else if (callerMSP === 'UniversityMSP') callerRole = 'ISSUER_OFFICER';
        }
        if (!allowedRoles.includes(callerRole) && callerRole !== 'ADMIN') {
            throw new Error(`Access denied: role '${callerRole}' not in [${allowedRoles.join(', ')}]`);
        }
    }

    async _runQuery(ctx, queryString) {
        const iterator = await ctx.stub.getQueryResult(queryString);
        const results = [];
        let result = await iterator.next();
        while (!result.done) {
            results.push(JSON.parse(result.value.value.toString('utf8')));
            result = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(results);
    }
}

module.exports = RevocationRegistry;
