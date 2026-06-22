-- CreateEnum
CREATE TYPE "BrmStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED', 'USER_STORY_CREATION', 'ARCHITECTURE_REVIEW', 'DEVELOPMENT', 'QA', 'SECURITY', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApprovalCycleStatus" AS ENUM ('IN_PROGRESS', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SlaType" AS ENUM ('BRM_REVIEW');

-- CreateTable
CREATE TABLE "Brm" (
    "id" TEXT NOT NULL,
    "brmNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT,
    "currentStatus" "BrmStatus" NOT NULL,
    "createdById" TEXT NOT NULL,
    "currentPlId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrmApprovalCycle" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "status" "ApprovalCycleStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BrmApprovalCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrmApproval" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "approvalCycleId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrmApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrmHistory" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "remarks" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrmHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaTracking" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "slaType" "SlaType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "breached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlaTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrmOwnershipHistory" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "oldPlId" TEXT NOT NULL,
    "newPlId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrmOwnershipHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAssignment" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApprovalAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brm_brmNumber_key" ON "Brm"("brmNumber");

-- AddForeignKey
ALTER TABLE "BrmApprovalCycle" ADD CONSTRAINT "BrmApprovalCycle_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmApproval" ADD CONSTRAINT "BrmApproval_approvalCycleId_fkey" FOREIGN KEY ("approvalCycleId") REFERENCES "BrmApprovalCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmHistory" ADD CONSTRAINT "BrmHistory_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaTracking" ADD CONSTRAINT "SlaTracking_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
