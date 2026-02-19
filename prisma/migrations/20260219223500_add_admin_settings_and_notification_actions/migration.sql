-- CreateEnum
CREATE TYPE "AdminNotificationActionType" AS ENUM ('VACANCY', 'APPLICATION', 'CONTACT');

-- AlterTable
ALTER TABLE "AdminNotification"
ADD COLUMN "actionLabel" TEXT,
ADD COLUMN "actionType" "AdminNotificationActionType",
ADD COLUMN "actionResourceId" TEXT;

-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewApplications" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewContacts" BOOLEAN NOT NULL DEFAULT true,
    "notifySecurityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSettings_userId_key" ON "AdminSettings"("userId");

-- AddForeignKey
ALTER TABLE "AdminSettings" ADD CONSTRAINT "AdminSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
