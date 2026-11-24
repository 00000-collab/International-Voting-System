import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import confetti from 'canvas-confetti';
import { CONTRACT_ADDRESS, CONTRACT_ABI, SEPOLIA_CHAIN_ID } from './contracts/contractConfig.js';
import {
  Vote,
  ShieldCheck,
  UserCheck,
  Award,
  Play,
  Pause,
  RotateCcw,
  Ban,
  UserPlus,
  KeyRound,
  Coins,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  LogOut,
  TrendingUp,
  Users,
  Check,
  Info,
  Radio,
  FileText,
  Timer,
  CheckCircle,
  UserX,
  Plus,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Lock,
  Flag,
  HandCoins,
  CheckSquare
} from 'lucide-react';

export default function App() {
  // Web3 State
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [readContract, setReadContract] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState('0');

  // Contract Roles & Info
  const [adminAddress, setAdminAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifier, setIsVerifier] = useState(false);
  const [isRegisteredVoter, setIsRegisteredVoter] = useState(false);

  // Elections & Candidate Data
  const [electionCount, setElectionCount] = useState(0);
  const [selectedElectionId, setSelectedElectionId] = useState(0);
  const [electionData, setElectionData] = useState(null);
  const [candidatesList, setCandidatesList] = useState([]);
  const [winnersList, setWinnersList] = useState([]);
  const [voterEvtBalance, setVoterEvtBalance] = useState(0);
  const [userHasVoted, setUserHasVoted] = useState(false);

  // Live Contract Event Logs
  const [eventLogs, setEventLogs] = useState([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('vote'); // 'vote', 'admin', 'verifier', 'events'
  const [nowTimestamp, setNowTimestamp] = useState(Math.floor(Date.now() / 1000));

  // Forms
  // Admin Election Creation
  const [newElectionName, setNewElectionName] = useState('');
  // Admin Candidate Management (Full Profile)
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateParty, setNewCandidateParty] = useState('');
  const [newCandidateAge, setNewCandidateAge] = useState('');
  const [newCandidateAddress, setNewCandidateAddress] = useState('');
  const [withdrawCandidateId, setWithdrawCandidateId] = useState('');
  // Admin Verifier Management
  const [newVerifierAddr, setNewVerifierAddr] = useState('');
  const [removeVerifierAddr, setRemoveVerifierAddr] = useState('');
  // Admin EVT manual issuance
  const [issueEvtVoterAddr, setIssueEvtVoterAddr] = useState('');
  // Admin Election Duration Extension
  const [extendMinutes, setExtendMinutes] = useState('5');
  // Verifier Portal Voter Registration
  const [voterRegAddr, setVoterRegAddr] = useState('');
  const [voterIdentityRaw, setVoterIdentityRaw] = useState('');

  // 1-second live clock update for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showNotification = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg({ type: '', text: '' });
    }, 9000);
  };

  // Setup Public Fallback Provider for instant reads
  useEffect(() => {
    try {
      const publicRpc = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
      const readOnly = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, publicRpc);
      setReadContract(readOnly);
    } catch (e) {
      console.warn("Public RPC fallback error:", e);
    }
  }, []);

  // Connect Wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      showNotification('error', 'MetaMask is not detected. Please install MetaMask to interact with E Voting System.');
      return;
    }
    try {
      setLoading(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const signer = await browserProvider.getSigner();
      const currentContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setProvider(browserProvider);
      const currentAcc = accounts[0];
      setAccount(currentAcc);
      setChainId(Number(network.chainId));
      setContract(currentContract);

      const bal = await browserProvider.getBalance(currentAcc);
      setBalance(ethers.formatEther(bal).slice(0, 6));

      // Immediate role check
      const adminAddr = await currentContract.admin();
      setAdminAddress(adminAddr);
      setIsAdmin(adminAddr.toLowerCase() === currentAcc.toLowerCase());

      const isVer = await currentContract.verifiers(currentAcc);
      setIsVerifier(Boolean(isVer));

      const isReg = await currentContract.registeredvoters(currentAcc);
      setIsRegisteredVoter(Boolean(isReg));

      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        showNotification('warning', 'Please switch your wallet network to Sepolia Testnet (Chain ID 11155111)');
      } else {
        showNotification('success', `Wallet connected: ${currentAcc.slice(0, 6)}...${currentAcc.slice(-4)}`);
      }
    } catch (err) {
      console.error(err);
      showNotification('error', err.reason || err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  // Switch to Sepolia
  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }],
        });
      }
    }
  };

  // Listen to Wallet Events
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accs) => {
        if (accs.length === 0) {
          setAccount('');
          setContract(null);
          setIsAdmin(false);
          setIsVerifier(false);
          setIsRegisteredVoter(false);
        } else {
          connectWallet();
        }
      };
      const handleChainChanged = () => window.location.reload();

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Fetch Global Contract Data
  const fetchGlobalData = useCallback(async () => {
    const activeContract = contract || readContract;
    if (!activeContract) return;

    try {
      const adminAddr = await activeContract.admin();
      setAdminAddress(adminAddr);

      const count = await activeContract.electioncount();
      const countNum = Number(count);
      setElectionCount(countNum);
      
      if (countNum > 0 && selectedElectionId === 0) {
        setSelectedElectionId(countNum);
      }

      if (account) {
        setIsAdmin(adminAddr.toLowerCase() === account.toLowerCase());
        const isVer = await activeContract.verifiers(account);
        setIsVerifier(Boolean(isVer));
        const isReg = await activeContract.registeredvoters(account);
        setIsRegisteredVoter(Boolean(isReg));
      }
    } catch (err) {
      console.error("Global data fetch error:", err);
    }
  }, [contract, readContract, account, selectedElectionId]);

  // Fetch Specific Election Details
  const fetchElectionDetails = useCallback(async (idToFetch) => {
    const activeContract = contract || readContract;
    if (!activeContract || !idToFetch || idToFetch <= 0) {
      setElectionData(null);
      setCandidatesList([]);
      setWinnersList([]);
      return;
    }

    try {
      const e = await activeContract.election(idToFetch);
      const electionName = e.name || `Election #${idToFetch}`;
      const totalCandidates = Number(e.totalcandidates);
      const activeCandidates = Number(e.activecandidates);
      const startTime = Number(e.starttime);
      const endTime = Number(e.endtime);
      const totalWinners = Number(e.totalwinners);
      const winningVotes = Number(e.winningvotes);
      const resultDeclared = Boolean(e.resultdeclared);
      const isPaused = Boolean(e.paused);
      const isCancelled = Boolean(e.cancelled);

      setElectionData({
        id: idToFetch,
        name: electionName,
        totalcandidates: totalCandidates,
        activecandidates: activeCandidates,
        starttime: startTime,
        endtime: endTime,
        totalwinners: totalWinners,
        winningvotes: winningVotes,
        resultdeclared: resultDeclared,
        paused: isPaused,
        cancelled: isCancelled
      });

      // Load Candidates (Name, Party, Age, Address, Votes, Active)
      const candArr = [];
      for (let i = 1; i <= totalCandidates; i++) {
        const c = await activeContract.candidates(idToFetch, i);
        candArr.push({
          id: i,
          name: c.name,
          party: c.party || 'Independent',
          age: Number(c.age || 0),
          candidateAddress: c.candidateAddress || '',
          votes: Number(c.votes),
          active: Boolean(c.active)
        });
      }
      setCandidatesList(candArr);

      // Load Winners if Declared
      if (resultDeclared && totalWinners > 0) {
        const winArr = [];
        for (let i = 1; i <= totalWinners; i++) {
          const candId = await activeContract.winners(idToFetch, i);
          const candDetails = candArr.find(c => c.id === Number(candId));
          winArr.push({
            candidateId: Number(candId),
            name: candDetails ? candDetails.name : `Candidate #${candId}`,
            party: candDetails ? candDetails.party : '',
            votes: candDetails ? candDetails.votes : winningVotes
          });
        }
        setWinnersList(winArr);
      } else {
        setWinnersList([]);
      }

      // Check User EVT & Voted status
      if (account) {
        const evt = await activeContract.evtbalance(idToFetch, account);
        setVoterEvtBalance(Number(evt));
        const voted = await activeContract.hasvoted(idToFetch, account);
        setUserHasVoted(Boolean(voted));
      }
    } catch (err) {
      console.error("Election details fetch error:", err);
    }
  }, [contract, readContract, account]);

  // Listen to contract live events with deduplication
  useEffect(() => {
    const activeContract = contract || readContract;
    if (!activeContract) return;

    const seenTxHashes = new Set();

    const addEventLog = (name, data, eventPayload) => {
      // Deduplicate using transaction hash and log index
      const txHash = eventPayload?.log?.transactionHash || eventPayload?.transactionHash;
      const logIdx = eventPayload?.log?.index ?? eventPayload?.index ?? '';
      const uniqueKey = txHash ? `${txHash}-${logIdx}` : `${name}-${data}-${Math.floor(Date.now() / 3000)}`;

      if (seenTxHashes.has(uniqueKey)) {
        return; // Prevent duplicate log
      }
      seenTxHashes.add(uniqueKey);

      setEventLogs(prev => {
        // Prevent duplicate text in recent items
        if (prev.length > 0 && prev[0].name === name && prev[0].data === data) {
          return prev;
        }
        return [
          {
            id: uniqueKey,
            name,
            data,
            time: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 24)
        ];
      });
    };

    try {
      activeContract.on("electioncreated", (electionid, name, event) => {
        addEventLog("electioncreated", `Election #${electionid} ("${name}") created on Sepolia`, event);
        fetchGlobalData();
      });

      activeContract.on("electionstart", (electionid, endtime, event) => {
        addEventLog("electionstart", `Election #${electionid} voting opened! Closes at: ${new Date(Number(endtime) * 1000).toLocaleTimeString()}`, event);
        fetchElectionDetails(Number(electionid));
      });

      activeContract.on("electionpaused", (electionid, event) => {
        addEventLog("electionpaused", `Election #${electionid} has been paused by administrator`, event);
        fetchElectionDetails(Number(electionid));
      });

      activeContract.on("electionresumed", (electionid, newEndtime, event) => {
        addEventLog("electionresumed", `Election #${electionid} resumed! New end time: ${new Date(Number(newEndtime) * 1000).toLocaleTimeString()}`, event);
        fetchElectionDetails(Number(electionid));
      });

      activeContract.on("electioncancelled", (electionid, event) => {
        addEventLog("electioncancelled", `Election #${electionid} has been permanently cancelled by admin`, event);
        fetchElectionDetails(Number(electionid));
      });

      activeContract.on("electionextended", (electionid, additionalMinutes, newEndtime, event) => {
        addEventLog("electionextended", `Election #${electionid} duration extended by ${additionalMinutes} mins! New end time: ${new Date(Number(newEndtime) * 1000).toLocaleTimeString()}`, event);
        fetchElectionDetails(Number(electionid));
      });

      activeContract.on("candidateadded", (electionid, candidateid, name, party, age, candidateAddress, event) => {
        addEventLog("candidateadded", `Candidate #${candidateid} (${name} - ${party}) added to Election #${electionid}`, event);
        fetchElectionDetails(Number(electionid));
      });

      activeContract.on("candidatewithdraw", (electionid, candidateid, event) => {
        addEventLog("candidatewithdraw", `Candidate #${candidateid} withdrawn from Election #${electionid}`, event);
        fetchElectionDetails(Number(electionid));
      });

      activeContract.on("voterregistered", (voter, hashidentity, event) => {
        addEventLog("voterregistered", `Voter registered: ${voter.slice(0, 6)}...${voter.slice(-4)}`, event);
        fetchGlobalData();
      });

      activeContract.on("evtissued", (electionid, voter, event) => {
        addEventLog("evtissued", `1 EVT voting token issued to ${voter.slice(0, 6)}...${voter.slice(-4)}`, event);
        fetchElectionDetails(Number(electionid));
      });

      activeContract.on("votecasted", (electionid, voter, candidateid, event) => {
        addEventLog("votecasted", `Ballot cast for Candidate #${candidateid} by ${voter.slice(0, 6)}...${voter.slice(-4)}`, event);
        fetchElectionDetails(Number(electionid));
      });

      activeContract.on("declaredwinner", (electionid, totalwinners, event) => {
        addEventLog("declaredwinner", `Final winner declared for Election #${electionid}! Total Winners: ${totalwinners}`, event);
        fetchElectionDetails(Number(electionid));
      });

      return () => {
        activeContract.removeAllListeners();
      };
    } catch (err) {
      console.warn("Event listener error:", err);
    }
  }, [contract, readContract, fetchGlobalData, fetchElectionDetails]);

  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  useEffect(() => {
    if (selectedElectionId > 0) {
      fetchElectionDetails(selectedElectionId);
    }
  }, [selectedElectionId, fetchElectionDetails]);

  // Transaction Handler with Gas Check & Safe Execution
  const handleTx = async (actionName, txPromise, onSuccessCallback) => {
    if (!contract) {
      showNotification('error', 'Please connect your MetaMask wallet first.');
      return;
    }
    try {
      setActionLoading(actionName);
      const tx = await txPromise;
      showNotification('info', `Transaction dispatched (${tx.hash.slice(0, 10)}...). Awaiting blockchain confirmation...`);
      const receipt = await tx.wait();
      showNotification('success', `${actionName} confirmed in block #${receipt.blockNumber}!`);
      if (onSuccessCallback) onSuccessCallback();
      await fetchGlobalData();
      if (selectedElectionId > 0) await fetchElectionDetails(selectedElectionId);
    } catch (err) {
      console.error(err);
      let reason = 'Transaction reverted or rejected.';
      if (err.reason) reason = err.reason;
      else if (err.data?.message) reason = err.data.message;
      else if (err.message) {
        if (err.message.includes("insufficient funds")) reason = "Insufficient SepoliaETH balance to pay for gas.";
        else if (err.message.includes("user rejected action") || err.message.includes("ACTION_REJECTED")) reason = "Transaction rejected in MetaMask.";
        else reason = err.message;
      }
      showNotification('error', `Transaction Failed: ${reason}`);
    } finally {
      setActionLoading('');
    }
  };

  // ADMIN ACTIONS
  const handleAddVerifier = () => {
    if (!newVerifierAddr || !ethers.isAddress(newVerifierAddr)) return showNotification('error', 'Please enter a valid Ethereum address for the verifier.');
    handleTx('Authorize Verifier', contract.addverifier(newVerifierAddr), () => setNewVerifierAddr(''));
  };

  const handleRemoveVerifier = () => {
    if (!removeVerifierAddr || !ethers.isAddress(removeVerifierAddr)) return showNotification('error', 'Please enter a valid Ethereum address.');
    handleTx('Revoke Verifier', contract.removeverifier(removeVerifierAddr), () => setRemoveVerifierAddr(''));
  };

  const handleCreateElection = () => {
    if (!newElectionName.trim()) return showNotification('error', 'Please enter an Election Name (e.g. Presidential Election 2026)');
    handleTx(
      'Create Election Session',
      contract.createelcetionWithDetails(newElectionName.trim()),
      async () => {
        setNewElectionName('');
        const count = await contract.electioncount();
        setSelectedElectionId(Number(count));
      }
    );
  };

  const handleAddCandidate = async () => {
    if (selectedElectionId <= 0) return showNotification('error', 'Please select or create an election first.');
    if (!newCandidateName.trim()) return showNotification('error', 'Candidate name is required.');
    if (!newCandidateParty.trim()) return showNotification('error', 'Political party name is required.');
    const ageNum = parseInt(newCandidateAge);
    if (!ageNum || ageNum < 18) return showNotification('error', 'Candidate must be at least 18 years old.');
    if (!newCandidateAddress || !ethers.isAddress(newCandidateAddress)) {
      return showNotification('error', 'Please enter a valid candidate Ethereum wallet address.');
    }

    // PRE-CHECK: Prevent duplicate candidate registration on same address
    try {
      const isAlreadyCand = await contract.isCandidateRegistered(selectedElectionId, newCandidateAddress);
      if (isAlreadyCand) {
        return showNotification('error', 'Duplicate Blocked: This wallet address is ALREADY registered as a candidate in this election!');
      }
    } catch (e) {
      console.warn("Could not pre-check candidate address:", e);
    }

    handleTx(
      'Register Candidate',
      contract.addcandidateWithDetails(
        selectedElectionId,
        newCandidateName.trim(),
        newCandidateParty.trim(),
        ageNum,
        newCandidateAddress
      ),
      () => {
        setNewCandidateName('');
        setNewCandidateParty('');
        setNewCandidateAge('');
        setNewCandidateAddress('');
      }
    );
  };

  const handleWithdrawCandidate = () => {
    const id = parseInt(withdrawCandidateId);
    if (!id || id <= 0) return showNotification('error', 'Please enter a valid numeric candidate ID.');
    handleTx('Withdraw Candidate', contract.withdrawcandidate(selectedElectionId, id), () => setWithdrawCandidateId(''));
  };

  const handleIssueEvt = () => {
    if (selectedElectionId <= 0) return showNotification('error', 'Please select an election session first.');
    if (!issueEvtVoterAddr || !ethers.isAddress(issueEvtVoterAddr)) return showNotification('error', 'Please enter a valid voter wallet address.');
    handleTx('Issue EVT Ballot Token', contract.issuevoterevt(selectedElectionId, issueEvtVoterAddr), () => setIssueEvtVoterAddr(''));
  };

  const handleStartElection = () => {
    if (selectedElectionId <= 0) return showNotification('error', 'Please select an election session first.');
    handleTx('Start Official 10-Minute Election', contract.startelection(selectedElectionId));
  };

  // NEW: Pause Election
  const handlePauseElection = () => {
    if (selectedElectionId <= 0) return showNotification('error', 'Please select an active election first.');
    handleTx('Pause Election Voting', contract.pauseelection(selectedElectionId));
  };

  // NEW: Resume Election
  const handleResumeElection = () => {
    if (selectedElectionId <= 0) return showNotification('error', 'Please select a paused election first.');
    handleTx('Resume Election Voting', contract.resumeelection(selectedElectionId));
  };

  // NEW: Cancel Election
  const handleCancelElection = () => {
    if (selectedElectionId <= 0) return showNotification('error', 'Please select an election session first.');
    if (!window.confirm("Are you sure you want to cancel this election? This action cannot be reversed.")) return;
    handleTx('Cancel Election Session', contract.cancelelection(selectedElectionId));
  };

  // NEW: Extend Election Duration (in minutes) by Admin
  const handleExtendElection = () => {
    if (selectedElectionId <= 0) return showNotification('error', 'Please select an election session first.');
    const mins = parseInt(extendMinutes, 10);
    if (!mins || mins <= 0 || mins > 1440) return showNotification('error', 'Please enter valid extension minutes (between 1 and 1440).');
    handleTx(`Extend Election by ${mins} Minutes`, contract.extendElectionDuration(selectedElectionId, mins), () => {
      setExtendMinutes('5');
    });
  };

  const handleCalculateWinner = () => {
    if (selectedElectionId <= 0) return showNotification('error', 'Please select an election session first.');
    handleTx('Calculate & Certify Winner', contract.calculateWinner(selectedElectionId), () => {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    });
  };

  // DECENTRALIZED VOTER ACTIONS
  // 1. Self-Claim EVT Token
  const handleClaimEvt = () => {
    if (selectedElectionId <= 0) return showNotification('error', 'No election session selected.');
    if (!isRegisteredVoter) return showNotification('error', 'You must be verified by an authorized verifier before claiming an EVT token.');
    handleTx('Claim EVT Voting Token', contract.claimEVT(selectedElectionId));
  };

  // 2. Cast Ballot
  const handleVote = (candidateId) => {
    if (selectedElectionId <= 0) return showNotification('error', 'No active election selected.');
    handleTx(`Cast Ballot for Candidate #${candidateId}`, contract.vote(selectedElectionId, candidateId), () => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    });
  };

  // VERIFIER ACTION: Register & Verify Citizen
  const handleRegisterVoter = async () => {
    if (!isVerifier) {
      return showNotification('error', 'Unauthorized: Only an authorized verifier can register citizens. Ask Admin to add your wallet address in Verifier Management.');
    }
    if (!voterRegAddr || !ethers.isAddress(voterRegAddr)) return showNotification('error', 'Please enter a valid voter wallet address.');
    if (!voterIdentityRaw.trim()) return showNotification('error', 'Voter National ID or Identity string is required.');

    // PRE-CHECK: Prevent duplicate voter wallet address registration
    try {
      const alreadyRegistered = await contract.registeredvoters(voterRegAddr);
      if (alreadyRegistered) {
        return showNotification('error', 'Fraud Prevention: This wallet address is ALREADY registered as a voter! Same address cannot be registered twice.');
      }
    } catch (e) {
      console.warn("Could not pre-check voter status:", e);
    }

    let hashIdentity;
    if (voterIdentityRaw.startsWith('0x') && voterIdentityRaw.length === 66) {
      hashIdentity = voterIdentityRaw;
    } else {
      hashIdentity = ethers.keccak256(ethers.toUtf8Bytes(voterIdentityRaw.trim()));
    }

    handleTx('Register & Cryptographically Verify Voter', contract.Registeredvoter(voterRegAddr, hashIdentity), () => {
      setVoterRegAddr('');
      setVoterIdentityRaw('');
    });
  };

  // Election Timers & Progress Calculations
  const isStarted = electionData && electionData.starttime > 0;
  const isEnded = electionData && electionData.endtime > 0 && nowTimestamp >= electionData.endtime;
  const isPaused = electionData && electionData.paused;
  const isCancelled = electionData && electionData.cancelled;
  const isRunning = isStarted && !isEnded && !isPaused && !isCancelled;
  const totalDuration = 600; // 10 minutes (600 seconds)
  const timeRemaining = electionData && isRunning ? Math.max(0, electionData.endtime - nowTimestamp) : 0;
  const minutesLeft = Math.floor(timeRemaining / 60);
  const secondsLeft = timeRemaining % 60;
  
  // Progress Ring
  const ringRadius = 22;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressPercent = isRunning ? (timeRemaining / totalDuration) : isEnded ? 0 : 1;
  const strokeDashoffset = ringCircumference - (progressPercent * ringCircumference);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      
      {/* PROFESSIONAL INSTITUTIONAL HEADER */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 flex items-center justify-center shadow-sm">
              <Vote className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  International E-Voting System
                </h1>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  V4 (Timer Extension & Anti-Fraud)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Contract: <span className="text-emerald-700 font-semibold">{CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}</span> (Sepolia)
              </p>
            </div>
          </div>

          {/* Wallet Section */}
          <div className="flex items-center space-x-3">
            {chainId && chainId !== SEPOLIA_CHAIN_ID && (
              <button
                onClick={switchToSepolia}
                className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold flex items-center space-x-1.5 hover:bg-amber-100 shadow-sm transition cursor-pointer"
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Switch to Sepolia</span>
              </button>
            )}

            {account ? (
              <div className="flex items-center space-x-3 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <div className="flex flex-col text-right">
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700">
                    {balance} ETH
                  </span>
                </div>
                <button
                  onClick={() => { setAccount(''); setContract(null); }}
                  title="Disconnect Wallet"
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="btn-primary px-5 py-2.5 rounded-xl text-sm shadow-sm flex items-center space-x-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4 stroke-[2.2]" />}
                <span>Connect MetaMask</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {statusMsg.text && (
        <div className="max-w-7xl mx-auto px-4 w-full mt-4">
          <div
            className={`p-4 rounded-xl border flex items-center space-x-3 shadow-sm transition-all ${
              statusMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : statusMsg.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {statusMsg.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            )}
            <span className="text-sm font-semibold">{statusMsg.text}</span>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* EXECUTIVE METRICS DECK */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Your Role */}
          <div className="gov-card p-5">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Your Verification Status</span>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {!account ? (
                <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                  Connect Wallet First
                </span>
              ) : (
                <>
                  {isAdmin && (
                    <span className="px-3 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-800 border border-purple-200 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin (Deployer)</span>
                    </span>
                  )}
                  {isVerifier && (
                    <span className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Authorized Verifier</span>
                    </span>
                  )}
                  {isRegisteredVoter ? (
                    <span className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Verified Voter</span>
                    </span>
                  ) : !isAdmin && !isVerifier ? (
                    <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                      Unregistered Voter
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Card 2: Total Elections */}
          <div className="gov-card p-5 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <TrendingUp className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Total Elections</p>
              <p className="text-2xl font-extrabold text-slate-900">{electionCount}</p>
            </div>
          </div>

          {/* Card 3: EVT Token Balance */}
          <div className="gov-card p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">EVT Ballot Token</p>
                <p className="text-2xl font-extrabold text-emerald-700">
                  {voterEvtBalance} <span className="text-xs text-slate-500 font-normal">Token</span>
                </p>
              </div>
            </div>

            {/* DECENTRALIZED CLAIM BUTTON */}
            {account && isRegisteredVoter && voterEvtBalance === 0 && !userHasVoted && selectedElectionId > 0 && electionData && electionData.starttime === 0 && !electionData.cancelled && (
              <button
                onClick={handleClaimEvt}
                disabled={actionLoading.length > 0}
                className="px-3 py-1.5 btn-primary text-xs rounded-lg flex items-center space-x-1 shadow-sm"
                title="Decentralized self-claim your ballot token"
              >
                <HandCoins className="w-3.5 h-3.5" />
                <span>Claim EVT</span>
              </button>
            )}
          </div>

          {/* Card 4: Has Voted */}
          <div className="gov-card p-5 flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              userHasVoted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Voting Status</p>
              <p className="text-base font-bold">
                {userHasVoted ? (
                  <span className="text-emerald-700">Ballot Casted</span>
                ) : (
                  <span className="text-slate-600">Eligible to Vote</span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ELECTION SELECTOR & 10-MINUTE TIMER CONTROL BAR */}
        <section className="gov-card p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="election-select" className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Active Election Session
              </label>
              <select
                id="election-select"
                aria-label="Select Election"
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(Number(e.target.value))}
                className="gov-input font-bold"
              >
                {electionCount === 0 ? (
                  <option value={0}>No Elections Created Yet</option>
                ) : (
                  Array.from({ length: electionCount }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      Election #{num} {selectedElectionId === num && electionData ? `— ${electionData.name}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={() => {
                fetchGlobalData();
                if (selectedElectionId > 0) fetchElectionDetails(selectedElectionId);
              }}
              title="Refresh Contract State"
              className="p-2.5 mt-5 rounded-xl btn-secondary text-slate-600 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* High-Precision 10-Minute Timer with Circular Progress Ring */}
          {electionCount > 0 && electionData ? (
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Election Name Badge */}
              <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">Election Title</span>
                <span className="text-sm font-extrabold text-slate-900">{electionData.name}</span>
              </div>

              {/* Status Alert Badge */}
              {isCancelled ? (
                <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs flex items-center space-x-1.5">
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>Election Cancelled</span>
                </div>
              ) : isPaused ? (
                <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs flex items-center space-x-1.5">
                  <Pause className="w-4 h-4 text-amber-600" />
                  <span>Voting Temporarily Paused</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm">
                  <div className="relative w-11 h-11 flex items-center justify-center">
                    <svg className="w-11 h-11">
                      <circle
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="transparent"
                        r={ringRadius}
                        cx="22"
                        cy="22"
                      />
                      <circle
                        className={isRunning ? "text-emerald-500 progress-ring__circle" : isEnded ? "text-rose-500 progress-ring__circle" : "text-amber-400 progress-ring__circle"}
                        strokeWidth="3.5"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={ringRadius}
                        cx="22"
                        cy="22"
                      />
                    </svg>
                    <Timer className={`w-4 h-4 absolute ${isRunning ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">10-Min Window</span>
                    <div className="text-sm font-bold text-slate-800">
                      {electionData.resultdeclared ? (
                        <span className="text-purple-700 font-extrabold">Results Certified</span>
                      ) : isEnded ? (
                        <span className="text-rose-600 font-extrabold">Voting Closed</span>
                      ) : isRunning ? (
                        <span className="text-emerald-700 font-mono font-bold text-base">
                          {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Ready to Start (10m)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Candidates Ratio */}
              <div className="flex items-center space-x-2.5 bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-sm text-sm">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-700">
                  Active: <strong className="text-slate-900">{electionData.activecandidates}</strong> / {electionData.totalcandidates}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl font-medium">
              Sepolia contract initialized. Admin can create <strong>Election #1</strong> with custom title.
            </div>
          )}
        </section>

        {/* NAVIGATION TABS */}
        <div className="border-b border-slate-200 flex space-x-8 text-sm font-bold">
          <button
            onClick={() => setActiveTab('vote')}
            className={`pb-3.5 px-1 border-b-2 flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'vote'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Voting & Candidates</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`pb-3.5 px-1 border-b-2 flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'admin'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Control Panel {isAdmin && '(Owner)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('verifier')}
            className={`pb-3.5 px-1 border-b-2 flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'verifier'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Verifier Portal {isVerifier && '(Authorized)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3.5 px-1 border-b-2 flex items-center space-x-2 transition cursor-pointer ${
              activeTab === 'events'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Live Contract Events</span>
          </button>
        </div>

        {/* TAB 1: VOTING & CANDIDATES */}
        {activeTab === 'vote' && (
          <div className="space-y-8">
            
            {/* CANCELLED NOTICE */}
            {electionData && electionData.cancelled && (
              <div className="p-6 bg-rose-50 border border-rose-300 rounded-2xl flex items-center space-x-3 text-rose-900">
                <Ban className="w-6 h-6 text-rose-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-base">Election Cancelled</h4>
                  <p className="text-xs text-rose-700">This election session has been officially cancelled by the election administrator. Voting is permanently disabled.</p>
                </div>
              </div>
            )}

            {/* PAUSED NOTICE */}
            {electionData && electionData.paused && !electionData.cancelled && (
              <div className="p-6 bg-amber-50 border border-amber-300 rounded-2xl flex items-center space-x-3 text-amber-900">
                <Pause className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-base">Election Temporarily Paused</h4>
                  <p className="text-xs text-amber-700">The administrator has paused active voting. The timer is currently held and will resume when administrator unpauses.</p>
                </div>
              </div>
            )}

            {/* OFFICIAL WINNERS PODIUM (When Result Declared) */}
            {electionData && electionData.resultdeclared && (
              <div className="p-8 bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl shadow-md text-white">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Official Election Winner(s) — {electionData.name}</h3>
                    <p className="text-xs text-emerald-100">
                      Result certified with <strong className="text-amber-300">{electionData.winningvotes} votes</strong> across {electionData.totalwinners} certified winner(s).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {winnersList.map((win, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-300">
                          🏆 Certified Winner #{idx + 1}
                        </span>
                        <h4 className="text-lg font-black text-white mt-1">{win.name}</h4>
                        <span className="text-xs text-emerald-200 block font-semibold">{win.party}</span>
                        <span className="text-[11px] text-slate-300">Candidate ID: {win.candidateId}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-white">{win.votes}</span>
                        <span className="text-xs block text-emerald-200 font-semibold">Votes</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CANDIDATES GRID */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {electionCount > 0 ? `Candidates for ${electionData?.name || `Election #${selectedElectionId}`}` : 'Candidates Roster'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Strict On-Chain Rule: 1 Verified Voter = 1 EVT Ballot Token = 1 Vote (Token is burned upon vote submission)
                  </p>
                </div>

                {/* SELF-CLAIM EVT TOKEN CALLOUT (Decentralized) */}
                {account && isRegisteredVoter && voterEvtBalance === 0 && !userHasVoted && selectedElectionId > 0 && electionData && electionData.starttime === 0 && !electionData.cancelled && (
                  <button
                    onClick={handleClaimEvt}
                    disabled={actionLoading.length > 0}
                    className="px-4 py-2 btn-primary text-xs rounded-xl flex items-center space-x-1.5 shadow-sm"
                  >
                    <HandCoins className="w-4 h-4" />
                    <span>Self-Claim Your EVT Token</span>
                  </button>
                )}
              </div>

              {electionCount === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                    <Vote className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">No Election Created On Sepolia Yet</h4>
                  <p className="text-slate-500 text-xs max-w-md mx-auto mt-1">
                    Connect as Admin to create Election #1 with custom title and candidate profiles.
                  </p>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="mt-4 px-5 py-2.5 btn-primary text-xs rounded-xl shadow-sm transition inline-flex items-center space-x-2"
                  >
                    <span>Go to Admin Control Panel</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : candidatesList.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 font-bold text-sm">No candidates registered for {electionData?.name || `Election #${selectedElectionId}`} yet.</p>
                  {isAdmin && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="mt-2 text-xs text-emerald-700 font-bold hover:underline inline-flex items-center space-x-1"
                    >
                      <span>Add candidates from Admin Panel</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {candidatesList.map((cand) => (
                    <div
                      key={cand.id}
                      className={`gov-card p-6 ${
                        !cand.active ? 'opacity-60 bg-slate-50' : 'bg-white'
                      }`}
                    >
                      {/* Candidate Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              #{cand.id}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                              <Flag className="w-3 h-3" />
                              <span>{cand.party}</span>
                            </span>
                          </div>
                          <h4 className="text-xl font-bold text-slate-900 mt-2.5">{cand.name}</h4>
                          <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                            <span>Age: <strong className="text-slate-700">{cand.age} yrs</strong></span>
                            {cand.candidateAddress && (
                              <span className="font-mono text-[11px] text-slate-400">
                                {cand.candidateAddress.slice(0, 6)}...{cand.candidateAddress.slice(-4)}
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                            cand.active
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {cand.active ? 'Active' : 'Withdrawn'}
                        </span>
                      </div>

                      {/* Vote Count & Action Button */}
                      <div className="mt-6 flex items-baseline justify-between border-t border-slate-100 pt-4">
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Ballots Cast</span>
                          <span className="text-3xl font-extrabold text-slate-900">{cand.votes}</span>
                        </div>

                        <button
                          onClick={() => handleVote(cand.id)}
                          disabled={
                            !cand.active ||
                            !isRunning ||
                            voterEvtBalance === 0 ||
                            userHasVoted ||
                            actionLoading.length > 0
                          }
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 ${
                            cand.active && isRunning && voterEvtBalance > 0 && !userHasVoted
                              ? 'btn-primary cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          }`}
                        >
                          {actionLoading === `Cast Ballot for Candidate #${cand.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Vote className="w-4 h-4" />
                          )}
                          <span>
                            {userHasVoted
                              ? 'Already Voted'
                              : voterEvtBalance === 0
                              ? 'No EVT Token'
                              : isPaused
                              ? 'Voting Paused'
                              : isCancelled
                              ? 'Cancelled'
                              : !isRunning
                              ? 'Voting Closed'
                              : `Vote for ${cand.party}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ADMIN CONTROL PANEL */}
        {activeTab === 'admin' && (
          <div className="space-y-8">
            <div className="gov-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
              <span className="text-slate-500 font-semibold">Admin Address (Contract Deployer):</span>
              <span className="text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 break-all">
                {adminAddress || 'Loading from Sepolia...'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 1. Election Lifecycle (Includes Start, Pause, Resume, Cancel, Winner) */}
              <div className="gov-card p-6 space-y-5">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                  <Play className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-bold text-base text-slate-900">1. Election Lifecycle & Controls</h3>
                </div>

                <div className="space-y-3.5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Create New Election</h4>
                      <p className="text-xs text-slate-500">Provide an official title for the election session</p>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. National General Election 2026"
                        value={newElectionName}
                        onChange={(e) => setNewElectionName(e.target.value)}
                        className="flex-1 gov-input text-xs"
                      />
                      <button
                        onClick={handleCreateElection}
                        disabled={actionLoading === 'Create Election Session' || !isAdmin}
                        className="px-4 py-2 btn-primary text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
                      >
                        {actionLoading === 'Create Election Session' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Start Election */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Start Selected Election</h4>
                      <p className="text-xs text-slate-500">Locks in candidates & opens 10-minute voting</p>
                    </div>
                    <button
                      onClick={handleStartElection}
                      disabled={
                        !isAdmin ||
                        !electionData ||
                        electionData.starttime > 0 ||
                        electionData.cancelled ||
                        electionData.activecandidates === 0 ||
                        actionLoading.length > 0
                      }
                      className="px-4 py-2.5 btn-primary text-xs rounded-xl transition flex items-center space-x-1.5"
                    >
                      {actionLoading === 'Start Official 10-Minute Election' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white" />
                      )}
                      <span>Start 10 Min Voting</span>
                    </button>
                  </div>

                  {/* Pause & Resume Controls */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Pause / Resume Election</h4>
                      <p className="text-xs text-slate-500">Hold voting timer and resume without losing remaining time</p>
                    </div>
                    <div className="flex space-x-2">
                      {!electionData?.paused ? (
                        <button
                          onClick={handlePauseElection}
                          disabled={
                            !isAdmin ||
                            !electionData ||
                            electionData.starttime === 0 ||
                            electionData.cancelled ||
                            isEnded ||
                            actionLoading.length > 0
                          }
                          className="px-3.5 py-2 btn-secondary text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer text-amber-700 border-amber-300"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleResumeElection}
                          disabled={!isAdmin || actionLoading.length > 0}
                          className="px-3.5 py-2 btn-primary text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Resume</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cancel Election Control */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Cancel Election</h4>
                      <p className="text-xs text-slate-500">Permanently terminate an active or created election session</p>
                    </div>
                    <button
                      onClick={handleCancelElection}
                      disabled={
                        !isAdmin ||
                        !electionData ||
                        electionData.cancelled ||
                        electionData.resultdeclared ||
                        actionLoading.length > 0
                      }
                      className="px-4 py-2 btn-danger text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel Election</span>
                    </button>
                  </div>

                  {/* Extend Election Duration */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>Extend Election Duration</span>
                      </h4>
                      <p className="text-xs text-slate-500">Admin can dynamically add extra voting time in minutes</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          placeholder="Mins (e.g. 5)"
                          value={extendMinutes}
                          onChange={(e) => setExtendMinutes(e.target.value)}
                          className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                        <span className="absolute right-2 top-2 text-[11px] text-slate-400 font-medium pointer-events-none">min</span>
                      </div>
                      <button
                        onClick={handleExtendElection}
                        disabled={
                          !isAdmin ||
                          !electionData ||
                          electionData.starttime === 0 ||
                          electionData.cancelled ||
                          electionData.resultdeclared ||
                          actionLoading.length > 0
                        }
                        className="px-3.5 py-2 btn-secondary text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                      >
                        {actionLoading.includes('Extend Election') ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>Extend Time</span>
                      </button>
                    </div>
                  </div>

                  {/* Calculate Winner */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Calculate & Declare Winner</h4>
                      <p className="text-xs text-slate-500">Available after 10-minute timer expires</p>
                    </div>
                    <button
                      onClick={handleCalculateWinner}
                      disabled={
                        !electionData ||
                        !isEnded ||
                        electionData.paused ||
                        electionData.cancelled ||
                        electionData.resultdeclared ||
                        actionLoading.length > 0
                      }
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
                        electionData && isEnded && !electionData.paused && !electionData.cancelled && !electionData.resultdeclared
                          ? 'btn-primary'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {actionLoading === 'Calculate & Certify Winner' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Award className="w-3.5 h-3.5" />
                      )}
                      <span>Calculate Winner</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Candidate Management (Full Profile & Duplicate Address Protection) */}
              <div className="gov-card p-6 space-y-5">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                  <UserPlus className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-bold text-base text-slate-900">2. Candidate Management</h3>
                </div>

                <div className="space-y-3.5">
                  <p className="text-xs text-slate-500">
                    Register candidate for <strong>{electionData?.name || `Election #${selectedElectionId}`}</strong>. Duplicate candidate wallet addresses are strictly blocked by smart contract.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Candidate Full Name"
                      value={newCandidateName}
                      onChange={(e) => setNewCandidateName(e.target.value)}
                      className="gov-input text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Political Party Name"
                      value={newCandidateParty}
                      onChange={(e) => setNewCandidateParty(e.target.value)}
                      className="gov-input text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Age (≥ 18)"
                      value={newCandidateAge}
                      onChange={(e) => setNewCandidateAge(e.target.value)}
                      className="gov-input text-xs col-span-1"
                    />
                    <input
                      type="text"
                      placeholder="Candidate Wallet Address (0x...)"
                      value={newCandidateAddress}
                      onChange={(e) => setNewCandidateAddress(e.target.value)}
                      className="gov-input font-mono text-xs col-span-2"
                    />
                  </div>

                  <button
                    onClick={handleAddCandidate}
                    disabled={actionLoading.length > 0 || electionCount === 0 || !isAdmin || (electionData && electionData.starttime > 0) || electionData?.cancelled}
                    className="w-full py-2.5 btn-primary text-xs rounded-xl flex items-center justify-center space-x-1.5"
                  >
                    {actionLoading === 'Register Candidate' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Register Candidate on Blockchain</span>
                  </button>

                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Withdraw Candidate
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Candidate ID (e.g. 1)"
                        value={withdrawCandidateId}
                        onChange={(e) => setWithdrawCandidateId(e.target.value)}
                        className="flex-1 gov-input font-medium text-xs"
                      />
                      <button
                        onClick={handleWithdrawCandidate}
                        disabled={actionLoading.length > 0 || electionCount === 0 || !isAdmin || electionData?.cancelled}
                        className="px-4 py-2 btn-danger text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer"
                      >
                        {actionLoading === 'Withdraw Candidate' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserX className="w-3.5 h-3.5" />
                        )}
                        <span>Withdraw</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Verifier Management */}
              <div className="gov-card p-6 space-y-5">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-bold text-base text-slate-900">3. Verifier Management</h3>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Authorized verifiers are granted rights to verify voter identities. Only authorized verifiers can register citizens.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Authorize Verifier Address
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="0x..."
                        value={newVerifierAddr}
                        onChange={(e) => setNewVerifierAddr(e.target.value)}
                        className="flex-1 gov-input font-mono text-xs"
                      />
                      <button
                        onClick={handleAddVerifier}
                        disabled={actionLoading.length > 0 || !isAdmin}
                        className="px-4 py-2.5 btn-primary text-xs rounded-xl flex items-center space-x-1.5"
                      >
                        {actionLoading === 'Authorize Verifier' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        <span>Authorize</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Revoke Verifier Access
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="0x..."
                        value={removeVerifierAddr}
                        onChange={(e) => setRemoveVerifierAddr(e.target.value)}
                        className="flex-1 gov-input font-mono text-xs"
                      />
                      <button
                        onClick={handleRemoveVerifier}
                        disabled={actionLoading.length > 0 || !isAdmin}
                        className="px-4 py-2.5 btn-danger text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer"
                      >
                        {actionLoading === 'Revoke Verifier' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserX className="w-3.5 h-3.5" />
                        )}
                        <span>Revoke</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Issue EVT Token */}
              <div className="gov-card p-6 space-y-5">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                  <Coins className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-bold text-base text-slate-900">4. Issue EVT Voting Token</h3>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Gives 1 EVT token to a verified registered voter for <strong>{electionData?.name || `Election #${selectedElectionId}`}</strong> before the election starts.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Registered Voter Address
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="0x..."
                        value={issueEvtVoterAddr}
                        onChange={(e) => setIssueEvtVoterAddr(e.target.value)}
                        className="flex-1 gov-input font-mono text-xs"
                      />
                      <button
                        onClick={handleIssueEvt}
                        disabled={actionLoading.length > 0 || electionCount === 0 || !isAdmin || (electionData && electionData.starttime > 0) || electionData?.cancelled}
                        className="px-4 py-2.5 btn-primary text-xs rounded-xl flex items-center space-x-1.5"
                      >
                        {actionLoading === 'Issue EVT Ballot Token' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Coins className="w-3.5 h-3.5" />
                        )}
                        <span>Issue 1 EVT</span>
                      </button>
                    </div>
                    {electionData && electionData.starttime > 0 && (
                      <p className="text-[11px] text-amber-700 mt-1.5">
                        ⚠️ Election has already started. Smart contract rule prohibits minting new tokens during active voting.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VERIFIER PORTAL */}
        {activeTab === 'verifier' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="gov-card p-8 space-y-6">
              <div className="flex items-center space-x-3.5 border-b border-slate-100 pb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Voter Verification & Identity Registry</h3>
                  <p className="text-xs text-slate-500">Authorized verifiers register citizens into the smart contract with cryptographic identity protection.</p>
                </div>
              </div>

              {/* Status Alert for Connected User */}
              <div className={`p-4 rounded-xl border text-xs flex items-center space-x-2.5 ${
                isVerifier
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                {isVerifier ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-blue-700 flex-shrink-0" />
                    <span><strong>Verifier Status:</strong> Your connected wallet is an <strong>Authorized Verifier</strong> on Sepolia. You can register voters.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span><strong>Verifier Status:</strong> Your current wallet is <strong>NOT</strong> an authorized verifier. The contract's <code>onlyverifier</code> modifier will revert calls. (Admin can authorize your wallet in Admin Control Panel).</span>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Voter Wallet Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={voterRegAddr}
                    onChange={(e) => setVoterRegAddr(e.target.value)}
                    className="w-full gov-input font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Citizen National ID (CNIC, Passport, or Keccak-256 Hash)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 35201-1234567-8"
                    value={voterIdentityRaw}
                    onChange={(e) => setVoterIdentityRaw(e.target.value)}
                    className="w-full gov-input font-mono text-xs"
                  />
                  <div className="flex items-start space-x-2 mt-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Double Anti-Fraud Security:</strong> (1) Har wallet address sirf aik baar register ho sakta hai (Duplicate wallet addresses blocked). (2) Har Citizen ID ka cryptographic Keccak-256 hash banta hai aur aik ID sirf aik martaba use ho sakti hai.
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleRegisterVoter}
                    disabled={!isVerifier || actionLoading.length > 0}
                    className="w-full py-3 btn-primary rounded-xl text-sm flex items-center justify-center space-x-2"
                  >
                    {actionLoading === 'Register & Cryptographically Verify Voter' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirming Registration on Sepolia...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 stroke-[2.2]" />
                        <span>
                          {isVerifier ? 'Register & Verify Voter on Sepolia' : 'Connect as Authorized Verifier to Register'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE CONTRACT EVENT LOGS */}
        {activeTab === 'events' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="gov-card p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <Radio className="w-5 h-5 text-emerald-700 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Live Smart Contract Events Stream</h3>
                    <p className="text-xs text-slate-500">Real-time on-chain events emitted by the Sepolia contract.</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Listening to Sepolia</span>
                </span>
              </div>

              {eventLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <FileText className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No events detected in this session yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Actions performed (voting, pausing, creating election, registering voters) will stream here in real-time.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {eventLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center space-x-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                          {log.name}
                        </span>
                        <span className="text-slate-800 font-semibold">{log.data}</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{log.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/90 bg-white py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-medium">© 2026 International E-Voting System. Powered by Ethereum Sepolia Testnet.</p>
          <a
            href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 text-emerald-700 hover:text-emerald-800 font-bold transition"
          >
            <span>View Verified Contract on Sepolia Etherscan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
