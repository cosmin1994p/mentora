import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
          .select('-password')
          .populate({ path: 'company', populate: { path: 'package' } })
          .populate('package');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('📖 GET Profile for user:', req.userId);
        console.log('📖 initialQuestionnaire:', user.initialQuestionnaire);
        console.log('📖 background:', user.background);
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile (including email)
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        console.log('📝 Profile update request:', {
            userId: req.userId,
            body: req.body
        });

        const { email, username, bio, avatar, fullName, interests, activityDomain, phone, companyName, packageTier } = req.body;
        const userId = req.userId;

        // Check if new email is already in use by another user
        if (email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        // Build update object with only provided fields
        const updateFields = {};
        if (email) updateFields.email = email;
        if (username) updateFields.username = username;
        if (bio !== undefined) updateFields.bio = bio;
        if (avatar) updateFields.avatar = avatar;
        if (fullName) updateFields.fullName = fullName;
        if (phone !== undefined) updateFields.phone = phone;
        if (companyName !== undefined) {
            updateFields.companyName = companyName;
            const Company = mongoose.model('Company');
            const companyDoc = await Company.findOne({ name: companyName }).populate('package');
            if (companyDoc) {
                updateFields.company = companyDoc._id;
                // Sync user's package to the company's package so it persists across refreshes
                if (companyDoc.package) {
                    updateFields.package = companyDoc.package._id;
                    console.log('✓ Synced user package to company package:', companyDoc.package.name);
                }
            } else {
                updateFields.company = null;
                // Company not found in DB — apply explicit packageTier if provided
                if (packageTier) {
                    const Package = mongoose.model('Package');
                    const formattedTier = packageTier.charAt(0).toUpperCase() + packageTier.slice(1).toLowerCase();
                    const packageDoc = await Package.findOne({ name: formattedTier });
                    if (packageDoc) {
                        updateFields.package = packageDoc._id;
                        console.log('✓ Applied explicit packageTier:', formattedTier);
                    } else {
                        // Tier name doesn't exist in DB — fall back to Free
                        const freePackage = await Package.findOne({ name: 'Free' });
                        if (freePackage) updateFields.package = freePackage._id;
                        console.log('⚠ Package tier not found:', formattedTier, '→ defaulting to Free');
                    }
                } else {
                    // No company, no explicit tier — fall back to Free
                    const Package = mongoose.model('Package');
                    const freePackage = await Package.findOne({ name: 'Free' });
                    if (freePackage) updateFields.package = freePackage._id;
                }
            }
        } else if (packageTier) {
            // No companyName in request, but explicit packageTier provided
            const Package = mongoose.model('Package');
            const formattedTier = packageTier.charAt(0).toUpperCase() + packageTier.slice(1).toLowerCase();
            const packageDoc = await Package.findOne({ name: formattedTier });
            if (packageDoc) {
                updateFields.package = packageDoc._id;
            }
        }

        // Handle interests and activityDomain
        if (interests !== undefined) {
            updateFields['initialQuestionnaire.interests'] = interests;
        }
        if (activityDomain !== undefined) {
            updateFields['initialQuestionnaire.activityDomain'] = activityDomain;
            updateFields['background.domain'] = activityDomain;
        }

        console.log('📝 Updating fields:', updateFields);

        // Use findByIdAndUpdate to avoid triggering pre-save hooks (like password hashing)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true, runValidators: false }
        ).select('-password').populate('company').populate('package');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('✓ Profile updated successfully for user:', userId);
        console.log('✓ Updated interests:', updatedUser.initialQuestionnaire?.interests);
        console.log('✓ Updated domain:', updatedUser.initialQuestionnaire?.activityDomain);

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('❌ Update profile error:', error.message);
        console.error('❌ Full error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get enrolled courses
router.get('/enrolled-courses', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('enrolledCourses');
        res.json(user?.enrolledCourses || []);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get completed courses
router.get('/completed-courses', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('completedCourses');
        res.json(user?.completedCourses || []);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get liked reels
router.get('/liked-reels', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('likedReels');
        res.json(user?.likedReels || []);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Record reel view
router.post('/reels/:id/view', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove existing view of this reel if valid
        if (user.recentlyViewedReels) {
            user.recentlyViewedReels = user.recentlyViewedReels.filter(item =>
                item.reelId && item.reelId.toString() !== id
            );
        } else {
            user.recentlyViewedReels = [];
        }

        // Add to front
        user.recentlyViewedReels.unshift({
            reelId: id,
            viewedAt: new Date()
        });

        // Limit to 50
        if (user.recentlyViewedReels.length > 50) {
            user.recentlyViewedReels = user.recentlyViewedReels.slice(0, 50);
        }

        await user.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording reel view:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get recently viewed reels
router.get('/reels/recent', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate({
            path: 'recentlyViewedReels.reelId',
            model: 'Reel'
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Filter out nulls (deleted reels) and return reel objects
        const reels = user.recentlyViewedReels
            .filter(item => item.reelId)
            .map(item => item.reelId);

        res.json(reels);
    } catch (error) {
        console.error('Error fetching recent reels:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

