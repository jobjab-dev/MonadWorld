/*
  Warnings:

  - The primary key for the `lilnad_nfts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `lilnad_nfts` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Made the column `contractAddress` on table `lilnad_nfts` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "lilnad_nfts" DROP CONSTRAINT "lilnad_nfts_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ALTER COLUMN "contractAddress" SET NOT NULL,
ADD CONSTRAINT "lilnad_nfts_pkey" PRIMARY KEY ("id");
