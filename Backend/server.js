import "dotenv/config";
import app from "./src/app.js";
import prisma from "./src/config/prisma.js";
import { verifyEmailConnection } from "./src/config/email.js";
// Start BullMQ Workers
import './src/workers/notification.worker.js';
import './src/workers/email.worker.js';
import './src/workers/sla.worker.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    await verifyEmailConnection();
    console.log(" Database connected");
    app.listen(PORT, () => {
      console.log(` POTS server running on http://localhost:${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);

      
    });
  } catch (error) {
    console.error(" Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
    

