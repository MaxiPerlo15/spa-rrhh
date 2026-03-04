ALTER TABLE "Application"
ALTER COLUMN "vacancyId" DROP NOT NULL;

DROP INDEX IF EXISTS "Application_vacancyId_personKey_idx";
