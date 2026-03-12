<p align="center">
  <h1 align="center">🔐 CREDORA</h1>
  <p align="center"><strong>Securing India's Credentials on the Blockchain</strong></p>
  <p align="center">A government-grade, privacy-preserving certificate lifecycle management platform built on Hyperledger Fabric with Zero-Knowledge proofs and AI fraud detection.</p>
</p>

<p align="center">
  <a href="https://credora-veripass.netlify.app/"><img src="https://img.shields.io/badge/🌐_Live_Frontend-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" alt="Netlify Live"></a>
  <a href="https://credora-wallet-backend.onrender.com/"><img src="https://img.shields.io/badge/⚙️_Live_Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render Live"></a>
  <a href="https://github.com/0xMayurrr/credora-veripass"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Hyperledger_Fabric-2.5-2F3134?style=flat-square&logo=hyperledger&logoColor=white" alt="Fabric">
  <img src="https://img.shields.io/badge/MeitY-Blockchain_India_Challenge_2024-FF6F00?style=flat-square" alt="MeitY">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT">
  <img src="https://img.shields.io/badge/Zero_Knowledge-Semaphore_Protocol-6C3FC5?style=flat-square" alt="ZK">
  <img src="https://img.shields.io/badge/AI-Fraud_Detection-EF4444?style=flat-square" alt="AI">
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node">
  <img src="https://img.shields.io/badge/React-TypeScript-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Certificate Lifecycle](#-certificate-lifecycle)
- [Features](#-features)
- [AI Fraud Detection](#-ai-fraud-detection-engine)
- [Zero-Knowledge Privacy](#-zero-knowledge-privacy-layer)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [API Reference](#-api-reference)
- [Credora vs Alternatives](#-credora-vs-alternatives)
- [Security](#-security)
- [Compliance](#-compliance--regulatory-framework)
- [Quick Start](#-quick-start)
- [Author](#-author)
- [License](#-license)

---

## 🌟 Overview

**Credora** is a full-stack, production-grade platform that transforms how India issues, manages, and verifies government and academic credentials. Built for the **Blockchain India Challenge 2024** (MeitY), it combines three deep technologies into a single cohesive system:

| Layer | Technology | Purpose |
|---|---|---|
| 🔗 **Base Trust** | Hyperledger Fabric | Immutable, permissioned ledger — no tokens, no gas fees |
| 🛡️ **Privacy** | Semaphore ZK Protocol | Prove credential ownership without revealing identity |
| 🤖 **Intelligence** | AI Fraud Detection | Block fake credentials before they hit the ledger |

> **Why Credora?** India processes millions of certificates annually across thousands of institutions. Manual verification takes days. Credora makes it instant, tamper-proof, and privacy-preserving — all without cryptocurrency.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CREDORA PLATFORM                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    FRONTEND (React + Vite + TS)                │  │
│  │  Dashboard │ Gov Portal │ Profile │ Verify │ Share │ DevRep   │  │
│  │                 Tailwind CSS + Shadcn UI + Framer Motion       │  │
│  │                     MetaMask ←→ Ethers.js v6                   │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               │ HTTPS / JWT                          │
│  ┌────────────────────────────▼───────────────────────────────────┐  │
│  │                 BACKEND (Node.js + Express)                    │  │
│  │                                                                │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐   │  │
│  │  │ REST API │  │ AI Fraud     │  │ ZK-Fabric Bridge       │   │  │
│  │  │ Routes   │  │ Detection    │  │ Service                │   │  │
│  │  │          │  │ Engine       │  │ (Semaphore ↔ Fabric)   │   │  │
│  │  └──────────┘  └──────────────┘  └────────────────────────┘   │  │
│  │                                                                │  │
│  │  ┌──────────────────┐    ┌─────────────────────────────────┐  │  │
│  │  │  MongoDB Atlas   │    │  Pinata IPFS                    │  │  │
│  │  │  (Users, Creds,  │    │  (Document Storage)             │  │  │
│  │  │   FraudLogs)     │    │                                 │  │  │
│  │  └──────────────────┘    └─────────────────────────────────┘  │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               │ Fabric Gateway SDK                   │
│  ┌────────────────────────────▼───────────────────────────────────┐  │
│  │              HYPERLEDGER FABRIC NETWORK                        │  │
│  │                                                                │  │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │   │ GovernmentMSP│  │ UniversityMSP│  │  VerifierMSP │       │  │
│  │   │   (Admin)    │  │  (Issuer)    │  │  (Read-Only) │       │  │
│  │   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │  │
│  │          │                 │                  │               │  │
│  │   ┌──────▼─────────────────▼──────────────────▼───────┐      │  │
│  │   │            RAFT Orderer Service                   │      │  │
│  │   │          credora-main-channel                     │      │  │
│  │   └───────────────────────────────────────────────────┘      │  │
│  │                                                                │  │
│  │   CHAINCODES:                                                  │  │
│  │   ┌─────────────────┐  ┌─────────────────┐                   │  │
│  │   │ Certificate     │  │ Credential      │                   │  │
│  │   │ Lifecycle CC    │  │ Registry CC     │                   │  │
│  │   │ (6-state FSM)   │  │ (W3C VC + ZK)   │                   │  │
│  │   └─────────────────┘  └─────────────────┘                   │  │
│  │   ┌─────────────────┐  ┌─────────────────┐                   │  │
│  │   │ Revocation      │  │ Identity        │                   │  │
│  │   │ Registry CC     │  │ Management CC   │                   │  │
│  │   │ (Appeals)       │  │ (DID + Roles)   │                   │  │
│  │   └─────────────────┘  └─────────────────┘                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Certificate Lifecycle

Credora implements a **6-state finite state machine** enforced on-chain with role-based transitions:

```
            ISSUER_OFFICER              APPROVER                 ADMIN
                 │                        │                        │
                 ▼                        ▼                        ▼
┌─────────┐   submit   ┌──────────────┐ approve ┌──────────┐   sign   ┌─────────┐  issue  ┌─────────┐
│  DRAFT  │ ─────────▶ │ UNDER_REVIEW │ ──────▶ │ APPROVED │ ──────▶ │ SIGNED  │ ─────▶ │ ISSUED  │
└─────────┘             └──────────────┘         └──────────┘         └─────────┘        └─────────┘
     ▲                        │                       │                                       │
     │                        │ reject                │ re-review                             │
     └────────────────────────┘                       │                                 revoke│
                                                      │                                      ▼
                                                      └───────────────────────────     ┌──────────┐
                                                                                       │ REVOKED  │
                                                                                       └──────────┘
```

| Transition | Required Role | Description |
|---|---|---|
| DRAFT → UNDER_REVIEW | ISSUER_OFFICER | Submit for approval |
| UNDER_REVIEW → APPROVED | APPROVER | Approve certificate |
| UNDER_REVIEW → DRAFT | APPROVER | Return for revision |
| APPROVED → SIGNED | ADMIN | Digital signature |
| SIGNED → ISSUED | ADMIN | Issue to recipient |
| ISSUED → REVOKED | ADMIN | Permanent revocation |

Every transition is recorded on the Fabric ledger with caller ID, org MSP, timestamp, transaction ID, and remarks — creating a **complete, immutable audit trail**.

---

## ✨ Features

### 🔗 Hyperledger Fabric Network
- **3 Organizations**: GovernmentMSP, UniversityMSP, VerifierMSP
- **RAFT consensus** ordering service — crash fault tolerant
- **TLS 1.3** peer communication — enterprise-grade encryption
- **CouchDB** state database — rich queries on-chain
- **Permissioned** — no cryptocurrency, no gas fees, no speculation

### 📜 4 Active Chaincodes

| Chaincode | Functions | Key Capability |
|---|---|---|
| **CertificateLifecycle** | 12 functions | 6-state FSM, multi-sig approval, audit trail |
| **CredentialRegistry** | 10 functions | W3C VCs, ZK commitments, reverse lookups |
| **RevocationRegistry** | 6 functions | Revocation, appeals, reinstatement |
| **IdentityManagement** | 8 functions | DID registration, RBAC, org queries |

### 🆔 Decentralized Identity (DID)
- Auto-generated `did:fabric:credora:...` identifiers
- W3C DID-compliant structure
- Dual storage (MongoDB + Fabric ledger)
- Wallet address → DID mapping

### 🔐 Web3 Authentication
- MetaMask wallet connection (Ethers.js v6)
- Cryptographic nonce + signature verification
- JWT session management
- Completely **passwordless**

### 📄 Credential Issuance & Verification
- Document upload (PDF, images) via Multer
- IPFS storage via Pinata
- SHA-256 credential hashing
- On-chain issuance via Fabric Gateway SDK
- Public verification endpoint (no auth required)
- QR code generation + shareable links

### 🔗 Sharing System
- Time-limited share links with expiry management
- QR code sharing for instant mobile scanning
- Share revocation and access tracking

### 👨‍💻 Dev Rep Engine
- GitHub API integration for repository scoring
- On-chain developer reputation credentials
- Public verification + QR portfolio sharing

---

## 🤖 AI Fraud Detection Engine

Credora runs every credential through an **8-signal fraud scoring engine** before it touches the blockchain:

```
                         ┌─────────────────────────┐
                         │   Credential Submitted   │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │   AI FRAUD ANALYSIS      │
                         │                          │
                         │  Signal 1: Institution   │──── UGC Database Check
                         │  Signal 2: Fake Univ     │──── UGC Fake List 2024
                         │  Signal 3: Date Anomaly  │──── Future/impossible dates
                         │  Signal 4: Suspicious    │──── Pattern matching
                         │  Signal 5: Missing Data  │──── Required field check
                         │  Signal 6: Wallet Check  │──── Format + burn address
                         │  Signal 7: Surge Detect  │──── 50+/hour threshold
                         │  Signal 8: Duplicate     │──── Hash collision check
                         │                          │
                         │  fraud_score: 0 ─── 100  │
                         └────────────┬────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
     ┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
     │   SCORE < 40    │    │  40 ≤ SCORE < 70│    │  SCORE ≥ 70     │
     │   ✅ APPROVE     │    │  ⚠️ REVIEW       │    │  ❌ REJECT       │
     │   Auto-proceed  │    │  Flag for senior│    │  Block issuance │
     └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                          │
                                                   SCORE = 100?
                                                   🚨 CRITICAL
                                                   Instant block
                                                   (Fake university)
```

| Signal | Max Points | Detects |
|---|---|---|
| Unknown Institution | 40 | Issuer not in UGC recognized database |
| Fake University | 100 | Issuer on UGC fake university list → **instant block** |
| Date Anomaly | 25 | Future dates, pre-1950 dates, expiry before issuance |
| Suspicious Type | 20 | "instant degree", "guaranteed certificate", etc. |
| Missing Fields | 15 | Incomplete credential metadata |
| Wallet Pattern | 10 | Invalid format, burn addresses |
| Issuance Surge | 30 | 50+ credentials/hour from same issuer |
| Duplicate Hash | 60 | Same credential hash submitted twice |

**Human Override**: Senior officers can override AI decisions via `PATCH /api/ai/logs/:id/override` — all overrides are logged for accountability.

---

## 🛡️ Zero-Knowledge Privacy Layer

Credora integrates the **Semaphore Protocol** for zero-knowledge credential verification:

```
  ISSUANCE                              VERIFICATION (Zero-Knowledge)
  ────────                              ──────────────────────────────

  ┌──────────┐                          ┌──────────────┐
  │ Citizen   │                          │ Verifier     │
  │ receives  │                          │ (Bank/       │
  │ credential│                          │  Employer)   │
  └─────┬────┘                          └──────┬───────┘
        │                                      │
        │ zkCommitment                         │ "Prove your degree"
        │ stored on Fabric                     │
        │                                      ▼
        ▼                               ┌──────────────┐
  ┌──────────┐                          │ Citizen       │
  │ Semaphore│ commitment               │ generates     │
  │ Group    │ ◄── added ──             │ ZK proof      │
  │ updated  │                          │ IN BROWSER    │
  └──────────┘                          │ (private key  │
                                        │  never leaves)│
                                        └──────┬───────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │   RESULT:     │
                                        │               │
                                        │ ✅ Valid degree│
                                        │ ✅ Active cred │
                                        │ ❌ No name     │
                                        │ ❌ No marks    │
                                        │ ❌ No identity │
                                        └──────────────┘
```

**What the verifier learns:** "This person holds a valid B.Tech CS degree from a UGC-recognized university."

**What the verifier does NOT learn:** Name, marks, date of birth, wallet address, or which specific credential.

---

## 🛠️ Tech Stack

### Blockchain Layer
| Technology | Version | Purpose |
|---|---|---|
| Hyperledger Fabric | 2.5 | Permissioned blockchain network |
| fabric-contract-api | ^2.5.0 | Chaincode development |
| CouchDB | Latest | State database (rich queries) |
| Docker | Latest | Container orchestration |

### Privacy Layer
| Technology | Purpose |
|---|---|
| @semaphore-protocol/identity | ZK identity generation |
| @semaphore-protocol/group | Merkle tree group management |
| @semaphore-protocol/proof | ZK proof generation & verification |

### AI Layer
| Component | Technology |
|---|---|
| Fraud Engine | Node.js rule-based + heuristic scoring |
| Data Store | MongoDB (FraudLog collection) |
| UGC Oracle | Mock database (API-ready) |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework + build tool |
| TypeScript | Type safety |
| Tailwind CSS + Shadcn UI | Styling + component library |
| Ethers.js v6 | Wallet integration |
| Framer Motion | Animations |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB Atlas | Cloud database |
| Fabric Gateway SDK | Blockchain interaction |
| Pinata API | IPFS document storage |
| JWT + bcrypt | Authentication |

### Deployment
| Service | Platform | URL |
|---|---|---|
| Frontend | Netlify | [credora-veripass.netlify.app](https://credora-veripass.netlify.app/) |
| Backend | Render | [credora-wallet-backend.onrender.com](https://credora-wallet-backend.onrender.com/) |
| Database | MongoDB Atlas | Cloud (Mumbai region) |

---

## 📁 Repository Structure

```
credora-veripass/
│
├── 📂 fabric-network/
│   ├── organizations/              # GovernmentMSP, UniversityMSP, VerifierMSP
│   ├── docker-compose.yaml         # Full 3-org Fabric network
│   ├── configtx.yaml               # Channel configuration
│   └── network.sh                  # Network bootstrap script
│
├── 📂 chaincode/
│   ├── certificate-lifecycle/      # 6-state lifecycle FSM
│   │   ├── CertificateLifecycle.js
│   │   └── package.json
│   ├── credential-registry/        # W3C VCs + ZK commitments
│   │   ├── CredentialRegistry.js
│   │   └── package.json
│   ├── revocation-registry/        # Revocation + appeals
│   │   ├── RevocationRegistry.js
│   │   └── package.json
│   └── identity-management/        # DID + RBAC
│       ├── IdentityManagement.js
│       └── package.json
│
├── 📂 deid-core/backend/
│   └── src/
│       ├── controllers/            # credentialController.js (AI-gated)
│       ├── routes/                 # auth, credentials, certificates, AI, ZK
│       ├── services/               # aiService.js, chaincodeService.js, ipfsService.js
│       ├── models/                 # User, Credential, FraudLog, ZKGroup
│       ├── middleware/             # JWT auth, file upload
│       └── server.js              # Express entry point
│
├── 📂 veripass-wallet/
│   └── src/
│       ├── pages/                  # Dashboard, Profile, GovPortal, Verify
│       ├── components/             # ZKIdentityCard, ZKProofGenerator
│       ├── hooks/                  # useZKProof
│       ├── services/               # zkFabricService.ts
│       └── contexts/               # AuthContext
│
├── .gitignore
├── netlify.toml
└── README.md                       # You are here
```

---

## 🌐 API Reference

### 🔑 Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/nonce` | Get sign nonce | ❌ |
| `POST` | `/api/auth/verify` | Verify signature + get JWT | ❌ |

### 📜 Credentials
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/credentials/issue` | Issue credential (AI fraud-gated) | ✅ |
| `GET` | `/api/credentials/` | Get my credentials | ✅ |
| `GET` | `/api/credentials/issued` | Get issued credentials | ✅ |
| `GET` | `/api/credentials/:id` | Get credential by ID | ✅ |
| `PUT` | `/api/credentials/revoke/:id` | Revoke credential | ✅ |

### 📋 Certificates (Lifecycle)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/certificates/draft` | Create draft | ✅ |
| `PUT` | `/api/certificates/:id/submit` | Submit for review | ✅ |
| `PUT` | `/api/certificates/:id/approve` | Approve | ✅ |
| `PUT` | `/api/certificates/:id/sign` | Sign | ✅ |
| `PUT` | `/api/certificates/:id/issue` | Issue | ✅ |
| `PUT` | `/api/certificates/:id/revoke` | Revoke | ✅ |

### 🤖 AI Fraud Detection
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/ai/analyze` | Analyze single credential | ✅ |
| `POST` | `/api/ai/analyze/batch` | Batch analysis (up to 100) | ✅ |
| `GET` | `/api/ai/stats` | 30-day fraud statistics | ✅ |
| `GET` | `/api/ai/logs` | Fraud analysis logs | ✅ |
| `GET` | `/api/ai/report` | Date-range fraud report | ✅ |
| `GET` | `/api/ai/systemic/:orgId` | Systemic fraud detection | ✅ |
| `PATCH` | `/api/ai/logs/:id/override` | Human override | ✅ |

### 🛡️ Zero-Knowledge
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/zk/groups/:groupId` | Get Semaphore group | ✅ |
| `POST` | `/api/zk/verify` | Verify ZK proof | ❌ |
| `GET` | `/api/zk/nullifiers/:hash` | Check nullifier | ✅ |

### 🔗 Sharing & Verification
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/shares/create` | Create share link | ✅ |
| `GET` | `/api/verify/:token` | Public verification | ❌ |

---

## ⚖️ Credora vs Alternatives

| Feature | 🔐 Credora | 📱 DigiLocker | 📝 Manual Verification |
|---|---|---|---|
| **Verification Time** | Instant (< 2 sec) | Minutes to hours | Days to weeks |
| **Tamper-Proof** | ✅ Fabric ledger | Partially | ❌ |
| **Privacy** | ✅ ZK proofs (zero PII) | ❌ Full data exposed | ❌ Full data exposed |
| **Fraud Detection** | ✅ AI-powered (pre-issuance) | ❌ None | ❌ Manual review |
| **Decentralized** | ✅ 3-org permissioned network | ❌ Centralized (NIC) | ❌ Single authority |
| **Multi-Org Workflow** | ✅ Role-based (5 roles) | ❌ Single issuer | ❌ Single issuer |
| **Audit Trail** | ✅ Immutable on-chain | Partial | ❌ Paper-based |
| **Offline Verify** | ✅ QR code + hash | ❌ Internet required | ❌ Not possible |
| **International** | ✅ W3C VC standard | ❌ India only | ❌ Country-specific |
| **Open Source** | ✅ MIT License | ❌ Proprietary | N/A |
| **Cost per Verify** | Free (no gas) | Free | ₹50–500+ per document |

---

## 🔒 Security

| Layer | Measure | Implementation |
|---|---|---|
| **Network** | TLS 1.3 | All peer-to-peer Fabric communication encrypted |
| **Authentication** | ECDSA Signatures | MetaMask wallet-based (no passwords stored) |
| **Session** | JWT + Expiry | Short-lived tokens, secure HTTP-only |
| **Blockchain** | Permissioned Access | MSP-based identity — only enrolled nodes participate |
| **Data** | Zero PII On-chain | Names, marks, DOB never stored on Fabric ledger |
| **Privacy** | ZK Proofs | Semaphore protocol — identity never revealed in verification |
| **Fraud** | AI Pre-screening | Every credential scored before on-chain issuance |
| **Documents** | IPFS + Hashing | SHA-256 integrity verification, Pinata pinning |
| **Access Control** | RBAC | 5 roles: ADMIN, ISSUER_OFFICER, APPROVER, VERIFIER, CITIZEN |
| **Revocation** | On-chain Registry | Permanent, immutable revocation records with appeal process |
| **Replay Prevention** | Nullifier Tracking | ZK proofs can only be used once (nullifier stored on-chain) |

---

## 📜 Compliance & Regulatory Framework

| Regulation | Credora Compliance |
|---|---|
| **IT Act 2000, Section 4** | Electronic records on Fabric are legally valid digital documents |
| **DPDP Act 2023** | Zero PII stored on-chain; ZK proofs for privacy-preserving verification |
| **National eGovernance Plan** | Digital India aligned — paperless credential management |
| **DigiLocker Standards** | W3C VC interoperability; document format compatibility |
| **UGC Regulations** | Institution verification via UGC recognized database |
| **NeSDA Framework** | Modular architecture — state-replicable across India |
| **GDPR (Future)** | Right to erasure compatible — PII stored off-chain only |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MetaMask browser extension
- MongoDB Atlas account (or local MongoDB)
- Pinata API keys (for IPFS)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/0xMayurrr/credora-veripass.git
cd credora-veripass

# 2. Start Hyperledger Fabric Network
cd fabric-network
./network.sh up
# Creates 3 orgs, orderer, channel, deploys all 4 chaincodes

# 3. Start Backend
cd ../deid-core/backend
npm install
cp .env.example .env
# Edit .env → add MongoDB URI, Pinata keys, JWT secret
npm run dev
# Server starts on http://localhost:5000

# 4. Start Frontend
cd ../../veripass-wallet
npm install
npm run dev
# App starts on http://localhost:5173
```

### Environment Variables

```env
# deid-core/backend/.env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_KEY=your-pinata-secret
BLOCKCHAIN_TYPE=fabric
FABRIC_CHANNEL_NAME=credora-main-channel
```

---

## 👤 Author

<table>
  <tr>
    <td>
      <strong>Mayur P</strong><br>
      BSc Computer Technology — Blockchain & Distributed Computing<br>
      Rathinam University, Tamil Nadu<br><br>
      📧 mayurkarthick2006@gmail.com<br>
      🔗 <a href="https://github.com/0xMayurrr">github.com/0xMayurrr</a>
    </td>
  </tr>
</table>

### 🏆 Hackathon Record

| Competition | Result |
|---|---|
| **HACKTU 6.0** | 🏅 Top 5 Finalist |
| **WE Hack** | 🏅 Top 5 Finalist |
| **Hack N Win 2.0** | 🥇 Winner |
| **Build on Aptos** | 🏅 Finalist |
| **Deep Funding** | 🏅 Finalist |
| **Pivot** | 🏅 Finalist |
| **Smart India Hackathon** | 🧑‍🏫 Internal Mentor |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Built for the **Universal Credential Initiative** 💚

---

<p align="center">
  <strong>🌟 If Credora helps secure India's credentials, give it a star!</strong><br><br>
  <a href="https://github.com/0xMayurrr/credora-veripass">
    <img src="https://img.shields.io/github/stars/0xMayurrr/credora-veripass?style=social" alt="Star on GitHub">
  </a>
</p>

<p align="center">
  <sub>Made with ❤️ for India's Digital Future | Submitted to Blockchain India Challenge 2024 (MeitY)</sub>
</p>
