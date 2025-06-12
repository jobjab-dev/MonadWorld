# MonadWorld

🎮 **NOW LIVE at [www.monadworld.xyz](https://www.monadworld.xyz)** 🚀

**📚 [Complete Documentation at docs.monadworld.xyz](https://docs.monadworld.xyz)** 📖

Web3 Idle-Game on **Monad Testnet**. MonadWorld is a Web3 project featuring Lilnad NFTs as unique Soul-Bound Tokens (SBTs), a point collection and rewards system, and a focus on community and game economy.

Players mint soul-bound characters (SBTs), accumulate score over time based on their rank, appear on weekly leaderboards and share reward pools.

## 🌐 Documentation

### 📖 **Complete Guides Available**
- **🇺🇸 English**: [docs.monadworld.xyz](https://docs.monadworld.xyz)
- **🇹🇭 ภาษาไทย**: [docs.monadworld.xyz/th/](https://docs.monadworld.xyz/th/)
- **🇨🇳 中文**: [docs.monadworld.xyz/zh/](https://docs.monadworld.xyz/zh/)

### 🚀 **Quick Links**
- **[Getting Started](https://docs.monadworld.xyz/getting-started/what-is-monadworld)** - Learn the basics
- **[How to Play](https://docs.monadworld.xyz/gameplay/nft-minting)** - Gameplay mechanics
- **[Security & Trust](https://docs.monadworld.xyz/security/overview)** - Safety measures
- **[Tokenomics](https://docs.monadworld.xyz/tokenomics/love-token)** - Economic model
- **[Developer Docs](https://docs.monadworld.xyz/developers/smart-contracts)** - Technical details

## 🎯 **Current Status: Season 0 - LIVE**
- ✅ **Website**: [www.monadworld.xyz](https://www.monadworld.xyz)
- ✅ **Smart Contracts**: Deployed on Monad Testnet
- ✅ **NFT Minting**: Active (1 MON per mint)
- ✅ **Point System**: Functional
- ✅ **Leaderboards**: Weekly updates
- 🔄 **Community Building**: In Progress
- 🔜 **LOVE Token**: Planned for later phases

## 🛡️ **Security & Trust**

MonadWorld prioritizes security and transparency:

- ✅ **OpenZeppelin Contracts**: Industry-standard smart contracts
- ✅ **Commit-Reveal Scheme**: Fair minting system
- ✅ **ReentrancyGuard**: Attack protection
- ✅ **Open Source**: All code on GitHub
- 🔄 **Professional Audit**: In progress
- 🔄 **Timelock & Multisig**: Being implemented

**📋 For complete security details, see [Security Documentation](https://docs.monadworld.xyz/security/overview)**

---

## ⚠️ **Important Disclaimers**

### Investment Warning
**MonadWorld tokens and NFTs are NOT investment securities:**
- ❌ Not guaranteed to have value
- ❌ Subject to total loss risk
- ❌ Experimental technology with regulatory uncertainty
- ⚠️ **Only invest what you can afford to lose**

### Project Status
- 🧪 **Season 0**: Currently in early testing phase
- 🔬 **Experimental**: Technology is still being refined
- 📊 **Community-Driven**: Success depends on community adoption
- ⏰ **No Fixed Timeline**: Development progresses as resources allow

---

## 🔗 **Official Channels**

### Primary Communication
- **Website**: [www.monadworld.xyz](https://www.monadworld.xyz) ✅ LIVE
- **Documentation**: [docs.monadworld.xyz](https://docs.monadworld.xyz) ✅ LIVE
- **GitHub**: [github.com/monadworld](https://github.com/monadworld) (This Repository)
- **Discord**: Coming Soon
- **Twitter**: Coming Soon

### Security & Support
- **Security Issues**: security@monadworld.xyz
- **General Support**: support@monadworld.xyz
- **Partnership Inquiries**: partnership@monadworld.xyz

**⚠️ Beware of impersonators! Always verify through official channels.**

---

## ⚙️ Development

### Prerequisites
* Node >= 18
* pnpm / npm 9
* Hardhat 2.16 + ethers v6
* (optional) PostgreSQL 14 for local backend

### Install & Test

```bash
# clone
$ git clone https://github.com/<yourUser>/MonadWorld.git
$ cd MonadWorld

# install root deps
$ npm install

# compile & run tests
$ npx hardhat compile
$ npx hardhat test
```

### Environment (root)
Create `.env` :
```ini
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
PRIVATE_KEY=0xYourPrivateKey
```

### Deploy Contract (Testnet)
```bash
# Deploy core contracts
$ npx hardhat run scripts/deploy-LilnadNFT.ts --network monadTestnet
$ npx hardhat run scripts/deploy-loveToken.ts --network monadTestnet
$ npx hardhat run scripts/deploy-distributor.ts --network monadTestnet

# Deploy security contracts
$ npx hardhat run scripts/deploy-timelock.ts --network monadTestnet

# Transfer ownership to timelock (IMPORTANT for security)
$ npx hardhat run scripts/transfer-to-timelock.ts --network monadTestnet
```

---

## 📚 **Documentation Development**

### Build Documentation Site
```bash
# Navigate to docs directory
$ cd docs

# Install dependencies
$ npm install

# Run development server
$ npm run dev

# Build for production
$ npm run build
```

### Adding New Content
1. Create new `.md` files in appropriate language folders
2. Update `.vitepress/config.ts` navigation
3. Follow existing content structure and style
4. Test locally before committing

---

## 🖥 Backend

```bash
$ cd backend
$ npm install

# .env.local (backend)
RPC_URL=https://testnet-rpc.monad.xyz
LILNAD_NFT_ADDRESS=0x9d42A97Ea4C4C46E6a9b8aEff308a756Bd16Cb7E
LOVE_TOKEN_ADDRESS=0x7D020ffA3196E6b1C2eF85dE44D24e3cd9645487
LOVE_DISTRIBUTOR_ADDRESS=0x35A553462Dced1889a086daAe0469873c1A73a0D
DATABASE_URL=postgresql://user:pass@host:5432/monadworld
PORT=3001
RUN_INDEXER=true
INDEXER_START_BLOCK=0
FRONTEND_BASE_URL=http://localhost:3000
BACKEND_PUBLIC_URL=http://localhost:3001

# migrate & start
$ npx prisma migrate deploy
$ npm run dev
```

API
```
GET /api/nfts/owner/:ownerAddress
GET /api/metadata/lilnad/:tokenId
GET /leaderboard
```

---

## 🚀 Railway Deployment (free)

1. **New Project → Deploy from GitHub repo** (root =`backend`).
2. Add **PostgreSQL** plugin.
3. Set env vars:
   ```
   RPC_URL=https://testnet-rpc.monad.xyz
   LILNAD_NFT_ADDRESS=0x9d42A97Ea4C4C46E6a9b8aEff308a756Bd16Cb7E
   DATABASE_URL=${PGDATABASEURL}
   PORT=3001
   RUN_INDEXER=true
   INDEXER_START_BLOCK=0
   FRONTEND_BASE_URL=https://monadworld.xyz
   BACKEND_PUBLIC_URL=https://<your-backend-domain>
   ```
4. *Redeploy* → backend live at `https://<project>.up.railway.app`.
5. Jobs → New → `node dist/index.js --snapshot` Cron `0 0 */7 * *`.

---

## 🛣 Project Roadmap

### Current Phase: Season 0 (Testnet Focus)
We are currently in Season 0, an initial phase with no set end date. This phase focuses on building our player base and refining core mechanics before $LOVE token launch.

**Important:** Season 0 will conclude when Monad announces its mainnet launch. We will take a snapshot of all player data on that day.

*   **Security:** Enhancing Smart Contract security with audits and timelock governance
*   **Core Logic:** Refining minting and SBT mechanics
*   **Performance:** Optimizing blockchain data fetching
*   **UX Improvements:** Point collection and NFT status visibility
*   **Community Building:** Attracting and engaging a sufficient player base
*   **Documentation:** Comprehensive multi-language guides

### $LOVE Token Implementation
The next major milestone after Season 0 will be the launch of our $LOVE token. This will only happen once we reach a critical mass of active players.

*   **Prerequisites:** Minimum active player count threshold
*   **Token Launch:** ERC20 $LOVE token deployment with proper tokenomics
*   **Liquidity:** Creation of MON/LOVE trading pair
*   **Reward System:** Seasonal point-based reward distribution

### Future Phases
*   **Season Structure:** Defined seasons with clear start/end dates after $LOVE launch
*   **Rewards System:** Full seasonal LOVE token implementation
*   **Off-chain Tools:** Scripts for reward calculations, lottery draws, and Merkle Tree generation
*   **Frontend:** User-friendly reward claim system
*   **Quality Assurance:** Testing, security audits, community feedback
*   **Launch:** Mainnet deployment of MonadWorld!

---

## License

MIT © 2025 MonadWorld Team

---

## 🚨 **Final Reminders**

1. **Never invest more than you can afford to lose**
2. **Always verify information through official channels**
3. **Report suspicious activity to our security team**
4. **Understand that this is experimental technology**
5. **Participate responsibly in the community**

**Build together, grow together, succeed together! 🚀** 

---

**📚 [Read Complete Documentation at docs.monadworld.xyz](https://docs.monadworld.xyz)** 📖 