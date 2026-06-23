-- CreateEnum
CREATE TYPE "QaCycleStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScenarioStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('SCREENSHOT', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "SecurityScanStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'REMEDIATION_IN_PROGRESS', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'SECURITY_ASSIGNED';
ALTER TYPE "TaskStatus" ADD VALUE 'SECURITY_IN_PROGRESS';
ALTER TYPE "TaskStatus" ADD VALUE 'SECURITY_FAILED';
ALTER TYPE "TaskStatus" ADD VALUE 'SECURITY_PASSED';
ALTER TYPE "TaskStatus" ADD VALUE 'REMEDIATION_REQUIRED';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "parentTaskId" TEXT;

-- CreateTable
CREATE TABLE "QaCycle" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "assignedQaId" TEXT NOT NULL,
    "status" "QaCycleStatus" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QaCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaTestScenario" (
    "id" TEXT NOT NULL,
    "qaCycleId" TEXT NOT NULL,
    "scenarioNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "status" "ScenarioStatus" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QaTestScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaEvidence" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" "EvidenceType" NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QaEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaHistory" (
    "id" TEXT NOT NULL,
    "qaCycleId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "remarks" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QaHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityScan" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "assignedSecId" TEXT NOT NULL,
    "status" "SecurityScanStatus" NOT NULL,
    "scanNumber" INTEGER NOT NULL,
    "scannedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityFinding" (
    "id" TEXT NOT NULL,
    "securityScanId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "status" "FindingStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SecurityFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityFindingHistory" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "remarks" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityFindingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrmMetric" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "overallStartDate" TIMESTAMP(3) NOT NULL,
    "overallEndDate" TIMESTAMP(3) NOT NULL,
    "totalDurationDays" INTEGER NOT NULL,
    "approvalSlaHours" INTEGER NOT NULL,
    "approvalBreached" BOOLEAN NOT NULL,
    "approvalResubmissions" INTEGER NOT NULL,
    "architectureSlaHours" INTEGER NOT NULL,
    "architectureBreached" BOOLEAN NOT NULL,
    "architectureResubmits" INTEGER NOT NULL,
    "totalTasks" INTEGER NOT NULL,
    "completedTasks" INTEGER NOT NULL,
    "totalQaCycles" INTEGER NOT NULL,
    "totalSecurityScans" INTEGER NOT NULL,
    "totalFindings" INTEGER NOT NULL,
    "criticalFindings" INTEGER NOT NULL,
    "highFindings" INTEGER NOT NULL,
    "mediumFindings" INTEGER NOT NULL,
    "lowFindings" INTEGER NOT NULL,
    "totalRemediationTasks" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrmMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskMetric" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "qaCycles" INTEGER NOT NULL,
    "securityScans" INTEGER NOT NULL,
    "remediationCount" INTEGER NOT NULL,
    "totalFindings" INTEGER NOT NULL,
    "criticalFindings" INTEGER NOT NULL,
    "highFindings" INTEGER NOT NULL,
    "mediumFindings" INTEGER NOT NULL,
    "lowFindings" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrmMetric_brmId_key" ON "BrmMetric"("brmId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskMetric_taskId_key" ON "TaskMetric"("taskId");

-- AddForeignKey
ALTER TABLE "QaCycle" ADD CONSTRAINT "QaCycle_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaCycle" ADD CONSTRAINT "QaCycle_assignedQaId_fkey" FOREIGN KEY ("assignedQaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaTestScenario" ADD CONSTRAINT "QaTestScenario_qaCycleId_fkey" FOREIGN KEY ("qaCycleId") REFERENCES "QaCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaTestScenario" ADD CONSTRAINT "QaTestScenario_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaEvidence" ADD CONSTRAINT "QaEvidence_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "QaTestScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaEvidence" ADD CONSTRAINT "QaEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaHistory" ADD CONSTRAINT "QaHistory_qaCycleId_fkey" FOREIGN KEY ("qaCycleId") REFERENCES "QaCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaHistory" ADD CONSTRAINT "QaHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityScan" ADD CONSTRAINT "SecurityScan_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityScan" ADD CONSTRAINT "SecurityScan_assignedSecId_fkey" FOREIGN KEY ("assignedSecId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityFinding" ADD CONSTRAINT "SecurityFinding_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityFinding" ADD CONSTRAINT "SecurityFinding_securityScanId_fkey" FOREIGN KEY ("securityScanId") REFERENCES "SecurityScan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityFindingHistory" ADD CONSTRAINT "SecurityFindingHistory_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "SecurityFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityFindingHistory" ADD CONSTRAINT "SecurityFindingHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmMetric" ADD CONSTRAINT "BrmMetric_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMetric" ADD CONSTRAINT "TaskMetric_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
