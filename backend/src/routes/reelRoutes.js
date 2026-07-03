import express from 'express';
import Reel from '../models/Reel.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// PUBLIC REEL ENDPOINTS
// ============================================================================

/**
 * GET /api/reels - Get published reels
 * Supports pagination and filtering
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      duration,
      category,
      emotion,
      courseId
    } = req.query;

    const filter = { 
      isPublished: true,
      $or: [
        { expirationDate: { $exists: false } },
        { expirationDate: null },
        { expirationDate: { $gt: new Date() } }
      ]
    };

    if (duration) {
      filter.duration = parseInt(duration);
    }

    if (courseId) {
      filter.course = courseId;
    }

    // If emotion is specified, sort by emotion affinity
    let sortOption = { createdAt: -1 };
    if (emotion) {
      sortOption = { [`emotionAffinity.${emotion}`]: -1, createdAt: -1 };
    }

    const reelsFromDB = await Reel.find(filter)
      .populate('course', 'title category instructor')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Reel.countDocuments(filter);

    // Helper functions for formatting
    const formatViews = (count) => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
      return count.toString();
    };

    // Transform to frontend format
    const data = reelsFromDB.map(reel => ({
      id: reel._id.toString(),
      title: reel.title,
      creator: reel.creator || reel.course?.instructor || 'Unknown Creator',
      thumbnail: typeof reel.thumbnail === 'string' ? reel.thumbnail : (reel.thumbnail?.url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'),
      videoUrl: reel.video?.url || reel.videoUrl || '',
      courseId: reel.courseId?.toString() || reel.course?._id?.toString() || null,
      category: reel.course?.category || reel.category || '', // For recommendation matching
      duration: reel.duration || 30,
      // Include time fields for video clipping
      startTime: reel.startTime ?? reel.sourceVideo?.startTime ?? 0,
      endTime: reel.endTime ?? reel.sourceVideo?.endTime ?? (reel.duration || 30),
      views: formatViews(reel.viewCount || 0),
      likes: formatViews(reel.likeCount || 0),
      tags: reel.tags || [],
      createdAt: reel.createdAt, // For recency bonus in recommendations
      liked: false
    }));

    res.json({
      success: true,
      data,
      count: data.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get reels error:', error);
    res.status(500).json({ error: 'Failed to get reels' });
  }
});

/**
 * GET /api/reels/feed - Get personalized reel feed
 * Uses user's emotion and preferences for better recommendations
 */
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const emotion = user.currentEmotion || 'CURIOS';

    // Get watched reel IDs to exclude
    const watchedReelIds = user.watchedReels?.map(w => w.reel) || [];

    // Find reels optimized for user's emotion, excluding watched ones
    const reels = await Reel.find({
      isPublished: true,
      _id: { $nin: watchedReelIds }
    })
      .populate('course', 'title category instructor thumbnail')
      .sort({ [`emotionAffinity.${emotion}`]: -1, viewCount: -1 })
      .limit(parseInt(limit));

    // If not enough reels, include some watched ones
    if (reels.length < limit) {
      const moreReels = await Reel.find({
        isPublished: true,
        _id: { $nin: reels.map(r => r._id) }
      })
        .populate('course', 'title category instructor thumbnail')
        .sort({ viewCount: -1 })
        .limit(parseInt(limit) - reels.length);

      reels.push(...moreReels);
    }

    res.json({
      success: true,
      reels,
      userEmotion: emotion,
      count: reels.length
    });
  } catch (error) {
    console.error('Get reel feed error:', error);
    res.status(500).json({ error: 'Failed to get reel feed' });
  }
});

/**
 * GET /api/reels/:reelId - Get single reel
 */
router.get('/:reelId', optionalAuth, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.reelId)
      .populate('course', 'title category instructor thumbnail');

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Increment view count
    reel.viewCount += 1;
    await reel.save();

    // Log activity if user is authenticated
    if (req.userId) {
      await Activity.logActivity(req.userId, 'view_reel', {
        reelId: reel._id,
        courseId: reel.course?._id
      });
    }

    res.json({
      success: true,
      reel
    });
  } catch (error) {
    console.error('Get reel error:', error);
    res.status(500).json({ error: 'Failed to get reel' });
  }
});

/**
 * POST /api/reels/:reelId/watch - Record reel watch completion
 */
router.post('/:reelId/watch', authenticateToken, async (req, res) => {
  try {
    const { watchDuration, completed = false } = req.body;
    const reelId = req.params.reelId;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Update user's watched reels
    await User.findByIdAndUpdate(
      req.userId,
      {
        $push: {
          watchedReels: {
            reel: reelId,
            watchedAt: new Date(),
            completedWatch: completed
          }
        },
        $inc: {
          totalWatchTime: Math.ceil((watchDuration || reel.duration) / 60)
        }
      }
    );

    // Log activity
    await Activity.logActivity(req.userId, completed ? 'complete_reel' : 'view_reel', {
      reelId,
      courseId: reel.course,
      details: {
        watchDuration,
        completed,
        reelDuration: reel.duration
      }
    });

    res.json({
      success: true,
      message: completed ? 'Reel watch completed' : 'Watch recorded'
    });
  } catch (error) {
    console.error('Record watch error:', error);
    res.status(500).json({ error: 'Failed to record watch' });
  }
});

/**
 * POST /api/reels/:reelId/like - Like a reel
 */
router.post('/:reelId/like', authenticateToken, async (req, res) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.reelId,
      { $inc: { likeCount: 1 } },
      { new: true }
    );

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Log activity
    await Activity.logActivity(req.userId, 'like_reel', {
      reelId: reel._id,
      courseId: reel.course
    });

    res.json({
      success: true,
      likeCount: reel.likeCount
    });
  } catch (error) {
    console.error('Like reel error:', error);
    res.status(500).json({ error: 'Failed to like reel' });
  }
});

/**
 * POST /api/reels/:reelId/share - Record reel share
 */
router.post('/:reelId/share', authenticateToken, async (req, res) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.reelId,
      { $inc: { shareCount: 1 } },
      { new: true }
    );

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Log activity
    await Activity.logActivity(req.userId, 'share_reel', {
      reelId: reel._id,
      courseId: reel.course
    });

    res.json({
      success: true,
      shareCount: reel.shareCount
    });
  } catch (error) {
    console.error('Share reel error:', error);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

/**
 * GET /api/reels/course/:courseId - Get reels for a specific course
 */
router.get('/course/:courseId', optionalAuth, async (req, res) => {
  try {
    const reels = await Reel.find({
      course: req.params.courseId,
      isPublished: true
    })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reels,
      count: reels.length
    });
  } catch (error) {
    console.error('Get course reels error:', error);
    res.status(500).json({ error: 'Failed to get course reels' });
  }
});

/**
 * PUT /api/reels/:reelId/like/toggle - Toggle like on a reel
 */
router.put('/:reelId/like/toggle', authenticateToken, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.reelId);

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    const userId = req.userId;
    const isLiked = reel.likedBy.includes(userId);

    if (isLiked) {
      // Unlike - remove from likedBy array
      reel.likedBy.pull(userId);
      reel.likeCount = Math.max(0, (reel.likeCount || 1) - 1);
    } else {
      // Like - add to likedBy array
      reel.likedBy.push(userId);
      reel.likeCount = (reel.likeCount || 0) + 1;
    }

    await reel.save();

    // Log activity
    await Activity.logActivity(req.userId, isLiked ? 'unlike_reel' : 'like_reel', {
      reelId: reel._id,
      courseId: reel.course
    });

    res.json({
      success: true,
      liked: !isLiked,
      likeCount: reel.likeCount
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

/**
 * GET /api/reels/:reelId/like/status - Get like status for current user
 */
router.get('/:reelId/like/status', optionalAuth, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.reelId);

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    const isLiked = req.userId ? reel.likedBy.includes(req.userId) : false;

    res.json({
      success: true,
      liked: isLiked,
      likeCount: reel.likeCount || 0
    });
  } catch (error) {
    console.error('Get like status error:', error);
    res.status(500).json({ error: 'Failed to get like status' });
  }
});

/**
 * POST /api/reels/:reelId/comments - Add a comment
 */
router.post('/:reelId/comments', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const reel = await Reel.findById(req.params.reelId);

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Get user info
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.userId);
    const userName = user ? user.name || user.email : 'Anonymous';

    const comment = {
      user: req.userId,
      userName: userName,
      text: text.trim(),
      createdAt: new Date()
    };

    reel.comments.push(comment);
    await reel.save();

    // Log activity
    await Activity.logActivity(req.userId, 'comment_reel', {
      reelId: reel._id,
      courseId: reel.course
    });

    res.json({
      success: true,
      comment: comment,
      commentCount: reel.comments.length
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * GET /api/reels/:reelId/comments - Get comments for a reel
 */
router.get('/:reelId/comments', async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.reelId);

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    res.json({
      success: true,
      comments: reel.comments || [],
      count: reel.comments?.length || 0
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

export default router;
