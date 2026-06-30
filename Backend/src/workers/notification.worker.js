import { Worker } from 'bullmq';
import { connection } from '../config/queue.js';
import prisma from '../config/prisma.js';

export const notificationWorker = new Worker('notificationQueue', async job => {
  const { type, data } = job.data;
  
  if (type === 'create') {
    return await prisma.notification.create({ data });
  } else if (type === 'createMany') {
    return await prisma.notification.createMany({ data });
  }
}, { connection });

notificationWorker.on('completed', job => {
  console.log(`[Notification Worker] Job ${job.id} completed successfully`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[Notification Worker] Job ${job.id} failed:`, err.message);
});
