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
        
        {/* Section 3: Gameplay & Rewards */}
        <section className="mb-12 md:mb-16">
          <h2 className="docs-h2">3. Gameplay & Rewards</h2>
          
          <div className="mb-8">
            <h3 className="docs-h3">3.1 Minting Your Lilnad NFT</h3>
            <p className="docs-paragraph">Minting process:</p>
            <ul className="docs-list">
              <li><strong>Step 1:</strong> Call <code>commitMintSingle</code>, <code>commitMint10</code>, or <code>commitMint25</code></li>
              <li><strong>Step 2:</strong> Call <code>revealMint*</code> to receive a random rank</li>
              <li><strong>Late reveals:</strong> Players who fail to reveal within 64 blocks (approximately 32 seconds) will be penalized and assigned an F rank.</li>
            </ul>
            <p className="docs-paragraph">Pack options:</p>
            <ul className="docs-list">
              <li><strong>Single:</strong> One NFT</li>
              <li><strong>Ten Pack:</strong> 10+1 bonus NFT</li>
              <li><strong>Mega Pack:</strong> 25+3 bonus NFTs</li>
              <li>Expired-reveal slots shown as static cards</li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="docs-h3">3.2 Soul-Bound Tokens (SBTs) & Scoring</h3>
            <p className="docs-paragraph">Point system:</p>
            <ul className="docs-list">
              <li><strong>Passive Points:</strong> Points accumulate automatically without needing to collect</li>
              <li><strong>Accrual rate:</strong> Points per second = <code>S/T</code> (totalPoints/lifetimeSecs)</li>
              <li><strong>Display:</strong> Points/minute via <code>calculateNftPoints</code></li>
              <li><strong>Expiration:</strong> No more points accrue after expiry date</li>
              <li><strong>Formatting:</strong> 2 decimals with thousands separators in the UI</li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="docs-h3">3.3 Seasonal Rewards with Love Tokens (LOVE)</h3>
            <p className="docs-paragraph">MonadWorld's seasonal reward system:</p>
            <ul className="docs-list">
              <li><strong>Snapshots:</strong> Player points recorded every 7 days</li>
              <li><strong>Reward Pool:</strong> MON from minting fees (minus 5% dev fee)</li>
              <li><strong>LOVE Generation:</strong> 1 MON creates 2 LOVE tokens</li>
              <li><strong>Liquidity Provision:</strong> 
                <ul className="docs-list docs-list-sm">
                  <li>Seasonal MON + half of minted LOVE provide liquidity</li>
                  <li>Creates MON/LOVE trading pair on DEX</li>
                </ul>
              </li>
              <li><strong>Player Rewards:</strong>
                <ul className="docs-list docs-list-sm">
                  <li>The other half of minted LOVE tokens are used for player rewards</li>
                  <li>All rewards are distributed through a lottery system</li>
                  <li>Rewards based on total points accumulated during the season</li>
                  <li>Higher ranks give better point accrual rates, leading to better rewards</li>
                  <li>Seasonal snapshots capture your point totals for reward calculations</li>
                  <li>Players can view their total entry tickets on the leaderboard</li>
                </ul>
              </li>
              <li><strong>Lottery System:</strong>
                <ul className="docs-list docs-list-sm">
                  <li><strong>Entry Method:</strong> 1 point = 1 lottery ticket</li>
                  <li><strong>Eligibility:</strong> All players are eligible, regardless of ranking</li>
                  <li><strong>Chance-based:</strong> Players may or may not win, depending on their luck and number of tickets</li>
                  <li><strong>Probability:</strong> More points = more tickets = higher chance of winning</li>
                  <li><strong>Reward Claiming:</strong> Winners can claim their rewards 2-3 days after season ends</li>
                  <li><strong>Distribution:</strong> LOVE tokens claimed through the platform and sent to winners' wallets</li>
                  <li><strong>Prize Structure:</strong> Determined off-chain for each season</li>
                </ul>
              </li>
            </ul>
          </div>
           <div className="mb-8">
            <h3 className="docs-h3">3.4 NFT Expiration & Passive Points</h3>
            <p className="docs-paragraph">User experience improvements:</p>
            <ul className="docs-list">
              <li><strong>Expiration Display:</strong> Clearly shown on each SbtCard</li>
              <li><strong>Passive Earning:</strong> Points accrue automatically without manual collection</li>
              <li><strong>Real-time Updates:</strong> Point totals update in real-time on the UI</li>
            </ul>
          </div>
        </section>

        <hr className="docs-section-divider" />

        {/* Section 4: Roadmap */}
        <section className="mb-12 md:mb-16">
          <h2 className="docs-h2">4. Project Roadmap</h2>
          <div className="space-y-6">
            <div>
              <h3 className="docs-h3">Current Phase (Testnet Focus)</h3>
              <ul className="docs-list">
                <li><strong>Security:</strong> Enhancing Smart Contract security</li>
                <li><strong>Core Logic:</strong> Refining minting and SBT mechanics</li>
                <li><strong>Performance:</strong> Optimizing blockchain data fetching</li>
                <li><strong>UX Improvements:</strong> Point collection and NFT status visibility</li>
              </ul>
            </div>
            <div>
              <h3 className="docs-h3">Future Phases</h3>
              <ul className="docs-list">
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