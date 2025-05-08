// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LOVE Token – Unlimited supply, minted each Season in proportion to MON
contract LoveToken is ERC20, Ownable {
    constructor() ERC20("Love Token", "LOVE") {}

    /// @notice Mint new LOVE (only owner, i.e., LoveDistributor or multisig)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Burn LOVE from caller
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
} 