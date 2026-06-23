/*
  Warnings:

  - You are about to drop the column `brmId` on the `SlaTracking` table. All the data in the column will be lost.
  - Added the required column `entityId` to the `SlaTracking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `SlaTracking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SlaTracking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SlaEntityType" AS ENUM ('BRM', 'ARCHITECTURE', 'TASK', 'QA', 'SECURITY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SlaType" ADD VALUE 'ARCHITECTURE_REVIEW';
ALTER TYPE "SlaType" ADD VALUE 'TASK_COMPLETION';
ALTER TYPE "SlaType" ADD VALUE 'QA_REVIEW';
ALTER TYPE "SlaType" ADD VALUE 'SECURITY_SCAN';

-- DropForeignKey
ALTER TABLE "SlaTracking" DROP CONSTRAINT "SlaTracking_brmId_fkey";

-- AlterTable
ALTER TABLE "SlaTracking" DROP COLUMN "brmId",
ADD COLUMN     "breachedAt" TIMESTAMP(3),
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "entityType" "SlaEntityType" NOT NULL,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "SlaMetric" (
    "id" TEXT NOT NULL,
    "entityType" "SlaEntityType" NOT NULL,
    "slaType" "SlaType" NOT NULL,
    "totalSlas" INTEGER NOT NULL DEFAULT 0,
    "completedOnTime" INTEGER NOT NULL DEFAULT 0,
    "breachedSlas" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageDuration" INTEGER NOT NULL DEFAULT 0,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlaMetric_entityType_idx" ON "SlaMetric"("entityType");

-- CreateIndex
CREATE INDEX "SlaMetric_slaType_idx" ON "SlaMetric"("slaType");

-- CreateIndex
CREATE UNIQUE INDEX "SlaMetric_entityType_slaType_month_year_key" ON "SlaMetric"("entityType", "slaType", "month", "year");

-- CreateIndex
CREATE INDEX "SlaTracking_entityType_entityId_idx" ON "SlaTracking"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SlaTracking_slaType_idx" ON "SlaTracking"("slaType");

-- CreateIndex
CREATE INDEX "SlaTracking_dueDate_idx" ON "SlaTracking"("dueDate");

-- CreateIndex
CREATE INDEX "SlaTracking_breached_idx" ON "SlaTracking"("breached");
