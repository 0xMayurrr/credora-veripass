#!/bin/bash
# network.sh — Credora Hyperledger Fabric Network Management Script
# Usage: ./network.sh [up|down|createChannel|deployCC|restart|status]

set -e

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${GREEN}[CREDORA]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Config ───────────────────────────────────────────────────────────────────
COMPOSE_FILE="./docker-compose.yaml"
CHANNEL_NAME="credora-main-channel"
FABRIC_VERSION="2.5"
CA_VERSION="1.5"

# Paths to Fabric binaries (downloaded by bootstrap.sh)
export PATH="${PWD}/../bin:$PATH"
export FABRIC_CFG_PATH="${PWD}"

# ── Check Prerequisites ──────────────────────────────────────────────────────
checkPrereqs() {
    log "Checking prerequisites..."
    command -v docker >/dev/null 2>&1 || err "Docker not found. Install Docker Desktop."
    command -v docker-compose >/dev/null 2>&1 || err "docker-compose not found."

    # Check fabric binaries
    if [ ! -d "../bin" ]; then
        warn "Fabric binaries not found. Downloading..."
        downloadFabricBinaries
    fi
    command -v cryptogen >/dev/null 2>&1 || err "cryptogen not found. Run ./network.sh bootstrap first."
    command -v configtxgen >/dev/null 2>&1 || err "configtxgen not found."
    log "Prerequisites OK ✓"
}

# ── Download Fabric Binaries ─────────────────────────────────────────────────
downloadFabricBinaries() {
    log "Downloading Hyperledger Fabric ${FABRIC_VERSION} binaries..."
    curl -sSL https://bit.ly/2ysbOFE | bash -s -- ${FABRIC_VERSION} ${CA_VERSION}
    log "Fabric binaries downloaded ✓"
}

# ── Generate Crypto Material ─────────────────────────────────────────────────
generateCerts() {
    log "Generating cryptographic material for all orgs..."

    if [ -d "organizations" ]; then
        warn "Existing crypto material found. Removing..."
        rm -rf organizations channel-artifacts
    fi

    mkdir -p organizations channel-artifacts

    # Generate crypto material using cryptogen
    cryptogen generate --config=./crypto-config.yaml --output="organizations" \
        || err "Failed to generate crypto material"

    log "Crypto material generated ✓"
}

# ── Generate Channel Artifacts ───────────────────────────────────────────────
generateChannelArtifacts() {
    log "Generating genesis block and channel transaction..."

    mkdir -p channel-artifacts

    # Genesis block for orderer
    configtxgen -profile CredoraOrdererGenesis \
        -channelID system-channel \
        -outputBlock ./channel-artifacts/genesis.block \
        || err "Failed to generate genesis block"

    # Main channel transaction
    configtxgen -profile CredoraMainChannel \
        -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx \
        -channelID ${CHANNEL_NAME} \
        || err "Failed to generate channel tx"

    # Anchor peer transactions for each org
    for org in Government University Verifier; do
        configtxgen -profile CredoraMainChannel \
            -outputAnchorPeersUpdate ./channel-artifacts/${org}MSPanchors.tx \
            -channelID ${CHANNEL_NAME} \
            -asOrg ${org}Org \
            || err "Failed to generate anchor peer tx for ${org}"
    done

    log "Channel artifacts generated ✓"
}

# ── Start Network ────────────────────────────────────────────────────────────
networkUp() {
    log "Starting Credora Fabric Network..."

    checkPrereqs
    generateCerts
    generateChannelArtifacts

    # Pull latest images if needed
    docker-compose -f ${COMPOSE_FILE} pull --quiet 2>/dev/null || true

    # Start all containers
    docker-compose -f ${COMPOSE_FILE} up -d \
        || err "Failed to start Docker containers"

    # Wait for all containers to be healthy
    log "Waiting for peers to start..."
    sleep 5

    # Verify containers are running
    for container in \
        orderer.credora.com \
        peer0.government.credora.com \
        peer0.university.credora.com \
        peer0.verifier.credora.com; do
        if ! docker ps | grep -q "${container}"; then
            err "Container ${container} failed to start. Check: docker logs ${container}"
        fi
    done

    log "🚀 Credora Fabric Network is UP!"
    log "Containers running:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep credora
}

# ── Stop Network ─────────────────────────────────────────────────────────────
networkDown() {
    log "Stopping Credora Fabric Network..."

    docker-compose -f ${COMPOSE_FILE} down --volumes --remove-orphans 2>/dev/null || true

    # Remove chaincode containers
    docker rm -f $(docker ps -a --filter "name=dev-peer" -q) 2>/dev/null || true
    docker rmi -f $(docker images --filter "reference=dev-peer*" -q) 2>/dev/null || true

    # Clean generated artifacts
    if [ -d "organizations" ]; then
        rm -rf organizations channel-artifacts
        log "Removed crypto material and channel artifacts"
    fi

    log "Network stopped and cleaned ✓"
}

# ── Create Channel ───────────────────────────────────────────────────────────
createChannel() {
    log "Creating channel: ${CHANNEL_NAME}..."

    # Government org peer is the channel creator
    docker exec cli peer channel create \
        -o orderer.credora.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/credora/channel-artifacts/${CHANNEL_NAME}.tx \
        --outputBlock /opt/gopath/src/github.com/credora/channel-artifacts/${CHANNEL_NAME}.block \
        --tls \
        --cafile /opt/gopath/src/github.com/credora/crypto-config/ordererOrganizations/credora.com/orderers/orderer.credora.com/msp/tlscacerts/tlsca.credora.com-cert.pem \
        || err "Channel creation failed"

    log "Channel '${CHANNEL_NAME}' created ✓"

    # Join all peers to the channel
    log "Joining peers to channel..."

    # Government peer
    docker exec \
        -e CORE_PEER_LOCALMSPID=GovernmentMSP \
        -e CORE_PEER_ADDRESS=peer0.government.credora.com:7051 \
        cli peer channel join \
        -b /opt/gopath/src/github.com/credora/channel-artifacts/${CHANNEL_NAME}.block \
        || err "Failed to join Government peer"
    log "  Government peer joined ✓"

    # University peer
    docker exec \
        -e CORE_PEER_LOCALMSPID=UniversityMSP \
        -e CORE_PEER_ADDRESS=peer0.university.credora.com:9051 \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/credora/crypto-config/peerOrganizations/university.credora.com/peers/peer0.university.credora.com/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/credora/crypto-config/peerOrganizations/university.credora.com/users/Admin@university.credora.com/msp \
        cli peer channel join \
        -b /opt/gopath/src/github.com/credora/channel-artifacts/${CHANNEL_NAME}.block \
        || err "Failed to join University peer"
    log "  University peer joined ✓"

    # Verifier peer
    docker exec \
        -e CORE_PEER_LOCALMSPID=VerifierMSP \
        -e CORE_PEER_ADDRESS=peer0.verifier.credora.com:11051 \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/credora/crypto-config/peerOrganizations/verifier.credora.com/peers/peer0.verifier.credora.com/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/credora/crypto-config/peerOrganizations/verifier.credora.com/users/Admin@verifier.credora.com/msp \
        cli peer channel join \
        -b /opt/gopath/src/github.com/credora/channel-artifacts/${CHANNEL_NAME}.block \
        || err "Failed to join Verifier peer"
    log "  Verifier peer joined ✓"

    log "All peers joined channel '${CHANNEL_NAME}' ✓"
    updateAnchorPeers
}

# ── Update Anchor Peers ──────────────────────────────────────────────────────
updateAnchorPeers() {
    log "Updating anchor peers..."

    for org in Government University Verifier; do
        case $org in
            Government) MSP="GovernmentMSP"; ADDR="peer0.government.credora.com:7051"; TLS_PATH="government.credora.com/peers/peer0.government.credora.com/tls/ca.crt"; MSP_PATH="government.credora.com/users/Admin@government.credora.com/msp" ;;
            University) MSP="UniversityMSP"; ADDR="peer0.university.credora.com:9051"; TLS_PATH="university.credora.com/peers/peer0.university.credora.com/tls/ca.crt"; MSP_PATH="university.credora.com/users/Admin@university.credora.com/msp" ;;
            Verifier)   MSP="VerifierMSP";   ADDR="peer0.verifier.credora.com:11051";  TLS_PATH="verifier.credora.com/peers/peer0.verifier.credora.com/tls/ca.crt";   MSP_PATH="verifier.credora.com/users/Admin@verifier.credora.com/msp" ;;
        esac

        CRYPTO_BASE="/opt/gopath/src/github.com/credora/crypto-config/peerOrganizations"

        docker exec \
            -e CORE_PEER_LOCALMSPID="${MSP}" \
            -e CORE_PEER_ADDRESS="${ADDR}" \
            -e CORE_PEER_TLS_ROOTCERT_FILE="${CRYPTO_BASE}/${TLS_PATH}" \
            -e CORE_PEER_MSPCONFIGPATH="${CRYPTO_BASE}/${MSP_PATH}" \
            cli peer channel update \
            -o orderer.credora.com:7050 \
            -c ${CHANNEL_NAME} \
            -f /opt/gopath/src/github.com/credora/channel-artifacts/${org}MSPanchors.tx \
            --tls \
            --cafile /opt/gopath/src/github.com/credora/crypto-config/ordererOrganizations/credora.com/orderers/orderer.credora.com/msp/tlscacerts/tlsca.credora.com-cert.pem \
            || err "Failed to update anchor peer for ${org}"

        log "  ${org} anchor peer updated ✓"
    done
}

# ── Deploy Chaincode ─────────────────────────────────────────────────────────
deployCC() {
    log "Deploying all Credora chaincodes..."

    CHAINCODES=(
        "identity-management identity-management-cc"
        "certificate-lifecycle certificate-lifecycle-cc"
        "credential-registry credential-registry-cc"
        "revocation-registry revocation-registry-cc"
    )

    for cc in "${CHAINCODES[@]}"; do
        CC_DIR=$(echo $cc | cut -d' ' -f1)
        CC_NAME=$(echo $cc | cut -d' ' -f2)

        log "  Deploying ${CC_NAME}..."

        CHAINCODE_VERSION="1.0"
        CHAINCODE_SEQUENCE="1"
        CC_SRC_PATH="/opt/gopath/src/chaincode/${CC_DIR}"

        # Package chaincode
        docker exec cli peer lifecycle chaincode package \
            /tmp/${CC_NAME}.tar.gz \
            --path ${CC_SRC_PATH} \
            --lang node \
            --label ${CC_NAME}_${CHAINCODE_VERSION} \
            || err "Failed to package ${CC_NAME}"

        # Install on all peers
        for org_params in \
            "GovernmentMSP peer0.government.credora.com:7051 government.credora.com/peers/peer0.government.credora.com/tls/ca.crt government.credora.com/users/Admin@government.credora.com/msp" \
            "UniversityMSP peer0.university.credora.com:9051 university.credora.com/peers/peer0.university.credora.com/tls/ca.crt university.credora.com/users/Admin@university.credora.com/msp" \
            "VerifierMSP peer0.verifier.credora.com:11051 verifier.credora.com/peers/peer0.verifier.credora.com/tls/ca.crt verifier.credora.com/users/Admin@verifier.credora.com/msp"; do

            MSP=$(echo $org_params | cut -d' ' -f1)
            ADDR=$(echo $org_params | cut -d' ' -f2)
            TLS=$(echo $org_params | cut -d' ' -f3)
            MSP_PATH=$(echo $org_params | cut -d' ' -f4)
            CRYPTO_BASE="/opt/gopath/src/github.com/credora/crypto-config/peerOrganizations"

            docker exec \
                -e CORE_PEER_LOCALMSPID="${MSP}" \
                -e CORE_PEER_ADDRESS="${ADDR}" \
                -e CORE_PEER_TLS_ROOTCERT_FILE="${CRYPTO_BASE}/${TLS}" \
                -e CORE_PEER_MSPCONFIGPATH="${CRYPTO_BASE}/${MSP_PATH}" \
                cli peer lifecycle chaincode install /tmp/${CC_NAME}.tar.gz \
                || err "Failed to install ${CC_NAME} on ${MSP}"
        done

        # Get package ID
        PKG_ID=$(docker exec cli peer lifecycle chaincode queryinstalled \
            --output json 2>/dev/null | \
            python3 -c "import sys, json; data=json.load(sys.stdin); \
            print([x['package_id'] for x in data.get('installed_chaincodes',[]) \
            if '${CC_NAME}' in x['package_id']][0])" 2>/dev/null \
            || echo "${CC_NAME}_${CHAINCODE_VERSION}:placeholder")

        log "    Package ID: ${PKG_ID}"

        # Approve from each org
        for org_params in \
            "GovernmentMSP peer0.government.credora.com:7051 government.credora.com/peers/peer0.government.credora.com/tls/ca.crt government.credora.com/users/Admin@government.credora.com/msp" \
            "UniversityMSP peer0.university.credora.com:9051 university.credora.com/peers/peer0.university.credora.com/tls/ca.crt university.credora.com/users/Admin@university.credora.com/msp" \
            "VerifierMSP peer0.verifier.credora.com:11051 verifier.credora.com/peers/peer0.verifier.credora.com/tls/ca.crt verifier.credora.com/users/Admin@verifier.credora.com/msp"; do

            MSP=$(echo $org_params | cut -d' ' -f1)
            ADDR=$(echo $org_params | cut -d' ' -f2)
            TLS=$(echo $org_params | cut -d' ' -f3)
            MSP_PATH=$(echo $org_params | cut -d' ' -f4)
            CRYPTO_BASE="/opt/gopath/src/github.com/credora/crypto-config/peerOrganizations"

            docker exec \
                -e CORE_PEER_LOCALMSPID="${MSP}" \
                -e CORE_PEER_ADDRESS="${ADDR}" \
                -e CORE_PEER_TLS_ROOTCERT_FILE="${CRYPTO_BASE}/${TLS}" \
                -e CORE_PEER_MSPCONFIGPATH="${CRYPTO_BASE}/${MSP_PATH}" \
                cli peer lifecycle chaincode approveformyorg \
                -o orderer.credora.com:7050 \
                --channelID ${CHANNEL_NAME} \
                --name ${CC_NAME} \
                --version ${CHAINCODE_VERSION} \
                --package-id "${PKG_ID}" \
                --sequence ${CHAINCODE_SEQUENCE} \
                --tls \
                --cafile /opt/gopath/src/github.com/credora/crypto-config/ordererOrganizations/credora.com/orderers/orderer.credora.com/msp/tlscacerts/tlsca.credora.com-cert.pem \
                || err "Approval failed for ${MSP}"
        done

        # Commit chaincode
        docker exec cli peer lifecycle chaincode commit \
            -o orderer.credora.com:7050 \
            --channelID ${CHANNEL_NAME} \
            --name ${CC_NAME} \
            --version ${CHAINCODE_VERSION} \
            --sequence ${CHAINCODE_SEQUENCE} \
            --tls \
            --cafile /opt/gopath/src/github.com/credora/crypto-config/ordererOrganizations/credora.com/orderers/orderer.credora.com/msp/tlscacerts/tlsca.credora.com-cert.pem \
            --peerAddresses peer0.government.credora.com:7051 \
            --tlsRootCertFiles /opt/gopath/src/github.com/credora/crypto-config/peerOrganizations/government.credora.com/peers/peer0.government.credora.com/tls/ca.crt \
            --peerAddresses peer0.university.credora.com:9051 \
            --tlsRootCertFiles /opt/gopath/src/github.com/credora/crypto-config/peerOrganizations/university.credora.com/peers/peer0.university.credora.com/tls/ca.crt \
            || err "Commit failed for ${CC_NAME}"

        log "  ${CC_NAME} deployed and committed ✓"
    done

    log "✅ All 4 chaincodes deployed successfully!"
}

# ── Status ───────────────────────────────────────────────────────────────────
networkStatus() {
    echo ""
    echo -e "${BLUE}═══ Credora Fabric Network Status ═══${NC}"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || warn "Docker not running"
    echo ""
    echo -e "${BLUE}Channel members:${NC}"
    docker exec cli peer channel list 2>/dev/null || warn "CLI container not running"
}

# ── Restart ──────────────────────────────────────────────────────────────────
networkRestart() {
    log "Restarting network (full reset)..."
    networkDown
    sleep 3
    networkUp
    sleep 5
    createChannel
    sleep 3
    deployCC
}

# ── Entry Point ──────────────────────────────────────────────────────────────
case "$1" in
    up)           networkUp ;;
    down)         networkDown ;;
    createChannel) createChannel ;;
    deployCC)     deployCC ;;
    restart)      networkRestart ;;
    status)       networkStatus ;;
    bootstrap)    downloadFabricBinaries ;;
    *)
        echo ""
        echo -e "${BLUE}Credora Hyperledger Fabric Network Management${NC}"
        echo ""
        echo "Usage: ./network.sh <command>"
        echo ""
        echo "Commands:"
        echo "  bootstrap     Download Fabric binaries (run once first)"
        echo "  up            Start all network nodes"
        echo "  down          Stop and clean all nodes + crypto material"
        echo "  createChannel Create credora-main-channel and join all peers"
        echo "  deployCC      Deploy all 4 chaincodes to the channel"
        echo "  restart       down + up + createChannel + deployCC"
        echo "  status        Show running containers and channel info"
        echo ""
        ;;
esac
