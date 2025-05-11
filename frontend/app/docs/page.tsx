'use client';

import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-pixel-bg text-pixel-text font-pixel p-4 sm:p-6 md:p-10">
      <div className="docs-container">
        
        <div className="docs-main-title-container">
          <h1 className="docs-h1">MonadWorld Documentation</h1>
        </div>

        {/* Section 1: Overview */}
        <section className="mb-12 md:mb-16">
          <h2 className="docs-h2">1. Overview</h2>
          <p className="docs-paragraph">
            MonadWorld is a Web3 project centered around Lilnad NFTs, unique Soul-Bound Tokens (SBTs) that allow users to collect, earn scores, and compete for rewards within an interactive ecosystem on the Monad blockchain. The project aims to deliver an engaging pixel art experience with a focus on community and a rewarding game economy.
          </p>
          <h3 className="docs-h3">Key Objectives:</h3>
          <ul className="docs-list">
            <li>Providing a fun and engaging NFT collection experience.</li>
            <li>Implementing a fair and exciting reward system through seasonal snapshots and Love Token distribution.</li>
            <li>Building a secure and efficient platform on the Monad Testnet, with plans for Mainnet deployment.</li>
          </ul>
        </section>

        <hr className="docs-section-divider" />

        {/* Section 2: Architecture */}
        <section className="mb-12 md:mb-16">
          <h2 className="docs-h2">2. The MonadWorld Ecosystem</h2>
          
          <div className="mb-8">
            <h3 className="docs-h3">2.1 Frontend (Your Gateway)</h3>
            <p className="docs-paragraph">The website you are using! Built with modern web technologies (Next.js, React, TypeScript, Tailwind CSS) to provide a smooth, pixel-perfect experience for minting, collecting, and interacting with your Lilnad NFTs.</p>
          </div>

          <div className="mb-8">
            <h3 className="docs-h3">2.2 Backend (The Engine Room)</h3>
            <p className="docs-paragraph">Works behind the scenes (Node.js, Express.js, Prisma) to manage data, provide information to the website, and interact with the blockchain when needed. It includes an indexer to keep track of NFT data efficiently in a PostgreSQL database.</p>
          </div>

          <div className="mb-6">
            <h3 className="docs-h3">2.3 Smart Contracts (The Rulebook on Blockchain)</h3>
            <div className="docs-contract-section">
              <div className="docs-contract-item">
                <h4 className="docs-h4">`LilnadNFT.sol` (Your NFTs)</h4>
                <p className="docs-sub-paragraph">This is where your Lilnad NFTs live. It handles minting (with a commit-reveal system for fair rank assignment), how scores are accrued over time based on rank, and the lifecycle of your Soul-Bound Tokens.</p>
              </div>
              <div className="docs-contract-item">
                <h4 className="docs-h4">`LoveToken.sol` (Reward Currency)</h4>
                <p className="docs-sub-paragraph">The official reward token of MonadWorld, an ERC20 token named LOVE. You earn this by participating in the game and collecting scores with your Lilnads!</p>
              </div>
              <div className="docs-contract-item">
                <h4 className="docs-h4">`LoveDistributor.sol` (Reward Payouts)</h4>
                <p className="docs-sub-paragraph">This contract is responsible for the seasonal distribution of LOVE tokens. It uses MON (from a portion of minting fees) to mint LOVE and then distributes these rewards to eligible players based on their scores, using a Merkle Tree system for verification.</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="docs-section-divider" />
        
        {/* Section 3: Gameplay & Rewards */}
        <section className="mb-12 md:mb-16">
          <h2 className="docs-h2">3. Gameplay & Rewards</h2>
          
          <div className="mb-8">
            <h3 className="docs-h3">3.1 Minting Your Lilnad NFT</h3>
            <p className="docs-paragraph">New Lilnad NFTs are minted using a secure Commit-Reveal process. This ensures fairness in rank assignment, making it exciting to see what rank your new Lilnad will be! If you don\'t complete the reveal process in time, your NFT will still be minted but will receive the lowest rank.</p>
            <p className="docs-sub-paragraph">Available packs (subject to change on Testnet): Single Mint, Pack 10 (+1 Bonus), Pack 25 (+3 Bonus).</p>
          </div>

          <div className="mb-8">
            <h3 className="docs-h3">3.2 Soul-Bound Tokens (SBTs) & Scoring</h3>
            <p className="docs-paragraph">Your Lilnad NFTs are Soul-Bound Tokens. They accrue scores over time based on their rank – the higher the rank, the faster the score accrual! </p>
            <p className="docs-sub-paragraph">Make sure to `collect()` your scores periodically. Each NFT has a defined lifecycle and will eventually stop accruing scores (become "dead").</p>
          </div>

          <div className="mb-8">
            <h3 className="docs-h3">3.3 Seasonal Rewards with Love Tokens (LOVE)</h3>
            <p className="docs-paragraph">MonadWorld features an exciting seasonal reward system!</p>
            <ul className="docs-list">
              <li>**Snapshots:** Player scores are recorded every 7 days.</li>
              <li>**Reward Pool & LOVE Generation:** All MON collected from LilnadNFT minting fees (after a 5% development fee) is designated for the seasonal rewards. For every 1 MON allocated to a season, 2 LOVE tokens are minted by the `LoveDistributor` contract.</li>
              <li>**Liquidity Provision (LP):** The entirety of the seasonal MON (from the reward pool) along with an equivalent amount of the newly minted LOVE (i.e., 1 MON : 1 LOVE ratio from the minted total) are used to provide liquidity for the MON/LOVE trading pair on a Decentralized Exchange. This creates a foundational market for LOVE tokens.</li>
              <li>**Player Rewards:** The remaining LOVE tokens (the other half of the total minted LOVE after LP provision) are then distributed to the top 70% of players based on their collected scores during that season.</li>
              <li>**Lottery-Style Distribution:** Your collected score acts like lottery tickets (1 score = 1 ticket). While you can only win one prize tier per season, having more tickets significantly increases your chances of winning a higher-tier prize! The exact prize structure is determined off-chain for each season.</li>
            </ul>
          </div>
           <div className="mb-6">
            <h3 className="docs-h3">3.4 (Planned) NFT Expiration & Collect All</h3>
            <p className="docs-sub-paragraph">We\'re working on features to clearly show when your NFTs will stop accruing scores. A "Collect All" button is also planned to make score collection easier if you own many Lilnads!</p>
          </div>
        </section>

        <hr className="docs-section-divider" />

        {/* Section 4: Roadmap */}
        <section className="mb-10">
          <h2 className="docs-h2">4. Project Roadmap</h2>
          <div className="space-y-6">
            <div>
              <h3 className="docs-h3">Current Phase (Testnet Focus)</h3>
              <ul className="docs-list">
                <li>Ongoing Smart Contract security enhancements and adjustments to core minting and SBT logic.</li>
                <li>Optimizing how data is fetched from the blockchain and displayed on the website for improved performance and user experience.</li>
                <li>Improving features like score collection and providing clear NFT status visibility (e.g., upcoming expiration).</li>
              </ul>
            </div>
            <div>
              <h3 className="docs-h3">Future Phases</h3>
              <ul className="docs-list">
                <li>Full implementation and rollout of the seasonal LOVE token reward system, including off-chain scripts for reward calculations and Merkle Tree generation.</li>
                <li>Integration of a user-friendly reward claim system on the frontend.</li>
                <li>Comprehensive testing, security audits, and community feedback rounds.</li>
                <li>Eventual Mainnet Launch of MonadWorld, bringing the complete experience to a wider audience!</li>
              </ul>
            </div>
          </div>
        </section>
        
        <div className="docs-back-button-container">
            <Link href="/" className="docs-back-button">
              Back to Home
            </Link>
        </div>

      </div>
    </div>
  );
} 