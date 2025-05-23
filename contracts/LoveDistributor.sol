// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILoveToken is IERC20 {
    function mint(address to, uint256 amt) external;
    function burn(uint256 amt) external;
}

contract LoveDistributor is Ownable, ReentrancyGuard {
    /* ───────────────────────── State ───────────────────────── */
    ILoveToken public immutable love;        // LOVE token
    address public gameContractAddress; // << ADDED gameContractAddress state variable
    bool      public isActive = true;        // pause switch
    uint256   public season;                 // incremental id

    struct SeasonInfo {
        bytes32 root;        // merkle root สำหรับ claim
        uint256 loveLeft;    // LOVE ที่กันไว้รอผู้เล่น
    }
    mapping(uint256 => SeasonInfo) public seasons;
    mapping(uint256 => mapping(uint256 => uint256)) private claimedBitmap; // season => (word => bits)

    /* ───────────────────────── Events ───────────────────────── */
    event GameContractAddressSet(address indexed oldGameAddress, address indexed newGameAddress); // << ADDED Event
    event DistributorPaused(bool active);
    event SeasonExecuted(uint256 indexed season, bytes32 merkleRoot, uint256 monIn, uint256 loveForUsers, uint256 loveForLP);
    event Claimed(uint256 indexed season, address indexed user, uint256 amount);
    event MigratedEth(uint256 amount);
    event MigratedLove(uint256 amount);

    /* ───────────────────────── Errors ───────────────────────── */
    error DistributorPausedErr();
    error AlreadyClaimed();
    error InvalidProof();
    error EthTransferFailed();
    error LoveTransferFailed();
    error ZeroAddress();
    error AmountMustBeGreaterThanZero();
    error InvalidArgument();

    /* ───────────────────────── Constructor ───────────────────────── */
    constructor(address _initialGameContractAddress, address _loveTokenAddress) {
        if (_initialGameContractAddress == address(0)) revert ZeroAddress();
        if (_loveTokenAddress == address(0)) revert ZeroAddress();
        
        gameContractAddress = _initialGameContractAddress;
        love = ILoveToken(_loveTokenAddress);
        emit GameContractAddressSet(address(0), _initialGameContractAddress);
    }

    /* ───────────────────────── Modifiers ───────────────────────── */
    modifier whenActive() {
        if (!isActive) revert DistributorPausedErr();
        _;
    }

    /* ───────────────────────── Admin Functions ───────────────────────── */
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
        emit DistributorPaused(_active);
    }

    function setGameContractAddress(address _newGameContractAddress) external onlyOwner {
        if (_newGameContractAddress == address(0)) revert ZeroAddress();
        address oldAddress = gameContractAddress;
        gameContractAddress = _newGameContractAddress;
        emit GameContractAddressSet(oldAddress, _newGameContractAddress);
    }

    /* ───────────────────────── Core: open season ───────────────────────── */
    function executeSeason(bytes32 root, uint256 loveForUsers)
        external
        onlyOwner
        nonReentrant
        whenActive
    {
        uint256 monIn = address(this).balance;
        if (monIn == 0) revert AmountMustBeGreaterThanZero();
        uint256 loveToMintTotal = monIn * 2;

        if (loveForUsers > loveToMintTotal / 2) revert InvalidArgument();
        uint256 loveForLP = loveToMintTotal / 2;

        love.mint(address(this), loveToMintTotal);

        seasons[++season] = SeasonInfo({
            root:     root,
            loveLeft: loveForUsers
        });

        uint256 burnAmt = loveToMintTotal - loveForUsers - loveForLP;
        if (burnAmt > 0) love.burn(burnAmt);

        emit SeasonExecuted(season, root, monIn, loveForUsers, loveForLP);
    }

    /* ───────────────────────── Claim LOVE ───────────────────────── */
    function claim(
        uint256 _season,
        uint256 index,
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant whenActive {
        SeasonInfo storage s = seasons[_season];
        if (s.loveLeft < amount) revert InvalidArgument();

        uint256 word = index / 256;
        uint256 bit  = 1 << (index % 256);
        if (claimedBitmap[_season][word] & bit != 0) revert AlreadyClaimed();
        claimedBitmap[_season][word] |= bit;

        bytes32 leaf = keccak256(abi.encodePacked(index, msg.sender, amount));
        if (!MerkleProof.verifyCalldata(proof, s.root, leaf)) revert InvalidProof();

        s.loveLeft -= amount;
        if (!love.transfer(msg.sender, amount)) revert LoveTransferFailed();
        emit Claimed(_season, msg.sender, amount);
    }

    /* ───────────────────────── Withdraw MON / LOVE (for LP or migrate) ───────────────────────── */
    function withdrawEth(uint256 amt) external onlyOwner nonReentrant {
        if (amt == 0 || amt > address(this).balance) revert InvalidArgument();
        (bool ok, ) = payable(msg.sender).call{value: amt}("");
        if (!ok) revert EthTransferFailed();
        emit MigratedEth(amt);
    }

    function withdrawLove(uint256 amt) external onlyOwner nonReentrant {
        if (amt == 0 || amt > love.balanceOf(address(this))) revert InvalidArgument();
        if (!love.transfer(msg.sender, amt)) revert LoveTransferFailed();
        emit MigratedLove(amt);
    }

    /* ───────────────────────── Fallback ───────────────────────── */
    receive() external payable { 
        // Consider adding onlyGame or onlyOwner if direct deposits should be restricted
        // For now, it matches the user's provided version which accepts any MON
    }
}
