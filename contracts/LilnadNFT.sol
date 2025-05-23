// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LilnadNFT is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;
    Counters.Counter private _tokenIds;

    // -------- Configuration --------
    uint256 public MINT_FEE;
    uint256 public revealBlockLimit;
    uint32 public minRevealLagBlocks;
    uint8 public constant RANK_F_ID = 6;
    uint32 public constant COMMIT_COOLDOWN_BLOCKS = 3;

    uint16 private constant BONUS_10   = 1;
    uint16 private constant BONUS_25   = 3;

    uint16 private constant UR_THRESHOLD  = 50;
    uint16 private constant SSR_THRESHOLD = 350;
    uint16 private constant SR_THRESHOLD  = 1350;
    uint16 private constant R_THRESHOLD   = 3350;
    uint16 private constant UC_THRESHOLD  = 6350;

    // -------- Data Structures --------
    struct RankInfo {
        uint256 S; // ScorePointsPerSecond
        uint256 T; // LifetimeInSeconds
    }
    mapping(uint8 => RankInfo) public rankData;

    struct SBTInfo {
        uint256 startTimestamp;
        bool    isDead;
        uint8   rank;
    }
    mapping(uint256 => SBTInfo) public sbtInfo;

    struct CommitInfo {
        bytes32 commitment;
        uint32  blockNumber;
    }
    mapping(address => CommitInfo) public commitData;

    mapping(uint256 => string) private _tokenURIs;

    // -------- Financials --------
    address public devWallet;
    uint256 public devPool;

    string private _baseTokenURI = "";

    mapping(address => uint256) public lastCommitBlockOf;

    // -------- Events & Errors --------
    event Commit(address indexed user, bytes32 commitment);
    event RevealAndMint(address indexed user, uint256 indexed tokenId, uint8 rank, string uri);
    event Died(uint256 indexed tokenId);
    event DevFeeTransferred(address indexed to, uint256 amount);
    event BaseURISet(string newBaseURI);
    event MintFeeSet(uint256 newMintFee);
    event RankFApplied(address indexed user, uint256 indexed tokenId, string uri);
    event RevealBlockLimitSet(uint256 oldLimit, uint256 newLimit);
    event MinRevealLagBlocksSet(uint32 oldLag, uint32 newLag);
    event AdminCommitmentCleared(address indexed user, address indexed admin);

    error MintFeeRequired();
    error AlreadyCommitted();
    error NoPendingCommit();
    error InvalidCommitReveal();
    error RevealTooEarly();
    error BlockhashUnavailable();
    error BulkMintFee();
    error URIsLengthMismatch();
    error SoulboundToken();
    error InvalidRank();
    error AmountMustBeGreaterThanZero();
    error NewMintFeeMustBePositive();
    error InsufficientBalanceForWithdrawal();
    error NewRevealBlockLimitInvalid();
    error NewMinRevealLagInvalid();
    error CommitCooldownActive();
    error DevWithdrawalFailed();
    error MonWithdrawalFailed();
    error UserAddressCannotBeZero();
    error UserHasNoPendingCommitment();

    // -------- Constructor --------
    constructor(address _initialDevWallet) ERC721("Lilnad", "LND") {
        devWallet = _initialDevWallet;
        MINT_FEE = 1 ether;
        
        revealBlockLimit = 32;
        minRevealLagBlocks = 4;

        rankData[0] = RankInfo(320000, 72 hours);
        rankData[1] = RankInfo(240000, 168 hours);
        rankData[2] = RankInfo(150000, 336 hours);
        rankData[3] = RankInfo(120000, 336 hours);
        rankData[4] = RankInfo(100000, 672 hours);
        rankData[5] = RankInfo(80000,  672 hours);
        rankData[RANK_F_ID] = RankInfo(1000, 720 hours);
    }

    // -------- Admin Functions --------
    function setDevWallet(address _newDevWallet) external onlyOwner {
        devWallet = _newDevWallet;
    }

    function setMintFee(uint256 _newMintFee) external onlyOwner {
        if (_newMintFee == 0) revert NewMintFeeMustBePositive();
        MINT_FEE = _newMintFee;
        emit MintFeeSet(_newMintFee);
    }

    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
        emit BaseURISet(baseURI_);
    }

    function withdrawDevPool() external onlyOwner nonReentrant {
        uint256 amt = devPool;
        if (amt == 0) revert AmountMustBeGreaterThanZero();
        devPool = 0;
        address recipient = devWallet == address(0) ? owner() : devWallet;
        (bool ok, ) = payable(recipient).call{ value: amt }("");
        if (!ok) revert DevWithdrawalFailed();
        emit DevFeeTransferred(recipient, amt);
    }

    function withdrawMon(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        uint256 withdrawableBalance = address(this).balance - devPool;
        if (amount > withdrawableBalance) revert InsufficientBalanceForWithdrawal();
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert MonWithdrawalFailed();
    }

    function setRevealBlockLimit(uint256 _newRevealBlockLimit) external onlyOwner {
        if (_newRevealBlockLimit <= minRevealLagBlocks) {
            revert NewRevealBlockLimitInvalid();
        }
        uint256 oldLimit = revealBlockLimit;
        revealBlockLimit = _newRevealBlockLimit;
        emit RevealBlockLimitSet(oldLimit, _newRevealBlockLimit);
    }

    function setMinRevealLagBlocks(uint32 _newMinRevealLagBlocks) external onlyOwner {
        if (_newMinRevealLagBlocks == 0 || _newMinRevealLagBlocks >= revealBlockLimit || _newMinRevealLagBlocks > 250) { 
            revert NewMinRevealLagInvalid();
        }
        uint32 oldLag = minRevealLagBlocks;
        minRevealLagBlocks = _newMinRevealLagBlocks;
        emit MinRevealLagBlocksSet(oldLag, _newMinRevealLagBlocks);
    }

    function adminClearUserCommitment(address userAddress) external onlyOwner {
        if (userAddress == address(0)) revert UserAddressCannotBeZero();
        CommitInfo storage cd = commitData[userAddress];
        if (cd.commitment == bytes32(0)) revert UserHasNoPendingCommitment();

        delete commitData[userAddress];
        emit AdminCommitmentCleared(userAddress, msg.sender);
    }

    // -------- Commit Functions --------
    function commitMint(string memory uri, bytes32 salt) external payable {
        if (msg.value != MINT_FEE) revert MintFeeRequired();
        bytes32 commitment = keccak256(abi.encode(uri, salt));
        _startCommit(commitment);
    }

    function commitMintPack10(string[] memory uris, bytes32 salt) external payable {
        if (uris.length != 10 + BONUS_10) revert URIsLengthMismatch();
        if (msg.value != MINT_FEE * 10) revert BulkMintFee();
        bytes32 commitment = keccak256(abi.encode(uris, salt));
        _startCommit(commitment);
    }

    function commitMintPack25(string[] memory uris, bytes32 salt) external payable {
        if (uris.length != 25 + BONUS_25) revert URIsLengthMismatch();
        if (msg.value != MINT_FEE * 25) revert BulkMintFee();
        bytes32 commitment = keccak256(abi.encode(uris, salt));
        _startCommit(commitment);
    }

    function _startCommit(bytes32 commitment) internal {
        if (block.number < lastCommitBlockOf[msg.sender] + COMMIT_COOLDOWN_BLOCKS) revert CommitCooldownActive();

        CommitInfo storage cd = commitData[msg.sender];
        if (cd.commitment != bytes32(0)) revert AlreadyCommitted();

        cd.commitment  = commitment;
        cd.blockNumber = uint32(block.number);

        uint256 feeReceived = msg.value;
        uint256 devFeeAmount = (feeReceived * 5) / 100;
        devPool += devFeeAmount;

        lastCommitBlockOf[msg.sender] = block.number;
        emit Commit(msg.sender, commitment);
    }

    // -------- Reveal & Mint Functions --------
    function revealMint(string memory uri, bytes32 salt) external nonReentrant {
        CommitInfo memory cd = commitData[msg.sender];
        uint32 cBlock = cd.blockNumber;

        if (cBlock == 0) revert NoPendingCommit();
        if (block.number < cBlock + minRevealLagBlocks) revert RevealTooEarly();

        bytes32 bhash = blockhash(cBlock);

        if (block.number > cBlock + revealBlockLimit) {
            _mintAndEmit(msg.sender, RANK_F_ID, uri);
            emit RankFApplied(msg.sender, _tokenIds.current(), uri);
            delete commitData[msg.sender];
            return;
        }
        
        if (bhash == bytes32(0)) revert BlockhashUnavailable();
        if (cd.commitment != keccak256(abi.encode(uri, salt)))
            revert InvalidCommitReveal();

        uint16 rand = uint16(uint256(keccak256(abi.encodePacked(salt, bhash, msg.sender))) % 10000);
        uint8 rankValue = _getRankFromRandom(rand);
        _mintAndEmit(msg.sender, rankValue, uri);
        delete commitData[msg.sender];
    }

    function revealMintPack10(string[] memory uris, bytes32 salt) external nonReentrant {
        _revealAndMintBulk(uris, salt, 10 + BONUS_10);
    }
    function revealMintPack25(string[] memory uris, bytes32 salt) external nonReentrant {
        _revealAndMintBulk(uris, salt, 25 + BONUS_25);
    }

    function _revealAndMintBulk(
        string[] memory uris,
        bytes32 salt,
        uint256 expectedCount
    ) internal {
        if (uris.length != expectedCount) revert URIsLengthMismatch();
        CommitInfo storage cd = commitData[msg.sender];
        uint32 cBlock = cd.blockNumber;
        if (cBlock == 0) revert NoPendingCommit();
        if (block.number < cBlock + minRevealLagBlocks) revert RevealTooEarly();
        bytes32 bhash = blockhash(cBlock);

        if (block.number > cBlock + revealBlockLimit) {
            for (uint256 i = 0; i < expectedCount; ++i) {
                _mintAndEmit(msg.sender, RANK_F_ID, uris[i]);
                emit RankFApplied(msg.sender, _tokenIds.current(), uris[i]);
            }
            delete commitData[msg.sender];
            return;
        }
        
        if (bhash == bytes32(0)) revert BlockhashUnavailable();
        if (cd.commitment != keccak256(abi.encode(uris, salt)))
            revert InvalidCommitReveal();

        for (uint256 i = 0; i < uris.length; ++i) {
            uint16 rand = uint16(uint256(keccak256(abi.encodePacked(salt, bhash, msg.sender, i))) % 10000);
            uint8 rankValue = _getRankFromRandom(rand);
            _mintAndEmit(msg.sender, rankValue, uris[i]);
        }
        delete commitData[msg.sender];
    }

    function _mintAndEmit(address _to, uint8 _rank, string memory _uri) internal {
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        _safeMint(_to, tokenId);
        sbtInfo[tokenId] = SBTInfo(
            block.timestamp,
            false,
            _rank
        );
        _tokenURIs[tokenId] = _uri;
        emit RevealAndMint(_to, tokenId, _rank, _uri);
    }

    function _getRankFromRandom(uint16 rand) internal pure returns (uint8) {
        if (rand < UR_THRESHOLD) return 0;
        if (rand < SSR_THRESHOLD) return 1;
        if (rand < SR_THRESHOLD)  return 2;
        if (rand < R_THRESHOLD)   return 3;
        if (rand < UC_THRESHOLD)  return 4;
        return 5; // Rank C
    }

    // -------- View Functions --------
    function getNftDetails(uint256 tokenId) 
        public 
        view 
        returns (
            uint256 startTimestamp,
            uint256 expirationTimestamp,
            uint8 rank,
            bool isDead,
            uint256 scorePerSecond,
            string memory currentTokenURI
        )
    {
        require(_exists(tokenId), "Query for nonexistent token");
        SBTInfo storage info = sbtInfo[tokenId];
        RankInfo storage rData = rankData[info.rank];

        startTimestamp = info.startTimestamp;
        rank = info.rank;
        scorePerSecond = rData.S;
        currentTokenURI = tokenURI(tokenId);

        if (rData.T == 0) { 
            expirationTimestamp = type(uint256).max;
            isDead = info.isDead;
        } else {
            expirationTimestamp = startTimestamp + rData.T;
            isDead = info.isDead || (block.timestamp >= expirationTimestamp);
        }
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        if (bytes(_tokenURIs[tokenId]).length > 0) {
            return _tokenURIs[tokenId];
    }
        if (bytes(_baseTokenURI).length > 0) {
            return string(abi.encodePacked(_baseTokenURI, tokenId.toString()));
        }
        return "";
    }

    // -------- SBT Implementation --------
    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize)
        internal
        override
    {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        if (from != address(0) && to != address(0)) {
            revert SoulboundToken();
        }
    }

    function approve(address, uint256) public virtual override {
        revert SoulboundToken();
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert SoulboundToken();
        }

    function transferFrom(address /*from*/, address /*to*/, uint256 /*tokenId*/) public virtual override {
        revert SoulboundToken();
    }

    function safeTransferFrom(address /*from*/, address /*to*/, uint256 /*tokenId*/) public virtual override {
        revert SoulboundToken();
    }

    function safeTransferFrom(address /*from*/, address /*to*/, uint256 /*tokenId*/, bytes memory /*data*/) public virtual override {
        revert SoulboundToken();
        }

    // -------- Fallback for receiving ETH --------
    receive() external payable {}
    fallback() external payable {}
}
