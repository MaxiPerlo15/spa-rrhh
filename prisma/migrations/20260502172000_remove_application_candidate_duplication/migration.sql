ALTER TABLE "Application"
ALTER COLUMN "candidateId" SET NOT NULL;

DROP INDEX IF EXISTS "Application_email_idx";
DROP INDEX IF EXISTS "Application_personKey_submittedAt_idx";

ALTER TABLE "Application" DROP COLUMN "candidateName";
ALTER TABLE "Application" DROP COLUMN "email";
ALTER TABLE "Application" DROP COLUMN "phone";
ALTER TABLE "Application" DROP COLUMN "personKey";
ALTER TABLE "Application" DROP COLUMN "resumeFileName";
ALTER TABLE "Application" DROP COLUMN "resumeKey";
ALTER TABLE "Application" DROP COLUMN "resumeUrl";
