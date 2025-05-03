import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import cron from 'cron';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const prisma = new PrismaClient();

// Initialize ethers provider
const provider = new ethers.providers.JsonRpcProvider(process.env.MONAD_RPC_URL);
const gameAddress = process.env.GAME_CONTRACT_ADDRESS || '';
const gameABI = [ /* minimal ABI for events and call sbtInfo */ ];

// API: get leaderboard latest snapshot
app.get('/leaderboard', async (req, res) => {
  const snaps = await prisma.snapshot.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(snaps);
});

// Job: snapshot every 7 days
const job = new cron.CronJob('0 0 */7 * *', async () => {
  // fetch all tokens not dead
  const tokens = await prisma.token.findMany({ where: { isDead: false } });
  for (const t of tokens) {
    // call contract to get collected amount
    const collected = await provider.call({ to: gameAddress, data: /* encode call */ });
    await prisma.snapshot.create({ data: { tokenIdDB: t.id, score: parseFloat(ethers.utils.formatEther(collected)) } });
  }
});
job.start();

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Backend listening on ${port}`)); 