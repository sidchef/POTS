import prisma from "../config/prisma.js";

export const logAction = async ({ userId, action, entityType, entityId, oldValue, newValue, ipAddress }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType,
        entityId,
        oldValue: oldValue || null,
        newValue: newValue || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    // Audit log failures should never crash the main flow
    console.error("Audit log error:", err.message);
  }
};
