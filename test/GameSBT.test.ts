import { ethers } from "hardhat";
import { expect } from "chai";

describe("GameSBT Commit-Reveal Scheme", function () {
  let GameSBT: any;
  let game: any;
  let owner: any;
  let user: any;
  let user2: any;
  let fee: any;

  beforeEach(async () => {
    [owner, user, user2] = await ethers.getSigners();
    GameSBT = await ethers.getContractFactory("GameSBT");
    game = await GameSBT.connect(owner).deploy();
    await game.waitForDeployment();
    fee = ethers.parseEther("1");
  });

  // helper for commit and reveal
  async function commitAndReveal(addr: any, saltString: string, uri: string) {
    const salt = ethers.encodeBytes32String(saltString);
    // compute commitment using solidityPacked (abi.encodePacked)
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "address"],
        [salt, addr.address]
      )
    );
    // commit phase
    await game.connect(addr).commitMint(commitment, { value: fee });
    // mine next block so blockhash(cBlock) is available
    await ethers.provider.send("evm_mine", []);
    // reveal phase (auto-mined next block)
    const tx = await game.connect(addr).revealMint(uri, salt);
    const receipt = await tx.wait();
    const ev = receipt.logs.find((e: any) => e.eventName === "Reveal");
    const tokenId = ev.args.tokenId;
    const rank = ev.args.rank;
    return { tokenId, rank };
  }

  it("should mint with commit-reveal and fair rank", async () => {
    const { tokenId, rank } = await commitAndReveal(user, "salt1", "uri1");
    expect(await game.ownerOf(tokenId)).to.equal(user.address);
    expect(Number(rank)).to.be.gte(0).and.lte(5);
  });

  it("should collect rewards and mark dead at end of lifetime", async () => {
    const { tokenId, rank } = await commitAndReveal(user, "salt2", "uri2");

    const rankLifetime: Record<number, number> = {
      0: 48 * 3600,   // UR
      1: 72 * 3600,   // SSR
      2: 168 * 3600,  // SR
      3: 360 * 3600,  // R
      4: 720 * 3600,  // UC
      5: 1440 * 3600  // C
    };

    const half = Math.floor(rankLifetime[Number(rank)] / 2);
    // halfway
    await ethers.provider.send("evm_increaseTime", [half]);
    await ethers.provider.send("evm_mine", []);
    await game.connect(user).collect(tokenId);
    expect((await game.sbtInfo(tokenId)).isDead).to.be.false;

    // jump to end of lifetime
    const remaining = rankLifetime[Number(rank)] - half + 1; // +1 sec buffer
    await ethers.provider.send("evm_increaseTime", [remaining]);
    await ethers.provider.send("evm_mine", []);
    await game.connect(user).collect(tokenId);
    expect((await game.sbtInfo(tokenId)).isDead).to.be.true;
  });

  it("should distribute and claim rewards", async () => {
    // prepare two minted tokens
    await commitAndReveal(user, "salt3", "uri3");
    await commitAndReveal(user2, "salt4", "uri4");
    // owner distributes rewards
    const winners = [user.address, user2.address];
    const amounts = [ethers.parseEther("0.5"), ethers.parseEther("0.3")];
    await game.connect(owner).distributeRewards(winners, amounts);
    expect((await game.pendingRewards(user.address)).toString()).to.equal(amounts[0].toString());
    // claim reward
    await game.connect(user).claimReward();
    expect(await game.pendingRewards(user.address)).to.equal(0n);
  });
}); 