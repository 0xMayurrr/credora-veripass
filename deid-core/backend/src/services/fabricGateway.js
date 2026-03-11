'use strict';
/**
 * fabricGateway.js — Hyperledger Fabric Gateway SDK Connection Service
 * Provides org-specific gateway connections to Credora Fabric network
 */

const { connect, signers } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Network Configuration ────────────────────────────────────────────────────
const FABRIC_DIR = path.join(__dirname, '../../../../fabric-network');

const ORG_CONFIG = {
    GovernmentMSP: {
        mspId:    'GovernmentMSP',
        peerHost: 'localhost',
        peerPort: 7051,
        domain:   'government.credora.com',
        tlsCertPath: path.join(FABRIC_DIR, 'organizations/org1-government/peers/peer0/tls/ca.crt'),
        certPath:    path.join(FABRIC_DIR, 'organizations/org1-government/users/Admin@government.credora.com/msp/signcerts/cert.pem'),
        keyDirPath:  path.join(FABRIC_DIR, 'organizations/org1-government/users/Admin@government.credora.com/msp/keystore'),
    },
    UniversityMSP: {
        mspId:    'UniversityMSP',
        peerHost: 'localhost',
        peerPort: 9051,
        domain:   'university.credora.com',
        tlsCertPath: path.join(FABRIC_DIR, 'organizations/org2-universities/peers/peer0/tls/ca.crt'),
        certPath:    path.join(FABRIC_DIR, 'organizations/org2-universities/users/Admin@university.credora.com/msp/signcerts/cert.pem'),
        keyDirPath:  path.join(FABRIC_DIR, 'organizations/org2-universities/users/Admin@university.credora.com/msp/keystore'),
    },
    VerifierMSP: {
        mspId:    'VerifierMSP',
        peerHost: 'localhost',
        peerPort: 11051,
        domain:   'verifier.credora.com',
        tlsCertPath: path.join(FABRIC_DIR, 'organizations/org3-verifiers/peers/peer0/tls/ca.crt'),
        certPath:    path.join(FABRIC_DIR, 'organizations/org3-verifiers/users/Admin@verifier.credora.com/msp/signcerts/cert.pem'),
        keyDirPath:  path.join(FABRIC_DIR, 'organizations/org3-verifiers/users/Admin@verifier.credora.com/msp/keystore'),
    }
};

const CHANNEL_NAME    = process.env.FABRIC_CHANNEL_NAME || 'credora-main-channel';
const CHAINCODE_NAMES = {
    certificateLifecycle: process.env.CC_LIFECYCLE_NAME   || 'certificate-lifecycle-cc',
    credentialRegistry:   process.env.CC_CREDENTIAL_NAME  || 'credential-registry-cc',
    revocationRegistry:   process.env.CC_REVOCATION_NAME  || 'revocation-registry-cc',
    identityManagement:   process.env.CC_IDENTITY_NAME    || 'identity-management-cc',
};

// ── Gateway Factory ──────────────────────────────────────────────────────────
async function createGatewayConnection(orgMSP) {
    const orgConf = ORG_CONFIG[orgMSP];
    if (!orgConf) throw new Error(`Unknown org MSP: ${orgMSP}`);

    // 1. Load TLS certificate for the peer
    const tlsCertBytes = fs.readFileSync(orgConf.tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsCertBytes);

    // 2. Create gRPC connection to the peer
    const grpcClient = new grpc.Client(
        `${orgConf.peerHost}:${orgConf.peerPort}`,
        tlsCredentials,
        {
            'grpc.ssl_target_name_override': `peer0.${orgConf.domain}`,
            'grpc.keepalive_time_ms': 30000,
        }
    );

    // 3. Load signing certificate
    const certBytes = fs.readFileSync(orgConf.certPath);

    // 4. Load private key (get latest key file from keystore dir)
    const keyFiles = fs.readdirSync(orgConf.keyDirPath);
    if (keyFiles.length === 0) throw new Error(`No private key found in ${orgConf.keyDirPath}`);
    const privateKeyBytes = fs.readFileSync(path.join(orgConf.keyDirPath, keyFiles[0]));
    const privateKey = crypto.createPrivateKey(privateKeyBytes);

    // 5. Create Fabric Gateway connection
    const gateway = connect({
        client: grpcClient,
        identity: { mspId: orgConf.mspId, credentials: certBytes },
        signer: signers.newPrivateKeySigner(privateKey),
        evaluateOptions: () => ({ deadline: Date.now() + 5000  }),  // 5 second timeout
        endorseOptions:  () => ({ deadline: Date.now() + 15000 }),  // 15 second timeout
        submitOptions:   () => ({ deadline: Date.now() + 5000  }),
        commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    return { gateway, grpcClient };
}

// ── Contract Getter ──────────────────────────────────────────────────────────
function getContract(gateway, chaincodeName) {
    const network  = gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(chaincodeName);
    return contract;
}

// ── Graceful Disconnect ──────────────────────────────────────────────────────
function disconnectGateway(gateway, grpcClient) {
    try {
        gateway.close();
        grpcClient.close();
    } catch (e) {
        console.error('Error disconnecting Fabric gateway:', e.message);
    }
}

// ── Submit Transaction Helper ────────────────────────────────────────────────
async function submitTransaction(orgMSP, chaincodeName, fnName, ...args) {
    const { gateway, grpcClient } = await createGatewayConnection(orgMSP);
    try {
        const contract = getContract(gateway, CHAINCODE_NAMES[chaincodeName] || chaincodeName);
        const result = await contract.submitTransaction(fnName, ...args.map(String));
        return JSON.parse(result.toString());
    } finally {
        disconnectGateway(gateway, grpcClient);
    }
}

// ── Evaluate (Read-Only Query) Helper ────────────────────────────────────────
async function evaluateTransaction(orgMSP, chaincodeName, fnName, ...args) {
    const { gateway, grpcClient } = await createGatewayConnection(orgMSP);
    try {
        const contract = getContract(gateway, CHAINCODE_NAMES[chaincodeName] || chaincodeName);
        const result = await contract.evaluateTransaction(fnName, ...args.map(String));
        return JSON.parse(result.toString());
    } finally {
        disconnectGateway(gateway, grpcClient);
    }
}

module.exports = {
    createGatewayConnection,
    getContract,
    disconnectGateway,
    submitTransaction,
    evaluateTransaction,
    CHAINCODE_NAMES,
    CHANNEL_NAME,
};
