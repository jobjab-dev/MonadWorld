// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract GameSBT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct RankInfo { uint256 S; uint256 T; }
    mapping(uint8 => RankInfo) public rankData;

    struct SBTInfo {
        uint256 startTimestamp;
        uint256 collected;
        bool isDead;
        uint8 rank;
    }
    mapping(uint256 => SBTInfo) public sbtInfo;

    uint256 public constant MINT_FEE = 1 ether;
    uint256 public rewardPool;
    uint256 public devPool;
    
    mapping(address => uint256) public pendingRewards;

    // commit-reveal data
    struct CommitInfo { bytes32 commitment; uint32 blockNumber; }
    mapping(address => CommitInfo) public commitData;

    event Commit(address indexed user, bytes32 commitment);
    event Reveal(address indexed user, uint256 indexed tokenId, uint8 rank);
    uint256 public constant REVEAL_BLOCK_LIMIT = 256;

    // drop-rate thresholds (out of 10000)
    uint16 private constant UR_THRESHOLD = 50;
    uint16 private constant SSR_THRESHOLD = 350;
    uint16 private constant SR_THRESHOLD = 1350;
    uint16 private constant R_THRESHOLD = 3350;
    uint16 private constant UC_THRESHOLD = 6350;

    event Minted(address indexed user, uint256 indexed tokenId, uint8 rank);
    event Collected(address indexed user, uint256 indexed tokenId, uint256 amount);
    event Died(uint256 indexed tokenId);
    event RewardDistributed(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event DevWithdrawn(address indexed to, uint256 amount);

    // custom errors for gas efficiency
    error MintFeeRequired();
    error AlreadyCommitted();
    error NoPendingCommit();
    error InvalidCommitReveal();
    error RevealTooEarly();
    error RevealTooLate();
    error BlockhashUnavailable();
    error BulkMintFee();
    error URIsLengthMismatch();
    error InsufficientRewardPool();

    constructor() ERC721("GameSBT", "GSBT") {
        rankData[0] = RankInfo(2400, 48 hours); // UR
        rankData[1] = RankInfo(1200, 72 hours); // SSR
        rankData[2] = RankInfo(950, 168 hours); // SR
        rankData[3] = RankInfo(900, 360 hours); // R
        rankData[4] = RankInfo(850, 720 hours); // UC
        rankData[5] = RankInfo(800, 1440 hours); // C
    }

    function commitMint(bytes32 commitment) external payable {
        if (msg.value != MINT_FEE) revert MintFeeRequired();
        CommitInfo storage cd = commitData[msg.sender];
        if (cd.commitment != bytes32(0)) revert AlreadyCommitted();
        // store truncated block number
        cd.commitment = commitment;
        cd.blockNumber = uint32(block.number);
        // distribute fees
        unchecked { devPool += (msg.value * 5) / 100; }
        rewardPool += (msg.value * 95) / 100;
        emit Commit(msg.sender, commitment);
    }

    function revealMint(string memory uri, bytes32 salt) external {
        // get commit block; ensure commitMint was called
        uint32 cBlock = commitData[msg.sender].blockNumber;
        if (cBlock == 0) revert NoPendingCommit();
        if (block.number <= cBlock) revert RevealTooEarly();
        if (block.number > cBlock + REVEAL_BLOCK_LIMIT) revert RevealTooLate();
        bytes32 bhash = blockhash(cBlock);
        if (bhash == bytes32(0)) revert BlockhashUnavailable();

        // derive random rank
        uint16 rand = uint16(uint256(keccak256(abi.encodePacked(salt, bhash, msg.sender))) % 10000);
        uint8 rank;
        if (rand < UR_THRESHOLD) rank = 0;
        else if (rand < SSR_THRESHOLD) rank = 1;
        else if (rand < SR_THRESHOLD)  rank = 2;
        else if (rand < R_THRESHOLD)   rank = 3;
        else if (rand < UC_THRESHOLD)  rank = 4;
        else                             rank = 5;

        // mint SBT
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        sbtInfo[tokenId] = SBTInfo(block.timestamp, 0, false, rank);
        emit Minted(msg.sender, tokenId, rank);
        emit Reveal(msg.sender, tokenId, rank);

        // clear commit data (eligible for gas refund)
        delete commitData[msg.sender];
    }

    function collect(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        SBTInfo storage info = sbtInfo[tokenId];
        require(!info.isDead, "Token is dead");

        uint8 rank = _getRank(tokenId);
        RankInfo memory rd = rankData[rank];
        uint256 elapsed = block.timestamp - info.startTimestamp;
        // avoid unused total variable
        if (elapsed >= rd.T) {
            elapsed = rd.T;
            info.isDead = true;
            emit Died(tokenId);
        }
        uint256 acc;
        // guard division by zero
        if (rd.T > 0) {
            acc = (rd.S * elapsed) / rd.T;
        } else {
            acc = rd.S;
        }
        uint256 toCollect = acc - info.collected;
        info.collected = acc;
        payable(msg.sender).transfer(toCollect);

        emit Collected(msg.sender, tokenId, toCollect);
    }

    function _getRank(uint256 tokenId) internal view returns (uint8) {
        return sbtInfo[tokenId].rank;
    }

    function distributeRewards(address[] calldata winners, uint256[] calldata amounts) external onlyOwner {
        require(winners.length == amounts.length, "Mismatched inputs");
        uint256 total;
        for (uint i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(total <= rewardPool, "Not enough in reward pool");
        for (uint i = 0; i < winners.length; i++) {
            pendingRewards[winners[i]] += amounts[i];
            emit RewardDistributed(winners[i], amounts[i]);
        }
        rewardPool -= total;
    }

    function claimReward() external {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "No rewards to claim");
        pendingRewards[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit RewardClaimed(msg.sender, amount);
    }

    function commitMintBulk(bytes32 commitment) external payable {
        if (msg.value != MINT_FEE * 10) revert BulkMintFee();
        CommitInfo storage cd = commitData[msg.sender];
        if (cd.commitment != bytes32(0)) revert AlreadyCommitted();
        cd.commitment = commitment;
        cd.blockNumber = uint32(block.number);
        unchecked { devPool += (msg.value * 5) / 100; }
        rewardPool += (msg.value * 95) / 100;
        emit Commit(msg.sender, commitment);
    }

    function revealMintBulk(string[] memory uris, bytes32 salt) external {
        if (uris.length != 11) revert URIsLengthMismatch();
        // get commit block; ensure commitMintBulk was called
        uint32 cBlock = commitData[msg.sender].blockNumber;
        if (cBlock == 0) revert NoPendingCommit();
        if (block.number <= cBlock) revert RevealTooEarly();
        if (block.number > cBlock + REVEAL_BLOCK_LIMIT) revert RevealTooLate();
        bytes32 bhash = blockhash(cBlock);
        if (bhash == bytes32(0)) revert BlockhashUnavailable();
        for (uint256 i = 0; i < 11; ) {
            // fair random per index
            uint16 rand = uint16(uint256(
                keccak256(abi.encodePacked(salt, bhash, msg.sender, i))) % 10000);
            uint8 rank;
            if (rand < UR_THRESHOLD) rank = 0;
            else if (rand < SSR_THRESHOLD) rank = 1;
            else if (rand < SR_THRESHOLD)  rank = 2;
            else if (rand < R_THRESHOLD)   rank = 3;
            else if (rand < UC_THRESHOLD)  rank = 4;
            else                             rank = 5;

            _tokenIds.increment();
            uint256 tokenId = _tokenIds.current();
            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, uris[i]);
            sbtInfo[tokenId] = SBTInfo(block.timestamp, 0, false, rank);
            emit Minted(msg.sender, tokenId, rank);
            emit Reveal(msg.sender, tokenId, rank);
            unchecked { ++i; }
        }
        delete commitData[msg.sender];
    }

    // Withdraw dev fees
    function withdrawDev() external onlyOwner {
        uint256 amt = devPool;
        devPool = 0;
        payable(owner()).transfer(amt);
        emit DevWithdrawn(owner(), amt);
    }
} 