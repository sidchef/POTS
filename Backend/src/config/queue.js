import Redis from 'ioredis';
import { Queue } from 'bullmq';

// BullMQ requires maxRetriesPerRequest to be null for its Redis connections
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  console.error('[BullMQ Redis] Connection Error:', err.message);
});

connection.on('connect', () => {
  console.log('[BullMQ Redis] Connected successfully');
});

// Define our Queues
export const notificationQueue = new Queue('notificationQueue', { connection });
export const emailQueue = new Queue('emailQueue', { connection });
export const slaQueue = new Queue('slaQueue', { connection });

export { connection };
