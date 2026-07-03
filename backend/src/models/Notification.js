import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['success', 'info', 'trending', 'reminder', 'achievement', 'milestone', 'recommendation', 'system'],
        default: 'info'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['unread', 'read', 'dismissed'],
        default: 'unread',
        index: true
    },
    metadata: {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel' },
        actionUrl: String,
        icon: String
    },
    expiresAt: {
        type: Date,
        default: null // null means never expires
    }
}, {
    timestamps: true
});

// Index for efficient queries
notificationSchema.index({ user: 1, status: 1, createdAt: -1 });

// Static method to create notification for a user
notificationSchema.statics.createNotification = async function (userId, data) {
    const notification = new this({
        user: userId,
        type: data.type || 'info',
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        expiresAt: data.expiresAt || null
    });
    await notification.save();
    return notification;
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function (userId, options = {}) {
    const { limit = 50, status, includeExpired = false } = options;

    const query = { user: userId };

    if (status) {
        query.status = status;
    }

    if (!includeExpired) {
        query.$or = [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ];
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = async function (userId, notificationIds = null) {
    const query = { user: userId, status: 'unread' };

    if (notificationIds && notificationIds.length > 0) {
        query._id = { $in: notificationIds };
    }

    return this.updateMany(query, { $set: { status: 'read' } });
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({
        user: userId,
        status: 'unread',
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    });
};

// Static method to dismiss a notification
notificationSchema.statics.dismiss = async function (userId, notificationId) {
    return this.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { $set: { status: 'dismissed' } },
        { new: true }
    );
};

// Static method to broadcast notification to all users
notificationSchema.statics.broadcast = async function (data, userIds = null) {
    const User = mongoose.model('User');

    let targetUsers;
    if (userIds) {
        targetUsers = userIds;
    } else {
        const users = await User.find({ role: 'user' }).select('_id').lean();
        targetUsers = users.map(u => u._id);
    }

    const notifications = targetUsers.map(userId => ({
        user: userId,
        type: data.type || 'system',
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        status: 'unread'
    }));

    return this.insertMany(notifications);
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
