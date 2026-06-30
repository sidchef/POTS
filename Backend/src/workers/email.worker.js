import { Worker } from 'bullmq';
import { connection } from '../config/queue.js';
// Import the actual sending logic
import * as emailService from '../services/email.service.js'; 

export const emailWorker = new Worker('emailQueue', async job => {
  const { type, payload } = job.data;
  
  switch (type) {
    case 'sendWelcomeEmail':
      await emailService.sendWelcomeEmail(payload);
      break;
    case 'sendBrmSubmittedEmail':
      await emailService.sendBrmSubmittedEmail(payload);
      break;
    case 'sendBrmRejectedEmail':
      await emailService.sendBrmRejectedEmail(payload);
      break;
    case 'sendBrmApprovedEmail':
      await emailService.sendBrmApprovedEmail(payload);
      break;
    case 'sendNotificationEmail':
      await emailService.sendNotificationEmail(payload);
      break;
    default:
      console.warn(`[Email Worker] Unknown job type: ${type}`);
  }
}, { connection });

emailWorker.on('completed', job => {
  console.log(`[Email Worker] Job ${job.id} (${job.data.type}) completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Email Worker] Job ${job.id} failed:`, err.message);
});
