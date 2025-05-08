// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./LilnadNFT.sol";
import "./LoveToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title LoveDistributor – pulls MON from LilnadNFT rewardPool, mints LOVE, adds LP and distributes LOVE to users
/// @notice Simplified version (LP add liquidity call left as TODO, depends on DEX implementation)
contract LoveDistributor is Ownable, ReentrancyGuard {
    LilnadNFT public immutable game;
    LoveToken public immutable love;

    event SeasonExecuted(
        uint256 seasonId,
        uint256 monUsedForSeason,      // คือ address(this).balance ตอนเริ่ม
        uint256 totalLoveMinted,       // คือ monUsedForSeason * 2
        uint256 loveReservedForUsers,  // คือ monUsedForSeason
        uint256 loveAllocatedForLP     // คือ monUsedForSeason
    );
    event Claimed(uint256 seasonId, address user, uint256 amount);

    struct SeasonInfo {
        bytes32 root;
        uint256 loveReserved;   // รวมที่ยังไม่ได้ claim
    }

    mapping(uint256 => SeasonInfo) public seasons;
    mapping(uint256 => mapping(address => bool)) public claimed; // seasonId => user => claimed
    uint256 public seasonCounter;   // auto ++

    constructor(LilnadNFT _game, LoveToken _love) {
        game = _game;
        love = _love;
    }

    receive() external payable {}

    /// @dev Execute season reward distribution
    /// @param root Merkle root of the season
    /// @param totalLoveForUsersExpected Total LOVE to distribute
    function executeSeason(
        bytes32 root,
        uint256 totalLoveForUsersExpected
    ) external onlyOwner nonReentrant {
        uint256 monInRewardPool = address(this).balance;
        require(monInRewardPool > 0, "LoveDistributor: No MON in reward pool to start season");

        uint256 maxLove = monInRewardPool * 2;
        require(totalLoveForUsersExpected <= maxLove, "cap");

        // 2. mint LOVE
        love.mint(address(this), maxLove);

        uint256 loveForUsersDistribution = totalLoveForUsersExpected;
        uint256 loveForLP = monInRewardPool;
        uint256 burnLeft   = maxLove - loveForLP - loveForUsersDistribution;

        uint256 id = ++seasonCounter;
        seasons[id] = SeasonInfo({root: root, loveReserved: loveForUsersDistribution});

        if (burnLeft > 0) love.burn(burnLeft);

        emit SeasonExecuted(
            id,
            monInRewardPool,
            maxLove,
            loveForUsersDistribution,
            loveForLP
        );
    }

    function claim(uint256 seasonId, uint256 amount, bytes32[] calldata proof) external nonReentrant {
        SeasonInfo storage s = seasons[seasonId];
        require(!claimed[seasonId][msg.sender], "claimed");
        require(_verifyLeaf(s.root, _leaf(msg.sender, amount), proof), "bad proof");

        claimed[seasonId][msg.sender] = true;
        require(s.loveReserved >= amount, "exceed");
        s.loveReserved -= amount;

        love.transfer(msg.sender, amount);
        emit Claimed(seasonId, msg.sender, amount);
    }

    // ----- Merkle Helpers -----
    function _leaf(address account, uint256 amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, amount));
    }

    function _verifyLeaf(bytes32 root, bytes32 leaf, bytes32[] calldata proof) internal pure returns (bool) {
        return MerkleProof.verify(proof, root, leaf);
    }

    // ----- Owner Withdraw helpers -----
    /// @notice Withdraw ETH (MON) from contract to owner for manual LP add
    function withdrawEth(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "insufficient");
        (bool ok, ) = payable(owner()).call{value: amount}("");
        require(ok, "transfer fail");
    }

    /// @notice Withdraw LOVE tokens to owner for manual LP add
    function withdrawLove(uint256 amount) external onlyOwner {
        love.transfer(owner(), amount);
    }
} 