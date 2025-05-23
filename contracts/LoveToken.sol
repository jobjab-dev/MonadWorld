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

    /**
     * @dev Destroys `amount` tokens from `account`, deducting from the caller's
     * allowance.
     *
     * See {ERC20-_burn} and {ERC20-allowance}.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `amount`.
     */
    function burnFrom(address account, uint256 amount) public virtual {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        // Standard ERC20 practice is to approve the new allowance after checking.
        // _approve is an internal function and would be `_approve(account, msg.sender, currentAllowance - amount);`
        // However, more directly, we can just use the inherited `spendAllowance` from OpenZeppelin ERC20.sol if available (v4.9+)
        // For older versions or direct implementation:
        if (currentAllowance != type(uint256).max) { // Only if allowance is not infinite
             _approve(account, msg.sender, currentAllowance - amount);
        }
        _burn(account, amount);
    }
} 