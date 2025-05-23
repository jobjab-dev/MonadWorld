'use client';

import Link from 'next/link';
import { VT323 } from 'next/font/google';

// VT323 pixel-style font for Docs (CSS variable)
const vt323 = VT323({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-vt323',
});

export default function DocsPage() {
  return (
    <div className={`${vt323.variable} min-h-screen bg-pixel-bg text-pixel-text p-4 sm:p-6 md:p-10`}>
      <div className="docs-container">
        
        <div className="docs-main-title-container">
          <h1 className="docs-h1">MonadWorld Documentation</h1>
        </div>

        {/* Section 1: Overview */}
        <section className="mb-12 md:mb-16">
          <h2 className="docs-h2">1. Overview</h2>
          <p className="docs-paragraph">
            MonadWorld is a Web3 project on the Monad blockchain featuring:
          </p>
          <ul className="docs-list">
            <li>Lilnad NFTs as unique Soul-Bound Tokens (SBTs)</li>
            <li>Point collection and rewards system</li>
            <li>Engaging pixel art experience</li>
            <li>Focus on community and game economy</li>
          </ul>
        </section>

        <hr className="docs-section-divider" />

        {/* Section 2: Architecture */}
        <section className="mb-12 md:mb-16">
          <h2 className="docs-h2">2. The MonadWorld Ecosystem</h2>
          
          <div className="mb-8">
            <h3 className="docs-h3">2.1 Frontend (Your Gateway)</h3>
            <p className="docs-paragraph">The web app technology stack:</p>
            <ul className="docs-list">
              <li>Next.js App Router, React, TypeScript</li>
              <li>Tailwind CSS for styling</li>
              <li>Wagmi hooks for seamless on-chain calls</li>
            </ul>
            <p className="docs-paragraph">Key components:</p>
            <ul className="docs-list">
              <li><strong>MintPage:</strong> Commit-reveal flow (commitMintSingle/10/25 and revealMint*) with localStorage pack persistence and three static expired-reveal cards.</li>
              <li><strong>CollectionPage:</strong> SWR hook <code>useOwnedNfts</code> calls <code>/api/nfts/owner/:ownerAddress</code> and displays NFTs via <code>SbtCard</code>.</li>
              <li><strong>SbtCard:</strong> Calculates points/minute using <code>calculateNftPoints</code> (totalPoints/lifetimeSecs*60), formats numbers with <code>toLocaleString()</code>, and uses Pixelify_Sans & VT323 pixel-style fonts.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="docs-h3">2.2 Backend (The Engine Room)</h3>
            <p className="docs-paragraph">Backend components:</p>
            <ul className="docs-list">
              <li><strong>Stack:</strong> Node.js, Express, Prisma, PostgreSQL</li>
              <li><strong>API Endpoints:</strong> <code>/api/nfts/owner/:ownerAddress</code></li>
              <li><strong>Indexer:</strong> Built with viem to decode on-chain events</li>
              <li><strong>Events:</strong> RevealAndMint, Transfer, Collected</li>
              <li><strong>Performance:</strong> <code>contractDataCache</code> for rank data, Bottleneck for rate-limiting</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="docs-h3">2.3 Smart Contracts (The Rulebook on Blockchain)</h3>
            <div className="docs-contract-section">
              <div className="docs-contract-item">
                <h4 className="docs-h4">`LilnadNFT.sol` (Your NFTs)</h4>
                <ul className="docs-list">
                  <li>Primary NFT contract for Lilnad tokens</li>
                  <li>Commit-reveal system for fair rank assignment</li>
                  <li>Point accrual based on token rank</li>
                  <li>Soul-Bound Token lifecycle management</li>
                </ul>
              </div>
              <div className="docs-contract-item">
                <h4 className="docs-h4">`LoveToken.sol` (Reward Currency)</h4>
                <ul className="docs-list">
                  <li>ERC20 token named LOVE</li>
                  <li>Official reward currency</li>
                  <li>Earned through gameplay and point collection</li>
                </ul>
              </div>
              <div className="docs-contract-item">
                <h4 className="docs-h4">`LoveDistributor.sol` (Reward Payouts)</h4>
                <ul className="docs-list">
                  <li>Handles seasonal LOVE token distribution</li>
                  <li>Uses MON from minting fees to mint LOVE tokens</li>
                  <li>Distributes rewards based on player points</li>
                  <li>Implements Merkle Tree system for verification</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <hr className="docs-section-divider" />
        
        {/* Section 3: Community Strategy */}
        <section className="mb-12 md:mb-16">
          <h2 className="docs-h2">3. Community & Player Engagement</h2>
          
          <div className="mb-8">
            <h3 className="docs-h3">3.1 Building the Community</h3>
            <p className="docs-paragraph">Our strategy for Season 0:</p>
            <ul className="docs-list">
              <li><strong>User Acquisition:</strong> Attracting active players through incentives and engaging gameplay</li>
              <li><strong>Retention:</strong> Creating compelling reasons for players to return daily</li>
              <li><strong>Education:</strong> Helping players understand how ranking and points work</li>
              <li><strong>Feedback Loop:</strong> Constantly improving based on community input</li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="docs-h3">3.2 Player Incentives During Season 0</h3>
            <p className="docs-paragraph">While building toward $LOVE token:</p>
            <ul className="docs-list">
              <li><strong>Leaderboard Recognition:</strong> Top players highlighted</li>
              <li><strong>Early Adopter Benefits:</strong> Special recognition for Season 0 participants</li>
              <li><strong>Community Events:</strong> Regular activities to maintain engagement</li>
              <li><strong>Point Accumulation:</strong> Building up points that will be valuable when $LOVE launches</li>
              <li><strong>Mainnet Snapshot:</strong> Your status and points will be captured when Monad announces mainnet, marking the end of Season 0</li>
            </ul>
          </div>
        </section>

        <hr className="docs-section-divider" />

        {/* Section 4: Roadmap */}
        <section className="mb-12 md:mb-16">
          <h2 className="docs-h2">4. Project Roadmap</h2>
          <div className="space-y-6">
            <div>
              <h3 className="docs-h3">Current Phase: Season 0 (Testnet Focus)</h3>
              <p className="docs-paragraph">We are currently in Season 0, an initial phase with no set end date. This phase focuses on building our player base and refining core mechanics before $LOVE token launch.</p>
              <p className="docs-paragraph"><strong className="text-pixel-accent">Important:</strong> Season 0 will conclude on the day Monad announces its mainnet launch. We will take a snapshot of all player data on that day, which will be used for future rewards and benefits.</p>
              <ul className="docs-list">
                <li><strong>Security:</strong> Enhancing Smart Contract security</li>
                <li><strong>Core Logic:</strong> Refining minting and SBT mechanics</li>
                <li><strong>Performance:</strong> Optimizing blockchain data fetching</li>
                <li><strong>UX Improvements:</strong> Point collection and NFT status visibility</li>
                <li><strong>Community Building:</strong> Attracting and engaging a sufficient player base</li>
              </ul>
            </div>
            <div>
              <h3 className="docs-h3">$LOVE Token Implementation</h3>
              <p className="docs-paragraph">The next major milestone after Season 0 will be the launch of our $LOVE token. This will only happen once we reach a critical mass of active players.</p>
              <ul className="docs-list">
                <li><strong>Prerequisites:</strong> Minimum active player count threshold</li>
                <li><strong>Token Launch:</strong> ERC20 $LOVE token deployment</li>
                <li><strong>Liquidity:</strong> Creation of MON/LOVE trading pair</li>
                <li><strong>Reward System:</strong> Seasonal point-based reward distribution</li>
              </ul>
            </div>
            <div>
              <h3 className="docs-h3">Future Phases</h3>
              <ul className="docs-list">
                <li><strong>Season Structure:</strong> Defined seasons with clear start/end dates after $LOVE launch</li>
                <li><strong>Rewards System:</strong> Full seasonal LOVE token implementation</li>
                <li><strong>Off-chain Tools:</strong> Scripts for reward calculations, lottery draws, and Merkle Tree generation</li>
                <li><strong>Frontend:</strong> User-friendly reward claim system allowing winners to claim prizes 2-3 days after season end</li>
                <li><strong>Quality Assurance:</strong> Testing, security audits, community feedback</li>
                <li><strong>Launch:</strong> Mainnet deployment of MonadWorld!</li>
              </ul>
            </div>
          </div>
        </section>
        
        <div className="docs-back-button-container">
            <Link href="/" className="docs-back-button">
              Back to Home
            </Link>
        </div>

        {/* Override fonts in docs container to VT323 */}
        <style jsx global>{`
          .docs-container h1,
          .docs-container h2,
          .docs-container h3,
          .docs-container h4,
          .docs-container h5,
          .docs-container h6,
          .docs-container p,
          .docs-container li,
          .docs-container a {
            font-family: 'VT323', monospace !important;
          }
        `}</style>
      </div>
    </div>
  );
} 