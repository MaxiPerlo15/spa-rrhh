/*
  Warnings:

  - You are about to drop the column `type` on the `Vacancy` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VacancyWorkday" AS ENUM ('FULL_TIME', 'PART_TIME', 'PROJECT_BASED', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "VacancyModality" AS ENUM ('ON_SITE', 'REMOTE', 'HYBRID');

-- AlterTable
ALTER TABLE "Vacancy" DROP COLUMN "type",
ADD COLUMN     "modality" "VacancyModality" NOT NULL DEFAULT 'ON_SITE',
ADD COLUMN     "workday" "VacancyWorkday" NOT NULL DEFAULT 'FULL_TIME';

-- DropEnum
DROP TYPE "VacancyType";
