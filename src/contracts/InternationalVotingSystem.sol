// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InternationalVotingSystem
 * @dev Decentralized, transparent, and auditable international voting smart contract.
 * Features:
 * - Named Elections with state tracking
 * - Candidates with Full Profile: Name, Political Party, Age, Wallet Address
 * - Prevents duplicate candidate registration by wallet address (isCandidateRegistered)
 * - Prevents duplicate voter registration by wallet address (!registeredvoters[_voter])
 * - Prevents duplicate identity hash registration (!usedidentity[_hashidentity])
 * - Admin Election Duration Extension (extendElectionDuration in minutes)
 * - Emergency Pause & Resume mechanisms for elections
 * - Election Cancellation mechanism
 * - Verifier Portal for cryptographic voter KYC/Identity registration
 * - Decentralized Self-Claim of EVT Tokens by registered voters (plus Admin issuance)
 * - Safe voting with single-use EVT burn mechanism and double-voting prevention
 * - Deterministic election duration with winner calculation & tie-handling
 */
contract internationalvotingsystem {
    address public admin;
    uint256 public electioncount;
    uint256 public constant Elcetionduration = 10 minutes;

    struct candidate {
        string name;
        string party;
        uint256 age;
        address candidateAddress;
        uint256 votes;
        bool active;
    }

    struct Election {
        string name;
        uint256 totalcandidates;
        uint256 activecandidates;
        uint256 starttime;
        uint256 endtime;
        uint256 totalwinners;
        uint256 winningvotes;
        bool resultdeclared;
        bool paused;
        bool cancelled;
        uint256 pauseStartTime;
    }

    // Role mappings
    mapping(address => bool) public verifiers;
    mapping(address => bool) public registeredvoters;
    mapping(bytes32 => bool) private usedidentity;

    // Election & Candidate state
    mapping(uint256 => Election) public election;
    mapping(uint256 => mapping(uint256 => candidate)) public candidates;
    // Prevent same candidate address from registering multiple times in same election
    mapping(uint256 => mapping(address => bool)) public isCandidateRegistered;

    // Tokenomics & Voting state
    mapping(uint256 => mapping(address => uint256)) public evtbalance;
    mapping(uint256 => mapping(address => bool)) public hasvoted;
    mapping(uint256 => mapping(uint256 => uint256)) public winners;

    // Events
    event verifieradded(address indexed verifier);
    event verifierremoved(address indexed verifier);
    event voterregistered(address indexed voter, bytes32 indexed hashidentity);
    event electioncreated(uint256 indexed electionid, string name);
    event candidateadded(uint256 indexed electionid, uint256 indexed candidateid, string name, string party, uint256 age, address candidateAddress);
    event candidatewithdraw(uint256 indexed electionid, uint256 indexed candidateid);
    event evtissued(uint256 indexed electionid, address indexed voter);
    event evtburned(uint256 indexed electionid, address indexed voter);
    event electionstart(uint256 indexed electionid, uint256 endtime);
    event electionpaused(uint256 indexed electionid);
    event electionresumed(uint256 indexed electionid, uint256 newEndtime);
    event electionextended(uint256 indexed electionid, uint256 addedMinutes, uint256 newEndtime);
    event electioncancelled(uint256 indexed electionid);
    event votecasted(uint256 indexed electionid, address indexed voter, uint256 indexed candidateid);
    event declaredwinner(uint256 indexed electionid, uint256 totalwinners);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyadmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyverifier() {
        require(verifiers[msg.sender], "Only verifier");
        _;
    }

    // ----------------------------------------------------
    // VERIFIER MANAGEMENT (Admin Only)
    // ----------------------------------------------------
    function addverifier(address _verifier) public onlyadmin {
        require(_verifier != address(0), "Invalid verifier address");
        require(!verifiers[_verifier], "Already registered as verifier");
        verifiers[_verifier] = true;
        emit verifieradded(_verifier);
    }

    function removeverifier(address _verifier) public onlyadmin {
        require(verifiers[_verifier], "Verifier not found");
        verifiers[_verifier] = false;
        emit verifierremoved(_verifier);
    }

    // ----------------------------------------------------
    // VOTER REGISTRATION (Verifier Only)
    // Strict Protection: Same wallet address or same identity hash can NEVER be registered twice!
    // ----------------------------------------------------
    function Registeredvoter(address _voter, bytes32 _hashidentity) public onlyverifier {
        require(_voter != address(0), "Invalid voter address");
        require(_hashidentity != bytes32(0), "Invalid identity hash");
        require(!registeredvoters[_voter], "This wallet address is already registered as a voter");
        require(!usedidentity[_hashidentity], "This citizen identity has already been used");

        registeredvoters[_voter] = true;
        usedidentity[_hashidentity] = true;
        emit voterregistered(_voter, _hashidentity);
    }

    // ----------------------------------------------------
    // ELECTION MANAGEMENT (Admin Only)
    // ----------------------------------------------------
    function createelcetionWithDetails(string memory _name) public onlyadmin {
        require(bytes(_name).length > 0, "Election name required");
        electioncount++;
        Election storage e = election[electioncount];
        e.name = _name;
        emit electioncreated(electioncount, _name);
    }

    // Backward-compatible createelcetion function
    function createelcetion() public onlyadmin {
        electioncount++;
        Election storage e = election[electioncount];
        e.name = string(abi.encodePacked("General Election #", _uint2str(electioncount)));
        emit electioncreated(electioncount, e.name);
    }

    // Extend Election Duration (in minutes) by Admin
    function extendElectionDuration(uint256 _electionid, uint256 _additionalMinutes) public onlyadmin {
        Election storage e = election[_electionid];
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election id");
        require(e.starttime > 0, "Election has not started yet");
        require(!e.cancelled, "Election is cancelled");
        require(!e.resultdeclared, "Result already declared");
        require(_additionalMinutes > 0 && _additionalMinutes <= 1440, "Invalid minutes (1 to 1440)");

        // If election already passed endtime but results not declared, extend from now
        if (block.timestamp >= e.endtime) {
            e.endtime = block.timestamp + (_additionalMinutes * 1 minutes);
        } else {
            e.endtime += (_additionalMinutes * 1 minutes);
        }

        emit electionextended(_electionid, _additionalMinutes, e.endtime);
    }

    // Pause an active election
    function pauseelection(uint256 _electionid) public onlyadmin {
        Election storage e = election[_electionid];
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election");
        require(e.starttime > 0, "Election has not started yet");
        require(!e.paused, "Election is already paused");
        require(!e.cancelled, "Election is cancelled");
        require(!e.resultdeclared, "Result already declared");
        require(block.timestamp < e.endtime, "Election has already ended");

        e.paused = true;
        e.pauseStartTime = block.timestamp;
        emit electionpaused(_electionid);
    }

    // Resume a paused election (extends endtime by paused duration so voters don't lose time!)
    function resumeelection(uint256 _electionid) public onlyadmin {
        Election storage e = election[_electionid];
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election");
        require(e.paused, "Election is not paused");
        require(!e.cancelled, "Election is cancelled");

        uint256 pauseDuration = block.timestamp - e.pauseStartTime;
        e.endtime += pauseDuration;
        e.paused = false;
        e.pauseStartTime = 0;
        emit electionresumed(_electionid, e.endtime);
    }

    // Cancel an election
    function cancelelection(uint256 _electionid) public onlyadmin {
        Election storage e = election[_electionid];
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election");
        require(!e.cancelled, "Election is already cancelled");
        require(!e.resultdeclared, "Cannot cancel election after results are declared");

        e.cancelled = true;
        e.paused = false;
        emit electioncancelled(_electionid);
    }

    // ----------------------------------------------------
    // CANDIDATE MANAGEMENT
    // ----------------------------------------------------
    function addcandidateWithDetails(
        uint256 _electionid,
        string memory _name,
        string memory _party,
        uint256 _age,
        address _candidateAddress
    ) public onlyadmin {
        Election storage e = election[_electionid];
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election id");
        require(e.starttime == 0, "Election already started");
        require(!e.cancelled, "Election is cancelled");
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_party).length > 0, "Party name required");
        require(_age >= 18, "Candidate must be at least 18 years old");
        require(_candidateAddress != address(0), "Invalid candidate wallet address");
        require(!isCandidateRegistered[_electionid][_candidateAddress], "Candidate address already registered in this election");

        e.totalcandidates++;
        e.activecandidates++;
        candidates[_electionid][e.totalcandidates] = candidate({
            name: _name,
            party: _party,
            age: _age,
            candidateAddress: _candidateAddress,
            votes: 0,
            active: true
        });
        isCandidateRegistered[_electionid][_candidateAddress] = true;

        emit candidateadded(_electionid, e.totalcandidates, _name, _party, _age, _candidateAddress);
    }

    function addcandidate(uint256 _electionid, string memory _name) public onlyadmin {
        addcandidateWithDetails(_electionid, _name, "Independent", 25, address(uint160(uint256(keccak256(abi.encodePacked(_electionid, _name, block.timestamp))))));
    }

    function withdrawcandidate(uint256 _electionid, uint256 _candidateid) public onlyadmin {
        Election storage e = election[_electionid];
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election id");
        require(_candidateid > 0 && _candidateid <= e.totalcandidates, "Invalid candidate id");
        require(e.starttime == 0, "Election already started");
        require(!e.cancelled, "Election is cancelled");

        candidate storage c = candidates[_electionid][_candidateid];
        require(c.active, "Candidate not active");

        c.active = false;
        e.activecandidates--;
        emit candidatewithdraw(_electionid, _candidateid);
    }

    // ----------------------------------------------------
    // DECENTRALIZED EVT TOKEN CLAIM & ISSUANCE
    // ----------------------------------------------------
    function claimEVT(uint256 _electionid) public {
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election id");
        require(election[_electionid].starttime == 0, "Election already started, token claiming closed");
        require(!election[_electionid].cancelled, "Election is cancelled");
        require(registeredvoters[msg.sender], "You are not a registered voter. Get verified first");
        require(evtbalance[_electionid][msg.sender] == 0, "EVT token already claimed for this election");

        evtbalance[_electionid][msg.sender] = 1;
        emit evtissued(_electionid, msg.sender);
    }

    function issuevoterevt(uint256 _electionid, address _voter) public onlyadmin {
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election id");
        require(election[_electionid].starttime == 0, "Election already started");
        require(!election[_electionid].cancelled, "Election is cancelled");
        require(registeredvoters[_voter], "Voter not registered");
        require(evtbalance[_electionid][_voter] == 0, "EVT already issued");

        evtbalance[_electionid][_voter] = 1;
        emit evtissued(_electionid, _voter);
    }

    // ----------------------------------------------------
    // ELECTION START & VOTING
    // ----------------------------------------------------
    function startelection(uint256 _electionid) public onlyadmin {
        Election storage e = election[_electionid];
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election");
        require(e.starttime == 0, "Already started");
        require(!e.cancelled, "Election is cancelled");
        require(e.activecandidates > 0, "No active candidates in election");

        e.starttime = block.timestamp;
        e.endtime = block.timestamp + Elcetionduration;
        emit electionstart(_electionid, e.endtime);
    }

    function vote(uint256 _electionid, uint256 _candidateid) public {
        Election storage e = election[_electionid];
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election");
        require(!e.cancelled, "Election is cancelled");
        require(!e.paused, "Voting is currently paused by admin");
        require(registeredvoters[msg.sender], "Not a registered voter");
        require(evtbalance[_electionid][msg.sender] == 1, "No EVT voting token");
        require(!hasvoted[_electionid][msg.sender], "Already voted in this election");
        require(e.starttime > 0, "Election has not started yet");
        require(block.timestamp < e.endtime, "Election has ended");
        require(!e.resultdeclared, "Result already declared");

        require(_candidateid > 0 && _candidateid <= e.totalcandidates, "Invalid candidate id");
        candidate storage c = candidates[_electionid][_candidateid];
        require(c.active, "Candidate is withdrawn");

        // Burn EVT Token & cast vote
        evtbalance[_electionid][msg.sender] = 0;
        hasvoted[_electionid][msg.sender] = true;
        c.votes++;

        emit evtburned(_electionid, msg.sender);
        emit votecasted(_electionid, msg.sender, _candidateid);
    }

    // ----------------------------------------------------
    // WINNER CALCULATION
    // ----------------------------------------------------
    function calculateWinner(uint256 _electionid) public {
        Election storage e = election[_electionid];
        require(_electionid > 0 && _electionid <= electioncount, "Invalid election");
        require(!e.cancelled, "Election is cancelled");
        require(!e.paused, "Cannot declare winner while election is paused");
        require(e.starttime > 0, "Election not started");
        require(block.timestamp >= e.endtime, "Election duration has not ended yet");
        require(!e.resultdeclared, "Result already declared");

        // Find winning votes count
        for (uint256 i = 1; i <= e.totalcandidates; i++) {
            if (candidates[_electionid][i].active && candidates[_electionid][i].votes > e.winningvotes) {
                e.winningvotes = candidates[_electionid][i].votes;
            }
        }

        // Tally all candidates with winning vote count (handles ties)
        if (e.winningvotes > 0) {
            for (uint256 i = 1; i <= e.totalcandidates; i++) {
                if (candidates[_electionid][i].active && candidates[_electionid][i].votes == e.winningvotes) {
                    e.totalwinners++;
                    winners[_electionid][e.totalwinners] = i;
                }
            }
        }

        e.resultdeclared = true;
        emit declaredwinner(_electionid, e.totalwinners);
    }

    // Helper: Convert uint to string
    function _uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }
}
