-- AlterTable
ALTER TABLE "lilnad_nfts" ADD COLUMN     "lastCollectedScore" BIGINT DEFAULT 0,
ADD COLUMN     "lastCollectedTimestamp" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "lilnad_nfts" ADD CONSTRAINT "lilnad_nfts_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
