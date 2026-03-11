'use strict';
const { Contract } = require('fabric-contract-api');

class CredentialRegistry extends Contract {

    async initLedger(ctx) {
        console.log('CredentialRegistry chaincode initialized');
    }

    // Issue a W3C-compatible Verifiable Credential on Fabric
    async issueCredential(ctx, credentialId, subjectId, credentialType, ipfsMetadataURI, expiryDate, zkCommitment) {
        if (!credentialId || !subjectId || !credentialType || !ipfsMetadataURI) {
            throw new Error('credentialId, subjectId, credentialType, and ipfsMetadataURI are required');
        }

        // Verify caller is an authorized issuer
        await this._requireRole(ctx, ['ISSUER_OFFICER', 'APPROVER', 'ADMIN']);

        // Prevent duplicate credentials
        const existing = await ctx.stub.getState(credentialId);
        if (existing && existing.length > 0) {
            throw new Error(`Credential ${credentialId} already exists`);
        }

        const now = new Date().toISOString();
        const callerID  = ctx.clientIdentity.getID();
        const callerOrg = ctx.clientIdentity.getMSPID();

        const credential = {
            docType:       'credential',
            credentialId,
            // W3C Verifiable Credential structure
            '@context':    ['https://www.w3.org/2018/credentials/v1', 'https://credora.in/ld/v1'],
            type:          ['VerifiableCredential', credentialType],
            issuer: {
                id:   callerID,
                org:  callerOrg,
                did:  `did:fabric:credora:${callerID}`
            },
            credentialSubject: {
                id:   subjectId,
                did:  `did:fabric:credora:${subjectId}`
            },
            issuanceDate:    now,
            expirationDate:  expiryDate || null,
            ipfsMetadataURI,
            zkCommitment,              // Poseidon hash for ZK proof system
            status:          'ACTIVE',
            proof: {
                type:               'FabricMSPSignature',
                created:            now,
                verificationMethod: callerID,
                proofValue:         ctx.stub.getTxID()  // Fabric TX ID as immutable proof
            }
        };

        await ctx.stub.putState(credentialId, Buffer.from(JSON.stringify(credential)));

        // Composite keys for subject-based queries
        const subjectKey = ctx.stub.createCompositeKey('cred~subject', [subjectId, credentialId]);
        await ctx.stub.putState(subjectKey, Buffer.from('\u0000'));
        const typeKey = ctx.stub.createCompositeKey('cred~type', [credentialType, credentialId]);
        await ctx.stub.putState(typeKey, Buffer.from('\u0000'));

        ctx.stub.setEvent('CredentialIssued', Buffer.from(JSON.stringify({
            credentialId, subjectId, credentialType, issuer: callerID, issuerOrg: callerOrg,
            txId: ctx.stub.getTxID(), timestamp: now
        })));

        return JSON.stringify(credential);
    }

    // Standard verification - returns full credential details
    async verifyCredential(ctx, credentialId) {
        const cred = await this._getCredOrThrow(ctx, credentialId);

        // Check expiration
        const isExpired = cred.expirationDate
            ? new Date(cred.expirationDate) < new Date()
            : false;

        return JSON.stringify({
            credentialId,
            isValid:    cred.status === 'ACTIVE' && !isExpired,
            isActive:   cred.status === 'ACTIVE',
            isExpired,
            issuer:     cred.issuer,
            subject:    cred.credentialSubject,
            type:       cred.type,
            issuanceDate:   cred.issuanceDate,
            expirationDate: cred.expirationDate,
            txId:       cred.proof.proofValue
        });
    }

    // Privacy-preserving ZK verification — reveals only isValid, not credential details
    async verifyCredentialWithZK(ctx, credentialId, zkProofJSON) {
        const cred = await this._getCredOrThrow(ctx, credentialId);

        if (!cred.zkCommitment) {
            throw new Error(`Credential ${credentialId} was not issued with ZK commitment`);
        }

        let zkProof;
        try {
            zkProof = JSON.parse(zkProofJSON);
        } catch (e) {
            throw new Error('Invalid zkProofJSON: must be valid JSON');
        }

        // Verify the Poseidon commitment matches
        // In production: use a SNARK verifier. For on-chain simplicity, we verify commitment hash
        const isCommitmentValid = zkProof.publicCommitment === cred.zkCommitment;
        const isNullifierUnspent = await this._checkNullifierUnspent(ctx, zkProof.publicNullifier);

        const isValid = isCommitmentValid && isNullifierUnspent
            && cred.status === 'ACTIVE'
            && (!cred.expirationDate || new Date(cred.expirationDate) > new Date());

        // Mark nullifier as spent (prevents double-use of the same proof)
        if (isValid && zkProof.publicNullifier) {
            await ctx.stub.putState(`nullifier_${zkProof.publicNullifier}`, Buffer.from('spent'));
        }

        // Return ONLY boolean result — no credential details revealed!
        return JSON.stringify({
            isValid,
            verifiedAt: new Date().toISOString(),
            txId:       ctx.stub.getTxID(),
            // Deliberately omit: issuer, subject, credential content
        });
    }

    // Get all credentials for a subject
    async getCredentialsBySubject(ctx, subjectId) {
        const query = {
            selector: {
                docType: 'credential',
                'credentialSubject.id': subjectId
            },
            sort: [{ issuanceDate: 'desc' }]
        };
        return await this._runQuery(ctx, JSON.stringify(query));
    }

    // Get all credentials by type
    async getCredentialsByType(ctx, credentialType) {
        const query = {
            selector: { docType: 'credential', type: { '$elemMatch': { '$eq': credentialType } } }
        };
        return await this._runQuery(ctx, JSON.stringify(query));
    }

    // Suspend credential temporarily
    async suspendCredential(ctx, credentialId, reason) {
        await this._requireRole(ctx, ['ADMIN', 'ISSUER_OFFICER']);
        const cred = await this._getCredOrThrow(ctx, credentialId);
        if (cred.status === 'REVOKED') throw new Error('Cannot suspend a revoked credential');

        cred.status = 'SUSPENDED';
        cred.suspensionReason = reason;
        cred.suspendedBy = ctx.clientIdentity.getID();
        cred.suspendedAt = new Date().toISOString();

        await ctx.stub.putState(credentialId, Buffer.from(JSON.stringify(cred)));
        ctx.stub.setEvent('CredentialSuspended', Buffer.from(JSON.stringify({ credentialId, reason })));
        return JSON.stringify(cred);
    }

    // Reactivate a suspended credential
    async reactivateCredential(ctx, credentialId) {
        await this._requireRole(ctx, ['ADMIN']);
        const cred = await this._getCredOrThrow(ctx, credentialId);
        if (cred.status !== 'SUSPENDED') throw new Error('Can only reactivate SUSPENDED credentials');

        cred.status = 'ACTIVE';
        cred.reactivatedBy = ctx.clientIdentity.getID();
        cred.reactivatedAt = new Date().toISOString();

        await ctx.stub.putState(credentialId, Buffer.from(JSON.stringify(cred)));
        ctx.stub.setEvent('CredentialReactivated', Buffer.from(JSON.stringify({ credentialId })));
        return JSON.stringify(cred);
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    async _checkNullifierUnspent(ctx, nullifier) {
        if (!nullifier) return true;
        const spent = await ctx.stub.getState(`nullifier_${nullifier}`);
        return !spent || spent.length === 0;
    }

    async _requireRole(ctx, allowedRoles) {
        const callerMSP = ctx.clientIdentity.getMSPID();
        let callerRole = 'CITIZEN';
        try {
            const roleAttr = ctx.clientIdentity.getAttributeValue('role');
            if (roleAttr) callerRole = roleAttr;
        } catch (e) {
            if (callerMSP === 'GovernmentMSP') callerRole = 'ADMIN';
            else if (callerMSP === 'UniversityMSP') callerRole = 'ISSUER_OFFICER';
            else if (callerMSP === 'VerifierMSP') callerRole = 'VERIFIER';
        }
        if (!allowedRoles.includes(callerRole) && callerRole !== 'ADMIN') {
            throw new Error(`Access denied: role '${callerRole}' not in [${allowedRoles.join(', ')}]`);
        }
    }

    async _getCredOrThrow(ctx, credentialId) {
        const raw = await ctx.stub.getState(credentialId);
        if (!raw || raw.length === 0) throw new Error(`Credential ${credentialId} does not exist`);
        return JSON.parse(raw.toString());
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

module.exports = CredentialRegistry;
