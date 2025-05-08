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
    uint256 public constant MINT_FEE           = 0.01 ether;
    uint256 public constant ACCRUAL_WINDOW     = 72 hours;
    uint256 public constant REVEAL_BLOCK_LIMIT = 256; // EVM blockhash window

    // bonus counts for each pack
    uint16 private constant BONUS_1    = 0;
    uint16 private constant BONUS_10   = 1;
    uint16 private constant BONUS_25   = 3;
    uint16 private constant BONUS_50   = 6;
    uint16 private constant BONUS_100  = 12;

    // drop-rate thresholds (out of 10000)
    uint16 private constant UR_THRESHOLD  = 50;
    uint16 private constant SSR_THRESHOLD = 350;
    uint16 private constant SR_THRESHOLD  = 1350;
    uint16 private constant R_THRESHOLD   = 3350;
    uint16 private constant UC_THRESHOLD  = 6350;

    // -------- Data Structures --------
    struct RankInfo { uint256 S; uint256 T; }
    mapping(uint8 => RankInfo) public rankData;

    struct SBTInfo {
        uint256 startTimestamp;
        uint256 lastCollect;
        uint256 collected;
        bool    isDead;
        uint8   rank;
    }
    mapping(uint256 => SBTInfo) public sbtInfo;

    struct CommitInfo {
        bytes32 commitment;
        uint32  blockNumber;
    }
    mapping(address => CommitInfo) public commitData;

    // -------- Modified: Dev Pool --------
    address public devWallet;   // Address to receive dev fees; fallback to owner if zero
    uint256 public devPool;     // Accumulated dev fees

    string private _baseTokenURI = "https://api.yourdapp.com/sbt/metadata/";

    // -------- Events & Errors --------
    event Commit(address indexed user, bytes32 commitment);
    event RevealAndMint(address indexed user, uint256 indexed tokenId, uint8 rank, string uri);
    event Collected(address indexed user, uint256 indexed tokenId, uint256 amount);
    event Died(uint256 indexed tokenId);
    event DevFeeTransferred(address indexed to, uint256 amount);

    error MintFeeRequired();
    error AlreadyCommitted();
    error NoPendingCommit();
    error InvalidCommitReveal();
    error RevealTooEarly();
    error RevealTooLate();
    error BlockhashUnavailable();
    error BulkMintFee();
    error URIsLengthMismatch();
    error CommitExpiredTryNormalReveal();
    error CommitNotExpiredTryExpiredReveal();

    // -------- Constructor --------
    constructor(address _initialDevWallet) ERC721("Lilnad", "LND") {
        devWallet = _initialDevWallet;

        rankData[0] = RankInfo(3200, 72 hours);  // UR
        rankData[1] = RankInfo(2400, 168 hours); // SSR
        rankData[2] = RankInfo(1500, 336 hours); // SR
        rankData[3] = RankInfo(1200, 336 hours); // R
        rankData[4] = RankInfo(1000, 672 hours); // UC
        rankData[5] = RankInfo(800, 672 hours);  // C
    }

    // -------- Admin: Set Dev Wallet --------
    function setDevWallet(address _newDevWallet) external onlyOwner {
        devWallet = _newDevWallet;
    }

    // -------- Commit Functions --------
    function commitMint(bytes32 commitment) external payable {
        if (msg.value != MINT_FEE) revert MintFeeRequired();
        _startCommit(commitment);
    }
    function commitMintPack10(bytes32 commitment) external payable {
        if (msg.value != MINT_FEE * 10) revert BulkMintFee();
        _startCommit(commitment);
    }
    function commitMintPack25(bytes32 commitment) external payable {
        if (msg.value != MINT_FEE * 25) revert BulkMintFee();
        _startCommit(commitment);
    }
    function commitMintPack50(bytes32 commitment) external payable {
        if (msg.value != MINT_FEE * 50) revert BulkMintFee();
        _startCommit(commitment);
    }
    function commitMintPack100(bytes32 commitment) external payable {
        if (msg.value != MINT_FEE * 100) revert BulkMintFee();
        _startCommit(commitment);
    }

    function _startCommit(bytes32 commitment) internal {
        CommitInfo storage cd = commitData[msg.sender];
        if (cd.commitment != bytes32(0)) revert AlreadyCommitted();

        cd.commitment  = commitment;
        cd.blockNumber = uint32(block.number);

        // Accumulate dev fee
        uint256 devFeeAmount = (msg.value * 5) / 100;
        devPool += devFeeAmount;

        emit Commit(msg.sender, commitment);
    }

    /// @notice Owner withdraws accumulated dev fees
    function withdrawDevPool() external onlyOwner nonReentrant {
        uint256 amt = devPool;
        devPool = 0;
        address recipient = devWallet == address(0) ? owner() : devWallet;
        (bool ok, ) = payable(recipient).call{ value: amt }("");
        require(ok, "Dev withdrawal failed");
        emit DevFeeTransferred(recipient, amt);
    }

    // -------- Reveal & Mint Functions --------
    function revealMint(string memory uri, bytes32 salt) external nonReentrant {
        CommitInfo memory cd = commitData[msg.sender];
        uint32 cBlock = cd.blockNumber;

        if (cBlock == 0) revert NoPendingCommit();
        if (block.number <= cBlock) revert RevealTooEarly();
        if (block.number > cBlock + REVEAL_BLOCK_LIMIT) revert CommitExpiredTryNormalReveal();

        bytes32 bhash = blockhash(cBlock);
        if (bhash == bytes32(0)) revert BlockhashUnavailable();

        if (cd.commitment != keccak256(abi.encodePacked(uri, salt)))
            revert InvalidCommitReveal();

        uint16 rand = uint16(uint256(keccak256(abi.encodePacked(salt, bhash, msg.sender))) % 10000);
        uint8 rankValue = _getRankFromRandom(rand);

        _mintAndEmit(msg.sender, _tokenIds.current(), rankValue, uri);
        
        delete commitData[msg.sender];
    }

    function revealMintPack10(string[] memory uris, bytes32 salt) external nonReentrant {
        _revealAndMintBulk(uris, salt, 10 + BONUS_10);
    }
    function revealMintPack25(string[] memory uris, bytes32 salt) external nonReentrant {
        _revealAndMintBulk(uris, salt, 25 + BONUS_25);
    }
    function revealMintPack50(string[] memory uris, bytes32 salt) external nonReentrant {
        _revealAndMintBulk(uris, salt, 50 + BONUS_50);
    }
    function revealMintPack100(string[] memory uris, bytes32 salt) external nonReentrant {
        _revealAndMintBulk(uris, salt, 100 + BONUS_100);
    }

    function _revealAndMint(
        string memory uri,
        bytes32 salt,
        uint256 expectedCount
    ) internal {
        string[] memory uris = new string[](expectedCount);
        uris[0] = uri;
        _revealAndMintBulk(uris, salt, expectedCount);
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
        if (block.number <= cBlock) revert RevealTooEarly();
        if (block.number > cBlock + REVEAL_BLOCK_LIMIT) revert RevealTooLate();

        bytes32 bhash = blockhash(cBlock);
        if (bhash == bytes32(0)) revert BlockhashUnavailable();

        if (cd.commitment != keccak256(abi.encodePacked(uris[0], salt)))
            revert InvalidCommitReveal();

        for (uint256 i = 0; i < uris.length; ++i) {
            uint16 rand = uint16(uint256(
                keccak256(abi.encodePacked(salt, bhash, msg.sender, i))
            ) % 10000);
            uint8 rankValue = rand < UR_THRESHOLD   ? 0
                             : rand < SSR_THRESHOLD  ? 1
                             : rand < SR_THRESHOLD   ? 2
                             : rand < R_THRESHOLD    ? 3
                             : rand < UC_THRESHOLD   ? 4
                             :                         5;

            _tokenIds.increment();
            uint256 tokenId = _tokenIds.current();
            _safeMint(msg.sender, tokenId);
            sbtInfo[tokenId] = SBTInfo(
                block.timestamp,
                block.timestamp,
                0,
                false,
                rankValue
            );
            emit RevealAndMint(msg.sender, tokenId, rankValue, uris[i]);
        }

        delete commitData[msg.sender];
    }

    // -------- Metadata --------
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString()));
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    // -------- Accrual (no ETH payout) --------
    function collect(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        SBTInfo storage info = sbtInfo[tokenId];
        require(!info.isDead, "Token is dead");

        RankInfo memory rd = rankData[info.rank];
        uint256 elapsed = block.timestamp - info.startTimestamp;
        if (elapsed >= rd.T) {
            info.isDead = true;
            emit Died(tokenId);
            elapsed = rd.T;
        }

        uint256 sinceLast = block.timestamp - info.lastCollect;
        uint256 window   = sinceLast > ACCRUAL_WINDOW ? ACCRUAL_WINDOW : sinceLast;
        uint256 potential = rd.T > 0 ? (rd.S * window) / rd.T : rd.S;
        uint256 remaining = rd.S - info.collected;
        uint256 toCollect = potential > remaining ? remaining : potential;

        info.collected   += toCollect;
        info.lastCollect = block.timestamp;

        emit Collected(msg.sender, tokenId, toCollect);
    }

    // -------- Admin withdrawal for Game Economy (95% portion) --------
    function withdrawMon(uint256 amount) external onlyOwner nonReentrant {
        require(address(this).balance >= amount, "LilnadNFT: Insufficient contract balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "LilnadNFT: MON withdrawal failed");
    }

    // -------- Allow contract to receive ETH --------
    receive() external payable {}
    fallback() external payable {}

    // -------- New Functions --------
    function revealExpiredCommit(string memory uri) external nonReentrant {
        CommitInfo memory cd = commitData[msg.sender];
        uint32 cBlock = cd.blockNumber;

        if (cBlock == 0) revert NoPendingCommit();

        if (block.number <= cBlock + REVEAL_BLOCK_LIMIT) {
            revert CommitNotExpiredTryExpiredReveal();
        }

        uint8 lowestRank = 5;

        _mintAndEmit(msg.sender, _tokenIds.current(), lowestRank, uri);

        delete commitData[msg.sender];
    }

    function _mintAndEmit(address _to, uint256 _tokenId, uint8 _rank, string memory _uri) internal {
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();

        _safeMint(_to, tokenId);
        sbtInfo[tokenId] = SBTInfo(
            block.timestamp,
            block.timestamp,
            0,
            false,
            _rank
        );
        emit RevealAndMint(_to, tokenId, _rank, _uri);
    }

    function _getRankFromRandom(uint16 rand) internal pure returns (uint8) {
        if (rand < UR_THRESHOLD) return 0;
        else if (rand < SSR_THRESHOLD) return 1;
        else if (rand < SR_THRESHOLD)  return 2;
        else if (rand < R_THRESHOLD)   return 3;
        else if (rand < UC_THRESHOLD)  return 4;
        else                             return 5;
    }

    // -------- ADDED: Expired Reveal for Bulk Mint --------

    function revealExpiredCommitPack10(string[] memory uris) external nonReentrant {
        // Determine expected count including bonus
        uint256 expectedCount = 10 + BONUS_10; 
        _revealExpiredCommitBulk(uris, expectedCount);
    }

    function revealExpiredCommitPack25(string[] memory uris) external nonReentrant {
        uint256 expectedCount = 25 + BONUS_25;
        _revealExpiredCommitBulk(uris, expectedCount);
    }

    function revealExpiredCommitPack50(string[] memory uris) external nonReentrant {
        uint256 expectedCount = 50 + BONUS_50;
        _revealExpiredCommitBulk(uris, expectedCount);
    }
    
    function revealExpiredCommitPack100(string[] memory uris) external nonReentrant {
        uint256 expectedCount = 100 + BONUS_100;
        _revealExpiredCommitBulk(uris, expectedCount);
    }

    // Internal function to handle the logic for expired bulk reveal
    function _revealExpiredCommitBulk(
        string[] memory uris,
        uint256 expectedCount
    ) internal {
        // 1. Check URI length (Frontend should send array of empty strings with correct length)
        if (uris.length != expectedCount) revert URIsLengthMismatch();

        // 2. Check for pending commit
        CommitInfo memory cd = commitData[msg.sender]; // Use memory copy
        uint32 cBlock = cd.blockNumber;
        if (cBlock == 0) revert NoPendingCommit();

        // 3. Ensure it IS expired
        if (block.number <= cBlock + REVEAL_BLOCK_LIMIT) {
            revert CommitNotExpiredTryExpiredReveal();
        }

        // 4. Mint NFTs with the lowest rank for the expected count
        uint8 lowestRank = 5; // Rank 'C'
        for (uint256 i = 0; i < expectedCount; ++i) {
            // Call the common minting function for each NFT
            // Pass the corresponding URI from the input array (which will be "")
            _mintAndEmit(msg.sender, _tokenIds.current(), lowestRank, uris[i]); 
        }

        // 5. Clear commit data
        delete commitData[msg.sender];
    }
}
