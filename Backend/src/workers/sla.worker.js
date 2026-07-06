import { Worker } from 'bullmq';
import { connection } from '../config/queue.js';
import prisma from '../config/prisma.js';

export const slaWorker = new Worker('slaQueue', async job => {
  const { brmId, cycleId } = job.data;
  
  const cycle = await prisma.brmApprovalCycle.findUnique({
    where: { id: cycleId },
    include: { approvals: true, brm: true }
  });

  // If cycle is no longer pending, or BRM is already approved/rejected, do nothing!
  if (!cycle || cycle.status !== "PENDING" || cycle.brm.currentStatus !== "SUBMITTED") return;

  // Check if at least ONE person approved it
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

      // Log the history change
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
    // (Optional) You can add logic here to mark it as rejected or notify the PL
  }
}, { connection });

slaWorker.on('completed', job => console.log(`[SLA Worker] Job ${job.id} completed successfully`));
slaWorker.on('failed', (job, err) => console.error(`[SLA Worker] Job ${job.id} failed:`, err.message));
