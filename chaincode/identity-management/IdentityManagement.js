'use strict';
const { Contract } = require('fabric-contract-api');

class IdentityManagement extends Contract {

    async initLedger(ctx) {
        console.log('IdentityManagement chaincode initialized on Credora network');
        // Register the initial admin identity for each org at network start
        const adminIdentities = [
            {
                identityId: 'admin-government',
                orgMSP: 'GovernmentMSP',
                role: 'ADMIN',
                name: 'Government Admin',
                department: 'MeitY',
            },
            {
                identityId: 'admin-university',
                orgMSP: 'UniversityMSP',
                role: 'ADMIN',
                name: 'University Admin',
                department: 'Education',
            },
            {
                identityId: 'admin-verifier',
                orgMSP: 'VerifierMSP',
                role: 'ADMIN',
                name: 'Verifier Admin',
                department: 'Verification',
            }
        ];

        for (const id of adminIdentities) {
            const identity = {
                docType: 'identity',
                ...id,
                did: `did:fabric:credora:${id.identityId}`,
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {}
            };
            await ctx.stub.putState(id.identityId, Buffer.from(JSON.stringify(identity)));
            console.log(`Admin identity registered: ${id.identityId}`);
        }
    }

    // Register a new identity on the Credora network
    async registerIdentity(ctx, identityId, orgMSP, role, metadataJSON) {
        // Validation
        if (!identityId || !orgMSP || !role) {
            throw new Error('identityId, orgMSP, and role are required');
        }

        const validRoles = ['CITIZEN', 'ISSUER_OFFICER', 'APPROVER', 'ADMIN', 'VERIFIER'];
        if (!validRoles.includes(role)) {
            throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
        }

        // Verify caller's MSP matches orgMSP
        const callerMSP = ctx.clientIdentity.getMSPID();
        const isAdmin = await this._isAdmin(ctx);

        if (callerMSP !== orgMSP && !isAdmin) {
            throw new Error(`Caller from ${callerMSP} cannot register identity for ${orgMSP}`);
        }

        // Only GOVERNMENTMSPs can assign ADMIN, ISSUER_OFFICER
        if (['ADMIN', 'ISSUER_OFFICER'].includes(role) && callerMSP !== 'GovernmentMSP' && !isAdmin) {
            throw new Error(`Only GovernmentMSP can grant ${role} role`);
        }

        // Check if identity already exists
        const existing = await ctx.stub.getState(identityId);
        if (existing && existing.length > 0) {
            throw new Error(`Identity ${identityId} already exists`);
        }

        let metadata = {};
        try {
            metadata = JSON.parse(metadataJSON || '{}');
        } catch (e) {
            throw new Error('Invalid metadataJSON: must be valid JSON');
        }

        const identity = {
            docType: 'identity',
            identityId,
            orgMSP,
            role,
            did: `did:fabric:credora:${identityId}`,
            name: metadata.name || '',
            department: metadata.department || '',
            organizationName: metadata.organizationName || '',
            employeeId: metadata.employeeId || '',
            status: 'ACTIVE',
            registeredBy: ctx.clientIdentity.getID(),
            registeredByOrg: callerMSP,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata
        };

        await ctx.stub.putState(identityId, Buffer.from(JSON.stringify(identity)));

        // Create composite key for org-based queries
        const compositeKey = ctx.stub.createCompositeKey('identity~org', [orgMSP, identityId]);
        await ctx.stub.putState(compositeKey, Buffer.from('\u0000'));

        // Emit event
        const event = {
            identityId,
            orgMSP,
            role,
            did: identity.did,
            timestamp: identity.createdAt
        };
        ctx.stub.setEvent('IdentityRegistered', Buffer.from(JSON.stringify(event)));

        return JSON.stringify(identity);
    }

    // Update identity metadata (owner or admin only)
    async updateIdentity(ctx, identityId, metadataJSON) {
        const identity = await this._getIdentityOrThrow(ctx, identityId);

        const callerMSP = ctx.clientIdentity.getMSPID();
        const callerID = ctx.clientIdentity.getID();
        const isAdmin = await this._isAdmin(ctx);

        // Only the identity owner or an admin can update
        if (identity.registeredBy !== callerID && !isAdmin) {
            throw new Error('Only the identity owner or an admin can update identity');
        }

        let metadata = {};
        try {
            metadata = JSON.parse(metadataJSON);
        } catch (e) {
            throw new Error('Invalid metadataJSON');
        }

        // Merge metadata — preserving role and core fields
        identity.metadata = { ...identity.metadata, ...metadata };
        if (metadata.name)             identity.name = metadata.name;
        if (metadata.department)       identity.department = metadata.department;
        if (metadata.organizationName) identity.organizationName = metadata.organizationName;
        identity.updatedAt = new Date().toISOString();

        await ctx.stub.putState(identityId, Buffer.from(JSON.stringify(identity)));

        ctx.stub.setEvent('IdentityUpdated', Buffer.from(JSON.stringify({ identityId, timestamp: identity.updatedAt })));
        return JSON.stringify(identity);
    }

    // Deactivate identity (admin only)
    async deactivateIdentity(ctx, identityId) {
        const isAdmin = await this._isAdmin(ctx);
        if (!isAdmin) throw new Error('Only admins can deactivate identities');

        const identity = await this._getIdentityOrThrow(ctx, identityId);
        identity.status = 'DEACTIVATED';
        identity.updatedAt = new Date().toISOString();
        identity.deactivatedBy = ctx.clientIdentity.getID();

        await ctx.stub.putState(identityId, Buffer.from(JSON.stringify(identity)));
        ctx.stub.setEvent('IdentityDeactivated', Buffer.from(JSON.stringify({ identityId })));
        return JSON.stringify(identity);
    }

    // Get identity by ID
    async getIdentity(ctx, identityId) {
        const identity = await this._getIdentityOrThrow(ctx, identityId);
        return JSON.stringify(identity);
    }

    // Check if given identity has a required role
    async hasRole(ctx, identityId, requiredRole) {
        try {
            const identity = await this._getIdentityOrThrow(ctx, identityId);
            const hasIt = identity.role === requiredRole || identity.role === 'ADMIN';
            return JSON.stringify({ identityId, requiredRole, hasRole: hasIt, actualRole: identity.role });
        } catch (e) {
            return JSON.stringify({ identityId, requiredRole, hasRole: false, error: e.message });
        }
    }

    // Get all identities by org (CouchDB rich query)
    async getIdentitiesByOrg(ctx, orgMSP) {
        const query = {
            selector: {
                docType: 'identity',
                orgMSP: orgMSP
            },
            sort: [{ createdAt: 'desc' }]
        };
        return await this._runQuery(ctx, JSON.stringify(query));
    }

    // Get all identities with a specific role
    async getIdentitiesByRole(ctx, role) {
        const query = {
            selector: {
                docType: 'identity',
                role: role,
                status: 'ACTIVE'
            }
        };
        return await this._runQuery(ctx, JSON.stringify(query));
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    async _getIdentityOrThrow(ctx, identityId) {
        const raw = await ctx.stub.getState(identityId);
        if (!raw || raw.length === 0) {
            throw new Error(`Identity ${identityId} does not exist`);
        }
        return JSON.parse(raw.toString());
    }

    async _isAdmin(ctx) {
        try {
            const callerID = ctx.clientIdentity.getID();
            // Check if registered identity has ADMIN role
            const raw = await ctx.stub.getState(callerID);
            if (raw && raw.length > 0) {
                const identity = JSON.parse(raw.toString());
                return identity.role === 'ADMIN';
            }
            // Fabric admin attr check as fallback
            return ctx.clientIdentity.assertAttributeValue('hf.Admin', 'true');
        } catch (e) {
            return false;
        }
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

module.exports = IdentityManagement;
