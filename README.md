# Monad World Game

Web3 Idle-Game on **Monad Testnet**.

Players mint soul-bound characters (SBT), accumulate score over time, collect, appear on a weekly leaderboard and share the reward pool.

---

## ✨ Features

| Layer | Highlights |
| ----- | ---------- |
| **Smart-Contract** | Commit-Reveal mint (fair RNG)<br>Bulk Mint 10 + 1<br>Ranks UR→C with specific drop-rates<br>Continuous score & lifetime logic<br>Reward pool + distribute/claim |
| **Backend** | Node/Express + TypeScript<br>Prisma + PostgreSQL<br>Event indexer & 7-day snapshot cron<br>Leaderboard REST API |
| **Tests** | Hardhat + ethers v6 – 100 % passing |
| **CI/CD** | GitHub Actions (install → compile → test) |
| **Deploy** | Contract on Monad Testnet<br>Backend on Railway free tier |

---

## 📂 Directory Structure

```
.
├─ contracts/         # Solidity (GameSBT.sol)
├─ scripts/           # deploy.ts
├─ test/              # unit tests
├─ backend/
│   ├─ src/           # Express server
│   └─ prisma/        # Prisma schema
├─ hardhat.config.ts
└─ README.md
```

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
$ npx hardhat run scripts/deploy.ts --network monadTestnet
$ npx hardhat run scripts/deploy-love.ts --network monadTestnet
$ npx hardhat run scripts/deploy-distributor.ts --network monadTestnet
# ↳ prints contract address, copy for backend
```

---

## 🖥 Backend

```bash
$ cd backend
$ npm install

# .env (backend)
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
GAME_CONTRACT_ADDRESS=0xDeployedAddress
DATABASE_URL=postgresql://user:pass@host:5432/monadworld
PORT=3001

# migrate & start
$ npx prisma migrate deploy
$ npm run dev
```

API
```
GET /leaderboard
```

---

## 🚀 Railway Deployment (free)

1. **New Project → Deploy from GitHub repo** (root =`backend`).
2. Add **PostgreSQL** plugin.
3. Set env vars:
   ```
   MONAD_RPC_URL=https://testnet-rpc.monad.xyz
   GAME_CONTRACT_ADDRESS=0xDeployedAddress
   DATABASE_URL=${PGDATABASEURL}
   PORT=3001
   ```
4. *Redeploy* → backend live at `https://<project>.up.railway.app`.
5. Jobs → New → `node dist/index.js --snapshot` Cron `0 0 */7 * *`.

---

## 🛣 Roadmap
- [x] Contract logic + tests
- [x] Deploy on Monad Testnet
- [x] Backend snapshot & leaderboard
- [ ] Frontend (Next.js + wagmi v6)
- [ ] Love Tokenomics module & LP
- [ ] Security audit & bug bounty
- [ ] Mainnet launch

---

## License

MIT © 2025 Monad World Team 