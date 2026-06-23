/*
  Warnings:

  - The values [WORK_STARTED,DEVELOPMENT_IN_PROGRESS] on the enum `BrmStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BrmStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED', 'USER_STORY_CREATION', 'ARCHITECTURE_REVIEW', 'READY_FOR_DEVELOPMENT', 'CODING_IN_PROGRESS', 'READY_FOR_QA', 'QA', 'SECURITY', 'CLOSED');
ALTER TABLE "Brm" ALTER COLUMN "currentStatus" TYPE "BrmStatus_new" USING ("currentStatus"::text::"BrmStatus_new");
ALTER TYPE "BrmStatus" RENAME TO "BrmStatus_old";
ALTER TYPE "BrmStatus_new" RENAME TO "BrmStatus";
DROP TYPE "public"."BrmStatus_old";
COMMIT;
