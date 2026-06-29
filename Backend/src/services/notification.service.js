import prisma from "../config/prisma.js";

// Create a single notification
export const createNotification = async ({ userId, title, message }) => {
  return await prisma.notification.create({
    data: { userId, title, message },
  });
};

// Notify multiple users at once
export const notifyMany = async (userIds, title, message) => {
  if (!userIds || userIds.length === 0) return;
  const notifications = userIds.map((userId) => ({ userId, title, message }));
  await prisma.notification.createMany({ data: notifications });
};

// Get notifications for a user
export const getNotifications = async (userId, unreadOnly = false) => {
  return await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { isRead: false }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};

// Mark a notification as read
export const markAsRead = async (notificationId, userId) => {
  return await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
};

// Mark all as read for a user
export const markAllAsRead = async (userId) => {
  return await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

// Get unread count
export const getUnreadCount = async (userId) => {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
};

// Get all users by role name
export const getUsersByRole = async (roleName) => {
  const userRoles = await prisma.userRole.findMany({
    where: { role: { name: roleName } },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } } },
  });
  // Only return active users
  return userRoles.filter((ur) => ur.user.isActive).map((ur) => ur.user);
};
