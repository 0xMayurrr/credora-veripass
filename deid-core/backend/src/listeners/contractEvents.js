const { ethers } = require('ethers');
const CertificateLifecycle = require('../models/CertificateLifecycle');

// The ABI for CertificateLifecycle
const certLifecycleABI = [
    "event CertificateStateChanged(bytes32 indexed docHash, uint8 newState, address changedBy, uint256 timestamp)",
    "event CertificateApproved(bytes32 indexed docHash, address approver, uint256 timestamp)"
];

const stateMap = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'SIGNED', 'ISSUED', 'REVOKED'];

const listenToEvents = () => {
    try {
        if (!process.env.LIFECYCLE_CONTRACT_ADDRESS) {
            console.log("No LIFECYCLE_CONTRACT_ADDRESS found. Skipping event listener.");
            return;
        }

        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        
        provider.getNetwork().then(() => {
            console.log("✅ Successfully connected to Blockchain RPC");
        }).catch(err => {
            console.error("⚠️ Warning: Could not connect to Blockchain RPC immediately. The listener will keep trying in the background, but the server will remain up. Error:", err.message);
        });

        const contract = new ethers.Contract(process.env.LIFECYCLE_CONTRACT_ADDRESS, certLifecycleABI, provider);

        contract.on("CertificateStateChanged", async (docHash, newState, changedBy, timestamp) => {
            console.log(`Event Rx: State Changed to ${newState} for ${docHash}`);
            try {
                const cert = await CertificateLifecycle.findOne({ docHash });
                if (cert) {
                    const stateStr = stateMap[newState];
                    // Make sure we don't duplicate state timestamps if UI optimistically updated
                    const alreadyHas = cert.stateTimestamps.find(s => s.state === stateStr && s.changedBy.toLowerCase() === changedBy.toLowerCase());
                    if (!alreadyHas) {
                        cert.state = stateStr;
                        cert.stateTimestamps.push({
                            state: stateStr,
                            timestamp: new Date(Number(timestamp) * 1000),
                            changedBy: changedBy.toLowerCase()
                        });
                        if (stateStr === 'REVOKED') cert.isRevoked = true;

                        await cert.save();
                        console.log(`Synced state ${stateStr} to DB for docHash ${docHash}`);
                    }
                }
            } catch (err) {
                console.error("Error syncing CertificateStateChanged:", err);
            }
        });

        console.log("Listening for CertificateLifecycle smart contract events...");
    } catch (err) {
        console.error("Event listener error:", err);
    }
};

module.exports = listenToEvents;
