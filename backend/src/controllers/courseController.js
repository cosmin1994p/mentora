import mongoose from 'mongoose';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';

export const getAllCourses = async (req, res) => {
  try {
    const { category, tags, search } = req.query;
    let query = {}; // Show all courses

    if (category) {
      query.category = category;
    }

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const coursesFromDB = await Course.find(query)
      .select('-content')
      .sort({ createdAt: -1 })
      .limit(100);

    // Get user's enrolled courses and package info if authenticated
    let enrolledCourseIds = [];
    let courseProgress = {};
    let userWeight = 0; // Default Free user weight
    let isAdmin = false;
    const packageWeights = { 'Free': 0, 'Pro': 1, 'Enterprise': 2 };

    if (req.userId) {
      const user = await import('../models/User.js').then(m => m.default.findById(req.userId).populate('package').populate({
        path: 'company',
        populate: { path: 'package' }
      }));
      
      if (user) {
        enrolledCourseIds = user.enrolledCourses.map(id => id.toString());
        // Map progress if available in user model (assuming user.courseProgress structure)
        if (user.courseProgress) {
          user.courseProgress.forEach(p => {
            courseProgress[p.courseId.toString()] = p.progress;
          });
        }
        
        // Determine User Package
        isAdmin = user.role === 'admin';
        const userPackageName = (user.company?.package?.name) || user.package?.name || 'Free';
        userWeight = packageWeights[userPackageName] || 0;
      }
    }

    // Backend URL for media files
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

    // Transform to frontend format
    const courses = coursesFromDB.map(course => {
      const isEnrolled = enrolledCourseIds.includes(course._id.toString());

      // Build correct thumbnail URL (prioritize direct B2 CDN URLs)
      let thumbnailUrl = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1080';
      // PRIORITY 1: Direct B2 CDN URL (our current B2 implementation)
      if (course.thumbnail?.url && course.thumbnail.url.startsWith('http')) {
        thumbnailUrl = course.thumbnail.url;  // Already a full CDN URL from B2
      }
      // PRIORITY 2: Legacy fileId (redirect via /api/media/)
      else if (course.thumbnail?.fileId) {
        thumbnailUrl = `${backendUrl}/api/media/${course.thumbnail.fileId}`;
      }
      // PRIORITY 3: String thumbnail stored directly
      else if (typeof course.thumbnail === 'string' && course.thumbnail) {
        thumbnailUrl = course.thumbnail;
      }

      // Build correct video URL (prioritize direct B2 CDN URLs)
      let videoUrl = '';
      // PRIORITY 1: Direct B2 CDN URL (our current B2 implementation)
      if (course.video?.url && course.video.url.startsWith('http')) {
        videoUrl = course.video.url;  // Already a full CDN URL from B2
      }
      // PRIORITY 2: Saved videoUrl (may be temp or processing)
      else if (course.videoUrl && course.videoUrl.startsWith('http')) {
        videoUrl = course.videoUrl;
      }
      // PRIORITY 3: Legacy fileId (redirect via /api/media/)
      else if (course.video?.fileId) {
        videoUrl = `${backendUrl}/api/media/${course.video.fileId}`;
      }
      // PRIORITY 4: Fallback for courses without videos
      else {
        videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      }

      // Lock Logic based on Package
      let isLocked = false;
      if (!isAdmin && !course.isFree && course.packageTiers && course.packageTiers.length > 0) {
        // Convert array to lowercase for case-insensitive matching, and map to weights
        const requiredWeights = course.packageTiers.map(tier => {
            const normalizedTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
            return packageWeights[normalizedTier] !== undefined ? packageWeights[normalizedTier] : 0;
        });
        const minRequiredWeight = Math.min(...requiredWeights);
        if (userWeight < minRequiredWeight) {
          isLocked = true;
        }
      }

      return {
        id: course._id.toString(),
        title: course.title,
        instructor: course.instructor || 'Unknown',
        thumbnail: thumbnailUrl,
        duration: formatDuration(course.duration),
        lessons: course.content?.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || Math.ceil(course.duration / 15) || 10,
        category: course.category,
        description: course.description || '',
        rating: course.rating || 4.5,
        students: course.enrollmentCount || 0,
        viewCount: course.viewCount || 0,
        videoUrl: isLocked ? null : videoUrl,  // Nullify if locked
        hlsUrl: isLocked ? null : (course.hlsUrl || null), // Nullify if locked
        isLocked: isLocked,
        previewDuration: course.previewDuration || 300,
        hlsReady: course.hlsReady || false,
        tags: course.tags || [],
        enrolled: isEnrolled,
        progress: courseProgress[course._id.toString()] || (isEnrolled ? 10 : 0),
        // Include emotionAffinity for mood-based recommendations
        emotionAffinity: course.emotionAffinity || {
          FERICIT: 0.5,
          MOTIVAT: 0.5,
          RELAXAT: 0.5,
          CURIOS: 0.5,
          PRODUCTIV: 0.5,
          CREATIV: 0.5
        },
        packageTiers: course.packageTiers || []
      };
    });

    res.json({
      success: true,
      count: courses.length,
      data: courses  // Frontend expects 'data' array
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

// Helper function to format duration from minutes to "Xh Ym"
function formatDuration(minutes) {
  if (!minutes) return '2h 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Increment view count atomically
    await Course.updateOne({ _id: course._id }, { $inc: { viewCount: 1 } });
    course.viewCount = (course.viewCount || 0) + 1;

    // Log activity if user authenticated
    if (req.userId) {
      try {
        await Activity.logActivity(req.userId, 'view_course', {
          courseId: course._id,
          details: { title: course.title }
        });
      } catch (e) { }
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to get course' });
  }
};

export const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      instructor,
      duration,
      level,
      category,
      tags,
      thumbnail,
      videoUrl
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const course = new Course({
      title,
      description,
      instructor,
      duration,
      level: level || 'Beginner',
      category,
      tags: tags || [],
      thumbnail,
      videoUrl
    });

    await course.save();

    res.status(201).json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

export const enrollCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('[ENROLL] Course ID:', id, 'User ID:', userId);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid course ID format' });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.enrolledCourses.includes(id)) {
      return res.status(400).json({ error: 'Already enrolled' });
    }

    // Use updateOne to avoid full model validation (which fails on currentEmotion enum)
    await User.updateOne(
      { _id: userId },
      { $addToSet: { enrolledCourses: id } }
    );

    await Course.updateOne(
      { _id: id },
      { $inc: { enrollmentCount: 1 } }
    );

    // Log activity
    try {
      await Activity.logActivity(userId, 'enroll_course', {
        courseId: id,
        details: { title: course.title }
      });
    } catch (e) {
      console.log('Activity logging failed:', e.message);
    }

    res.json({
      success: true,
      message: 'Successfully enrolled'
    });
  } catch (error) {
    console.error('Enroll course error:', error.message);
    console.error('Enroll error stack:', error.stack);
    res.status(500).json({ error: 'Failed to enroll in course', details: error.message });
  }
};

export const completeCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user.enrolledCourses.includes(id)) {
      return res.status(400).json({ error: 'Not enrolled in this course' });
    }

    if (!user.completedCourses.includes(id)) {
      user.completedCourses.push(id);
      await user.save();

      const course = await Course.findById(id);
      course.completionCount += 1;
      await course.save();

      // Log activity
      await Activity.logActivity(userId, 'complete_course', {
        courseId: id,
        details: { title: course?.title }
      });
    }

    res.json({
      success: true,
      message: 'Course marked as completed'
    });
  } catch (error) {
    console.error('Complete course error:', error);
    res.status(500).json({ error: 'Failed to complete course' });
  }
};

export const rateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Calculate new average rating
    const currentTotal = course.rating * course.reviewCount;
    course.reviewCount += 1;
    course.rating = (currentTotal + rating) / course.reviewCount;

    await course.save();

    // Log activity
    await Activity.logActivity(userId, 'rate_course', {
      courseId: id,
      details: { rating, title: course.title }
    });

    res.json({
      success: true,
      rating: course.rating
    });
  } catch (error) {
    console.error('Rate course error:', error);
    res.status(500).json({ error: 'Failed to rate course' });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Course.distinct('category');
    const tags = await Course.distinct('tags');

    res.json({
      success: true,
      categories,
      tags
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
};
