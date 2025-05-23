/*
  Warnings:

  - You are about to drop the column `lastCollectedScore` on the `lilnad_nfts` table. All the data in the column will be lost.
  - You are about to drop the column `lastCollectedTimestamp` on the `lilnad_nfts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "lilnad_nfts" DROP COLUMN "lastCollectedScore",
DROP COLUMN "lastCollectedTimestamp",
ADD COLUMN     "expirationTimestamp" TIMESTAMP(3);
