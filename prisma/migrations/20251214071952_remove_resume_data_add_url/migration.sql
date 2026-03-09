/*
  Warnings:

  - You are about to drop the column `resumeData` on the `Application` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Application" DROP COLUMN "resumeData",
ADD COLUMN     "resumeKey" TEXT,
ADD COLUMN     "resumeUrl" TEXT;
