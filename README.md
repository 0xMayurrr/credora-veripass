<div align="center">
  <img src="./veripass-wallet/public/credora-high-resolution-logo-transparent.png" alt="Credora Logo" width="200"/>

  # Credora / Veripass Wallet

  **Securely own, store, manage, and verify your life achievements and decentralized identities on the Polygon Blockchain.**

  [![Live Frontend](https://img.shields.io/badge/Netlify-Live-00C7B7?style=flat-square&logo=netlify)](https://credora-veripass.netlify.app/)
  [![Live Backend](https://img.shields.io/badge/Render-Live-000000?style=flat-square&logo=render)](https://credora-wallet-backend.onrender.com/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg?style=flat-square)](https://opensource.org/licenses/MIT)
  
</div>

---

## ⚡ The Protocol
Credora is a privacy-first, Universal Credential Wallet. We transform real-world achievements—university degrees, bootcamp certifications, and DAO contributions—into **Verifiable Credentials** bound to a permanent Decentralized Identifier (DID). 

Using **Zero-Knowledge Proofs (ZK-SNARKs)**, users safely prove their reputation across the internet without ever leaking the underlying data. Own your identity, not just your tokens.

---

## ✨ Core Features
- 🔐 **Web3 Authentication:** Secure passwordless sign-in using MetaMask signatures.
- 🆔 **Universal DID Construction:** Automatic generation of customized `did:polygon:...` identity documents based on the W3C standards.
- 📜 **Verifiable Credentials:** Immutable issuance of cryptographic credentials utilizing IPFS and hashes anchored on the Sepolia smart contracts.
- 🥷 **Zero-Knowledge Architecture:** Prove your achievements to third parties maintaining absolute privacy using ZK mechanics.
- 📇 **One-Click Shareability:** Generate instant, verifiable QR Codes or share-links for recruiters to silently cryptographically verify an applicant.
- 💻 **Dev Rep Engine (Bonus):** Natively connected to GitHub to calculate developer activity statistics and mint them as a unique on-chain credential.

---

## 🛠️ Tech Stack architecture
This project acts as a Monorepo containing specifically tuned micro-services:

### **Frontend (`/veripass-wallet`)**
- **Framework:** React / Vite (TypeScript)
- **Styling:** Tailwind CSS + Shadcn UI + Framer Motion
- **Web3 Engine:** Ethers.js v6
- **Hosting:** Netlify (Ready)

### **Backend (`/deid-core/backend`)**
- **Runtime:** Node.js / Express
- **Database:** MongoDB Atlas (Cloud)
- **Identity Protocol:** JSON Web Tokens (JWT) + Custom DID resolver
- **Hosting:** Render (Ready)

### **Blockchain Layer (`/deid-core/contracts`)**
- **Network:** Ethereum Sepolia / Polygon Amoy 
- **Language:** Solidity / Hardhat toolkit
- **Storage Layer:** IPFS via Pinata API

---

## 🚀 Quick Start (Local Development)

### 1. Clone the protocol
```bash
git clone https://github.com/0xMayurrr/credora-veripass.git
cd credora-veripass
```

### 2. Setup the Backend
Open a terminal in the backend directory and install dependencies:
```bash
cd deid-core/backend
npm install
```
Configure your `.env` variables using your MongoDB URI and private keys (Do not commit these!).
Start the express server:
```bash
npm run dev
```

### 3. Setup the Frontend
Open a new terminal in the frontend directory:
```bash
cd veripass-wallet
npm install
```
Set your `VITE_API_URL` within the `.env` to point to `http://localhost:5000/api`.
Boot up Vite:
```bash
npm run dev
```

### 4. Open Application
Navigate to `http://localhost:8080/` in a Web3-injected browser (Brave / Chrome + MetaMask).

---

## 🛡️ Security Note
This project heavily restricts environment variables from being tracked into GitHub to ensure full operational security of contract deployment keys. A custom `.gitignore` enforces strict segregation of `.env` assets.

---

<div align="center">
  <i>Built with 💚 for the Universal Credential initiative.</i>
</div>
