-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('TM', 'TSP_TL', 'QA', 'SECURITY');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REASSIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserStoryStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ArchitectureStatus" AS ENUM ('WAITING_FOR_ARCHITECTURE', 'ARCHITECTURE_RECEIVED', 'SUBMITTED_TO_CISO', 'ARCHITECTURE_REJECTED', 'READY_FOR_DEVELOPMENT');

-- CreateTable
CREATE TABLE "BrmAssignment" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "assignmentType" "AssignmentType" NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BrmAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStory" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "storyNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT,
    "status" "UserStoryStatus" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStoryHistory" (
    "id" TEXT NOT NULL,
    "userStoryId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "remarks" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStoryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureTracking" (
    "id" TEXT NOT NULL,
    "brmId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "requiresCisoApproval" BOOLEAN NOT NULL,
    "status" "ArchitectureStatus" NOT NULL,
    "architectureReceivedAt" TIMESTAMP(3),
    "submittedToCisoAt" TIMESTAMP(3),
    "cisoDecisionAt" TIMESTAMP(3),
    "cisoComments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureHistory" (
    "id" TEXT NOT NULL,
    "architectureTrackingId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "remarks" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchitectureHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStory_storyNumber_key" ON "UserStory"("storyNumber");

-- AddForeignKey
ALTER TABLE "BrmApproval" ADD CONSTRAINT "BrmApproval_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmAssignment" ADD CONSTRAINT "BrmAssignment_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmAssignment" ADD CONSTRAINT "BrmAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrmAssignment" ADD CONSTRAINT "BrmAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStory" ADD CONSTRAINT "UserStory_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStory" ADD CONSTRAINT "UserStory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStoryHistory" ADD CONSTRAINT "UserStoryHistory_userStoryId_fkey" FOREIGN KEY ("userStoryId") REFERENCES "UserStory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStoryHistory" ADD CONSTRAINT "UserStoryHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureTracking" ADD CONSTRAINT "ArchitectureTracking_brmId_fkey" FOREIGN KEY ("brmId") REFERENCES "Brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureTracking" ADD CONSTRAINT "ArchitectureTracking_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "BrmAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureHistory" ADD CONSTRAINT "ArchitectureHistory_architectureTrackingId_fkey" FOREIGN KEY ("architectureTrackingId") REFERENCES "ArchitectureTracking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureHistory" ADD CONSTRAINT "ArchitectureHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
