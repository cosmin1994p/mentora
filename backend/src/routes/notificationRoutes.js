import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticateToken);

/**
 * GET /api/notifications - Get current user's notifications
 */
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;

        const notifications = await Notification.getUserNotifications(req.userId, {
            status,
            limit: parseInt(limit)
        });

        const unreadCount = await Notification.getUnreadCount(req.userId);

        res.json({
            success: true,
            notifications: notifications.map(n => ({
                id: n._id.toString(),
                type: n.type,
                title: n.title,
                message: n.message,
                status: n.status,
                metadata: n.metadata,
                timestamp: new Date(n.createdAt).getTime(),
                createdAt: n.createdAt
            })),
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

/**
 * GET /api/notifications/unread-count - Get unread notification count
 */
router.get('/unread-count', async (req, res) => {
    try {
        const count = await Notification.getUnreadCount(req.userId);
        res.json({ success: true, count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

/**
 * POST /api/notifications - Create a notification (for internal use or testing)
 */
router.post('/', async (req, res) => {
    try {
        const { type, title, message, metadata } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const notification = await Notification.createNotification(req.userId, {
            type,
            title,
            message,
            metadata
        });

        res.status(201).json({
            success: true,
            notification: {
                id: notification._id.toString(),
                type: notification.type,
                title: notification.title,
                message: notification.message,
                status: notification.status,
                timestamp: new Date(notification.createdAt).getTime()
            }
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

/**
 * PUT /api/notifications/mark-read - Mark notifications as read
 */
router.put('/mark-read', async (req, res) => {
    try {
        const { notificationIds } = req.body; // Optional array of IDs, if null marks all as read

        const result = await Notification.markAsRead(req.userId, notificationIds);

        res.json({
            success: true,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
});

/**
 * PUT /api/notifications/:id/read - Mark a single notification as read
 */
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await Notification.markAsRead(req.userId, [id]);

        res.json({
            success: true,
            modified: result.modifiedCount > 0
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

/**
 * DELETE /api/notifications/:id - Dismiss a notification
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.dismiss(req.userId, id);

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Dismiss notification error:', error);
        res.status(500).json({ error: 'Failed to dismiss notification' });
    }
});

export default router;
