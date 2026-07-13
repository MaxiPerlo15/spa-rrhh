CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "personKey" TEXT NOT NULL,
    "resumeFileName" TEXT,
    "resumeKey" TEXT,
    "resumeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Application" ADD COLUMN "candidateId" TEXT;

CREATE UNIQUE INDEX "Candidate_personKey_key" ON "Candidate"("personKey");
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");
CREATE INDEX "Candidate_personKey_createdAt_idx" ON "Candidate"("personKey", "createdAt");
CREATE INDEX "Application_candidateId_submittedAt_idx" ON "Application"("candidateId", "submittedAt");

INSERT INTO "Candidate" (
  "id",
  "name",
  "email",
  "phone",
  "personKey",
  "resumeFileName",
  "resumeKey",
  "resumeUrl",
  "createdAt",
  "updatedAt"
)
SELECT DISTINCT ON (COALESCE("personKey", md5(lower(trim("email")) || '|' || regexp_replace(trim("phone"), '\D', '', 'g'))))
  concat('cand_', substr(md5(COALESCE("personKey", lower(trim("email")) || '|' || regexp_replace(trim("phone"), '\D', '', 'g'))), 1, 24)) AS "id",
  "candidateName" AS "name",
  "email",
  "phone",
  COALESCE("personKey", md5(lower(trim("email")) || '|' || regexp_replace(trim("phone"), '\D', '', 'g'))) AS "personKey",
  "resumeFileName",
  "resumeKey",
  "resumeUrl",
  "submittedAt" AS "createdAt",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM "Application"
ORDER BY COALESCE("personKey", md5(lower(trim("email")) || '|' || regexp_replace(trim("phone"), '\D', '', 'g'))), "submittedAt" DESC;

UPDATE "Application" AS "application"
SET "candidateId" = "candidate"."id"
FROM "Candidate" AS "candidate"
WHERE "candidate"."personKey" = COALESCE(
  "application"."personKey",
  md5(lower(trim("application"."email")) || '|' || regexp_replace(trim("application"."phone"), '\D', '', 'g'))
);

ALTER TABLE "Application"
ADD CONSTRAINT "Application_candidateId_fkey"
FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
