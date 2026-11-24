# International Voting System DApp (Sepolia Testnet)

React + Vite + Tailwind CSS + Ethers.js Frontend for the deployed `internationalvotingsystem` V4 smart contract.

## 🚀 Deployed Contract Details (Sepolia Testnet)
- **Active V4 Contract Address:** `0x5C2Dd70c4bDaC6f8604E69e89C373d6524160AcC`
- **Network:** Sepolia Testnet (Chain ID: `11155111`)
- **Verified Explorer:** [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x5C2Dd70c4bDaC6f8604E69e89C373d6524160AcC)

---

## 📁 Project Structure & Updated Files
```
F:\SolidityProjects\internationalvoting\
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── start.bat                             # One-click dev server launcher
├── README.md
├── SRS_Report_E_Voting_System.md         # Detailed Human-Written Project SRS Report
├── system_actors_permissions.jpg         # Architecture & Permissions Infographic
├── admin_extend_time_ui.png              # UI Verification: Admin Extend Time
├── verifier_antifraud_ui.png             # UI Verification: Verifier Anti-Fraud Notice
├── contracts/
│   └── InternationalVotingSystem.sol     # Latest V4 Solidity Smart Contract (16.7 KB)
└── src/
    ├── main.jsx
    ├── App.jsx                           # Complete Institutional FinTech Web3 DApp
    ├── index.css
    └── contracts/
        ├── InternationalVotingSystem.sol # V4 Solidity Smart Contract Source
        ├── internationalvotingsystem.json# Official Compiled Hardhat Artifact ABI (112 KB)
        └── contractConfig.js             # Contract Address & ABI Configuration
```

---

## ✨ Features Implemented (V4)
1. **Dynamic Election Duration Extension:** Admin can extend election duration in minutes (`extendElectionDuration`).
2. **Duplicate Voter Prevention:** Same wallet address can only register once (`!registeredvoters[_voter]`).
3. **Duplicate Candidate Prevention:** Same wallet address cannot register twice in an election (`!isCandidateRegistered`).
4. **Emergency Pause & Resume:** Admin can freeze voting countdown during emergencies and resume without lost time.
5. **Election Cancellation:** Admin can cancel an election session if needed.
6. **Decentralized EVT Token Claim:** Verified voters self-claim 1 EVT token before voting.
7. **Anti-Spam Event Deduplication:** Real-time contract events show exactly 1 notification per transaction.

---

## ⚡ How to Run
1. Open PowerShell or Command Prompt in `F:\SolidityProjects\internationalvoting`
2. Run dev server:
   ```bash
   npm run dev
   ```
   (Or simply double-click `start.bat`)
3. Open [http://localhost:3000](http://localhost:3000) in your browser.
4. Connect your MetaMask wallet and switch to **Sepolia Testnet**.
