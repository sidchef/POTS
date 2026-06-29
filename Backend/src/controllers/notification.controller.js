import * as notifService from "../services/notification.service.js";
import ApiResponse from "../utils/ApiResponse.js";

// GET /api/notifications
export const getNotifications = async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const notifications = await notifService.getNotifications(req.user.id, unreadOnly);
    res.status(200).json(new ApiResponse(200, notifications, "Notifications fetched"));
  } catch (err) { next(err); }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notifService.getUnreadCount(req.user.id);
    res.status(200).json(new ApiResponse(200, { count }, "Unread count fetched"));
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read
export const markAsRead = async (req, res, next) => {
  try {
    await notifService.markAsRead(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse(200, null, "Notification marked as read"));
  } catch (err) { next(err); }
};

// PATCH /api/notifications/read-all
export const markAllAsRead = async (req, res, next) => {
  try {
    await notifService.markAllAsRead(req.user.id);
    res.status(200).json(new ApiResponse(200, null, "All notifications marked as read"));
  } catch (err) { next(err); }
};
