-- AlterTable
ALTER TABLE "Application" ADD COLUMN "personKey" TEXT;
ALTER TABLE "Contact" ADD COLUMN "personKey" TEXT;

-- CreateIndex
CREATE INDEX "Application_vacancyId_personKey_idx" ON "Application"("vacancyId", "personKey");
CREATE INDEX "Application_personKey_submittedAt_idx" ON "Application"("personKey", "submittedAt");
CREATE INDEX "Contact_personKey_createdAt_idx" ON "Contact"("personKey", "createdAt");
