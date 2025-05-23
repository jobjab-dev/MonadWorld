# MonadWorld

Web3 Idle-Game on **Monad Testnet**. MonadWorld is a Web3 project on the Monad blockchain featuring Lilnad NFTs as unique Soul-Bound Tokens (SBTs), a point collection and rewards system, an engaging pixel art experience, and a focus on community and game economy.

Players mint soul-bound characters (SBTs), accumulate score over time based on their rank, appear on a weekly leaderboard and share the reward pool.

---

## ✨ The MonadWorld Ecosystem

### Frontend (Your Gateway)
The web app technology stack:
*   Next.js App Router, React, TypeScript
*   Tailwind CSS for styling
*   Wagmi hooks for seamless on-chain calls

Key components:
*   **MintPage:** Commit-reveal flow (commitMintSingle/10/25 and revealMint*) with localStorage pack persistence and three static expired-reveal cards.
*   **CollectionPage:** SWR hook `useOwnedNfts` calls `/api/nfts/owner/:ownerAddress` and displays NFTs via `SbtCard`.
*   **SbtCard:** Calculates points/minute using `calculateNftPoints` (totalPoints/lifetimeSecs*60), formats numbers with `toLocaleString()`, and uses Pixelify_Sans & VT323 pixel-style fonts.

### Backend (The Engine Room)
Backend components:
*   **Stack:** Node.js, Express, Prisma, PostgreSQL
*   **API Endpoints:** `/api/nfts/owner/:ownerAddress`
*   **Indexer:** Built with viem to decode on-chain events
*   **Events:** RevealAndMint, Transfer, Collected
*   **Performance:** `contractDataCache` for rank data, Bottleneck for rate-limiting

### Smart Contracts (The Rulebook on Blockchain)
*   **`LilnadNFT.sol` (Your NFTs):** Primary NFT contract for Lilnad tokens, commit-reveal system for fair rank assignment, point accrual based on token rank, Soul-Bound Token lifecycle management.
*   **`LoveToken.sol` (Reward Currency):** ERC20 token named LOVE, official reward currency, earned through gameplay and point collection.
*   **`LoveDistributor.sol` (Reward Payouts):** Handles seasonal LOVE token distribution, uses MON from minting fees to mint LOVE tokens, distributes rewards based on player points, implements Merkle Tree system for verification.

---

## 📂 Directory Structure

```
.
├─ contracts/         # Solidity (LilnadNFT.sol, LoveToken.sol, LoveDistributor.sol)
├─ scripts/           # deploy.ts
├─ test/              # unit tests
├─ backend/
│   ├─ src/           # Express server
│   └─ prisma/        # Prisma schema
├─ frontend/          # Next.js frontend
├─ hardhat.config.ts
└─ README.md
```

---

## 🫂 Community & Player Engagement

### Building the Community
Our strategy for Season 0:
*   **User Acquisition:** Attracting active players through incentives and engaging gameplay
*   **Retention:** Creating compelling reasons for players to return daily
*   **Education:** Helping players understand how ranking and points work
*   **Feedback Loop:** Constantly improving based on community input

### Player Incentives During Season 0
While building toward $LOVE token:
*   **Leaderboard Recognition:** Top players highlighted
*   **Early Adopter Benefits:** Special recognition for Season 0 participants
*   **Community Events:** Regular activities to maintain engagement
*   **Point Accumulation:** Building up points that will be valuable when $LOVE launches
*   **Mainnet Snapshot:** Your status and points will be captured when Monad announces mainnet, marking the end of Season 0

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
$ npx hardhat run scripts/deploy-LilnadNFT.ts --network monadTestnet
$ npx hardhat run scripts/deploy-loveToken.ts --network monadTestnet
$ npx hardhat run scripts/deploy-distributor.ts --network monadTestnet
# ↳ prints contract address, copy for backend
```

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
**Important:** Season 0 will conclude on the day Monad announces its mainnet launch. We will take a snapshot of all player data on that day, which will be used for future rewards and benefits.
*   **Security:** Enhancing Smart Contract security
*   **Core Logic:** Refining minting and SBT mechanics
*   **Performance:** Optimizing blockchain data fetching
*   **UX Improvements:** Point collection and NFT status visibility
*   **Community Building:** Attracting and engaging a sufficient player base

### $LOVE Token Implementation
The next major milestone after Season 0 will be the launch of our $LOVE token. This will only happen once we reach a critical mass of active players.
*   **Prerequisites:** Minimum active player count threshold
*   **Token Launch:** ERC20 $LOVE token deployment
*   **Liquidity:** Creation of MON/LOVE trading pair
*   **Reward System:** Seasonal point-based reward distribution

### Future Phases
*   **Season Structure:** Defined seasons with clear start/end dates after $LOVE launch
*   **Rewards System:** Full seasonal LOVE token implementation
*   **Off-chain Tools:** Scripts for reward calculations, lottery draws, and Merkle Tree generation
*   **Frontend:** User-friendly reward claim system allowing winners to claim prizes 2-3 days after season end
*   **Quality Assurance:** Testing, security audits, community feedback
*   **Launch:** Mainnet deployment of MonadWorld!

---

## License

MIT © 2025 Monad World Team 