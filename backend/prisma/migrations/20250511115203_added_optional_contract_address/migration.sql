/*
  Warnings:

  - A unique constraint covering the columns `[contractAddress,tokenId]` on the table `lilnad_nfts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "lilnad_nfts" ADD COLUMN     "contractAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "lilnad_nfts_contractAddress_tokenId_key" ON "lilnad_nfts"("contractAddress", "tokenId");
