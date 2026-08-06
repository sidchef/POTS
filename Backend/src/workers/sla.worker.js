import { Worker } from 'bullmq';
import { connection } from '../config/queue.js';
import prisma from '../config/prisma.js';

export const slaWorker = new Worker('slaQueue', async job => {
  
  // ─── TASK ALLOCATION SLA ALERT (24h before deadline) ───
  if (job.name === 'taskSlaAlert') {
    const { allocationId } = job.data;
    
    const allocation = await prisma.taskAllocation.findUnique({
      where: { id: allocationId },
      include: {
        brm: true,
        assignedBy: true,
        tspMember: { include: { user: true } }
      }
    });

    // If task was deleted or already completed, ignore it
     if (!allocation || allocation.status !== 'ACTIVE') return;

    console.log(`[SLA Worker] 24h deadline warning for Task ${allocationId}`);

    // 1. Notify the TSP Team Member
    await prisma.notification.create({
      data: {
        userId: allocation.tspMember.userId,
        title: "Task Deadline Approaching ⏳",
        message: `Your task "${allocation.taskTitle}" for BRM ${allocation.brm.brmNumber} is due in less than 24 hours!`,
      }
    });

    // 2. Notify the TSP Team Lead (Assignor)
    await prisma.notification.create({
      data: {
        userId: allocation.assignedById,
        title: "Team Task Deadline Approaching ⏳",
        message: `The task "${allocation.taskTitle}" assigned to ${allocation.tspMember.user.firstName} for BRM ${allocation.brm.brmNumber} is due in less than 24 hours.`,
      }
    });

    return;
  }

  // ─── EXISTING BRM APPROVAL SLA LOGIC ───
  const { brmId, cycleId } = job.data;
  
  const cycle = await prisma.brmApprovalCycle.findUnique({
    where: { id: cycleId },
    include: { approvals: true, brm: true }
  });

  // If cycle is no longer pending, or BRM is already approved/rejected, do nothing
  if (!cycle || cycle.status !== "PENDING" || cycle.brm.currentStatus !== "SUBMITTED") return;

  const hasApproval = cycle.approvals.some(a => a.status === "APPROVED");
  
  if (hasApproval) {
    console.log(`[SLA Worker] SLA Expired for BRM ${brmId}. Auto-approving based on single approval!`);
    
    await prisma.$transaction(async (tx) => {
      await tx.brmApprovalCycle.update({
        where: { id: cycleId },
        data: { status: "APPROVED", completedAt: new Date() },
      });

      await tx.brm.update({
        where: { id: brmId },
        data: { currentStatus: "APPROVED" },
      });

      const approverId = cycle.approvals.find(a => a.status === "APPROVED").approverId;
      await tx.brmHistory.create({
        data: {
          brmId,
          oldStatus: "SUBMITTED",
          newStatus: "APPROVED",
          remarks: "Auto-approved due to SLA expiration with one approval present.",
          changedById: approverId,
        },
      });
    });
  } else {
    console.log(`[SLA Worker] SLA Expired for BRM ${brmId}. No approvals found. SLA Breached.`);
  }

}, { connection });

slaWorker.on('completed', job => console.log(`[SLA Worker] Job ${job.id} completed successfully`));
slaWorker.on('failed', (job, err) => console.error(`[SLA Worker] Job ${job.id} failed:`, err.message));
