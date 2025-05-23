# 🔐 MonadWorld Security Guide

## Security Overview

The MonadWorld project is designed with Defense in Depth security layers to protect against various threats.

## 🛡️ Existing Security Measures

### 1. Smart Contract Security
- ✅ **Access Control**: Uses OpenZeppelin `Ownable` modifier
- ✅ **Reentrancy Protection**: Uses `ReentrancyGuard` 
- ✅ **Commit-Reveal Scheme**: Prevents front-running in NFT minting
- ✅ **Standard Libraries**: Uses audited OpenZeppelin contracts

### 2. Admin Tool Security (admin-tool.html)
- 🔒 **Authentication Required**: Verifies contract ownership before access
- 🔒 **Visual Protection**: Content is blurred until verification passes
- 🔒 **IP Restriction**: Access limited via .htaccess  
- 🔒 **HTTPS Enforcement**: Forces HTTPS usage
- 🔒 **Security Headers**: X-Frame-Options, CSP, XSS Protection

### 3. Environment Security
- ✅ **Environment Variables**: Private keys stored in .env (gitignored)
- ✅ **File Protection**: Protects access to sensitive files
- ✅ **Directory Listing**: Disables directory content display

## ⚠️ Remaining Security Risks

### 1. Unlimited Token Minting
```solidity
function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
}
```
**Risk**: Owner can mint unlimited LOVE tokens  
**Mitigation**: Use Multisig wallet or Timelock

### 2. Open receive() Function  
```solidity
receive() external payable { 
    // Accepts MON from anyone
}
```
**Risk**: May receive unwanted funds  
**Mitigation**: Add access control or whitelist

## 🔧 Additional Security Improvements

### 1. Enable HTTP Basic Auth
```bash
# Create password file
htpasswd -c .htpasswd admin

# Edit .htaccess to uncomment AuthType lines
```

### 2. Restrict IP Address
Edit `.htaccess` file:
```apache
# Add your IP
Allow from YOUR_IP_ADDRESS
```

### 3. Use Multisig Wallet
Instead of using a single wallet as owner, use Multisig like Gnosis Safe

## 🚨 Emergency Procedures

### 1. If vulnerability found in contract
- Stop operations immediately (use pause functions)
- Transfer ownership to emergency multisig
- Notify community and prepare migration plan

### 2. If admin tool is compromised
- Change server passwords immediately
- Disable access to admin-tool.html
- Review transaction logs

### 3. If private key is leaked  
- Transfer ownership to new wallet immediately
- Move all funds out of old wallets
- Notify community and revoke permissions

## 📋 Security Checklist

### Before Deploy
- [ ] Audit contract code with tools like Slither
- [ ] Run 100% test coverage
- [ ] Set up Multisig wallet for ownership
- [ ] Prepare emergency procedures

### After Deploy  
- [ ] Verify contracts on block explorer
- [ ] Set up monitoring for unusual activities
- [ ] Backup private keys securely
- [ ] Inform community about security measures

### Daily Operations
- [ ] Always use HTTPS
- [ ] Verify wallet addresses before transactions
- [ ] Use hardware wallet for production
- [ ] Update dependencies regularly

## 🔗 References

- [OpenZeppelin Security Best Practices](https://docs.openzeppelin.com/contracts/4.x/security)
- [Ethereum Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Web3 Security Guide](https://www.web3security.io/)

## 📞 Security Contact

If you discover security vulnerabilities, please contact:
- Discord: (specify contact channel)

**DO NOT** disclose vulnerability information publicly until it has been resolved 

## 📋 **Who is Admin and Where is it Defined?**

### 🔑 **Admin = LilnadNFT Contract Owner**

MonadWorld uses a **simplified admin model** where:
- **Primary Admin Control**: LilnadNFT contract owner
- **Secondary Admin**: LoveDistributor contract owner (should be same as LilnadNFT)  
- **LoveToken Owner**: LoveDistributor contract (automated)

### 📍 **Where Admin is Defined:**

1. **Smart Contract Level**:
   - `LilnadNFT.sol`: Uses OpenZeppelin `Ownable` pattern
   - `LoveDistributor.sol`: Uses OpenZeppelin `Ownable` pattern
   - `LoveToken.sol`: Owner should be LoveDistributor contract

2. **Admin Tool Verification**:
   ```javascript
   // Only checks LilnadNFT ownership for efficiency
   const lilnadOwner = await lilnadContract.owner();
   const isAdmin = lilnadOwner.toLowerCase() === walletAddress.toLowerCase();
   ```

3. **Contract Deployment**:
   - Admin is set during contract deployment (constructor)
   - Default: The deployer's address becomes the initial owner

### 🔄 **How to Change Admin:**

**Method 1: Through Admin Tool**
- Use "Transfer Ownership" functions in the admin interface
- Requires current admin's signature

**Method 2: Direct Contract Call**
```solidity
lilnadContract.transferOwnership(newAdminAddress);
distributorContract.transferOwnership(newAdminAddress);
```

**Method 3: Multi-sig (Recommended)**
- Use Gnosis Safe or similar multi-signature wallet
- Transfer ownership to the multi-sig address
- Requires multiple signatures for admin actions 