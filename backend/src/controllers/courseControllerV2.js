import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Reel from '../models/Reel.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import b2Service from '../services/b2Service.js';
import hlsService from '../services/hlsService.js';
import { broadcastEvent } from '../services/sseService.js';

const getEffectivePackageTiers = (course) => {
  const tiers = Array.isArray(course?.packageTiers) ? course.packageTiers : [];
  // Backward compatibility for legacy courses created before packageTiers existed.
  return tiers.length > 0 ? tiers : ['Free'];
};

const deleteMediaObject = async (media) => {
  if (!media) return;
  await b2Service.deleteByReference(media.fileId || media.url, { strict: true });
};

const cleanupLessonMedia = async (lesson) => {
  if (!lesson) return;
  await deleteMediaObject(lesson.video);
  await deleteMediaObject(lesson.thumbnail);

  if (Array.isArray(lesson.resources)) {
    for (const resource of lesson.resources) {
      await b2Service.deleteByReference(resource?.fileId || resource?.url, { strict: true });
    }
  }
};

// ============================================================================
// COURSE LISTING - Package-aware filtering
// ============================================================================

export const getCourses = async (req, res) => {
  try {
    const { search, level, instructor } = req.query;
    
    // Determine user's effective package tier
    let effectivePackage = 'Free';
    let isAdmin = false;
    if (req.userId) {
      const user = await User.findById(req.userId)
        .populate('package')
        .populate({ path: 'company', populate: { path: 'package' } });
      
      if (user) {
        isAdmin = user.role === 'admin';
        if (user.company?.package?.name) {
          effectivePackage = user.company.package.name;
        } else if (user.package?.name) {
          effectivePackage = user.package.name;
        }
      }
    }

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (level) {
      query.level = level;
    }

    if (instructor) {
      query.instructors = instructor;
    }

    const courses = await Course.find(query)
      .populate('instructors', 'name title profileImage')
      .populate('lessonsArray', 'title duration order')
      .sort({ createdAt: -1 });

    // Mark locked courses
    const resultCourses = courses.map(course => {
      const doc = course.toObject();
      const effectiveTiers = getEffectivePackageTiers(course);
      
      const packageWeights = { 'free': 0, 'pro': 1, 'enterprise': 2 };
      const userWeight = packageWeights[effectivePackage.toLowerCase()] || 0;
      
      const requiredWeights = effectiveTiers.map(tier => {
        const normalizedTier = tier.toLowerCase();
        return packageWeights[normalizedTier] !== undefined ? packageWeights[normalizedTier] : 0;
      });
      const minRequiredWeight = requiredWeights.length > 0 ? Math.min(...requiredWeights) : 0;
      
      const hasAccess = isAdmin || userWeight >= minRequiredWeight;
      doc.isLocked = !hasAccess;
      if (!hasAccess) {
        doc.videoUrl = null;
        doc.hlsUrl = null;
      }
      return doc;
    });

    res.json(resultCourses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

// ============================================================================
// COURSE DETAIL - With access control
// ============================================================================

export const getCourseDetail = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const course = await Course.findById(courseId)
      .populate('instructors', 'name title bio profileImage email')
      .populate({
        path: 'lessonsArray',
        select: 'title description duration order video quiz resources isPublished hlsReady chapter thumbnail'
      });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check access
    let userPackage = 'Free';
    let isAdmin = false;
    if (req.userId) {
      const user = await User.findById(req.userId)
        .populate('package')
        .populate({ path: 'company', populate: { path: 'package' } });
      
      if (user) {
        isAdmin = user.role === 'admin';
        if (user.company?.package?.name) {
          userPackage = user.company.package.name;
        } else if (user.package?.name) {
          userPackage = user.package.name;
        }
      }
    }

    const effectiveTiers = getEffectivePackageTiers(course);
    
    const packageWeights = { 'free': 0, 'pro': 1, 'enterprise': 2 };
    const userWeight = packageWeights[userPackage.toLowerCase()] || 0;
    
    const requiredWeights = effectiveTiers.map(tier => {
      const normalizedTier = tier.toLowerCase();
      return packageWeights[normalizedTier] !== undefined ? packageWeights[normalizedTier] : 0;
    });
    const minRequiredWeight = requiredWeights.length > 0 ? Math.min(...requiredWeights) : 0;
    
    const hasAccess = isAdmin || userWeight >= minRequiredWeight;

    if (!hasAccess) {
      return res.json({
        ...course.toObject(),
        isLocked: true,
        lessonsArray: [],
        message: `This course requires ${effectiveTiers[0]} package or higher`
      });
    }

    if (course.expirationDate && new Date() > course.expirationDate) {
      return res.json({
        ...course.toObject(),
        isExpired: true,
        message: 'This course has expired'
      });
    }

    res.json({
      ...course.toObject(),
      isLocked: false,
      lessonsCount: course.lessonsArray?.length || 0
    });
  } catch (error) {
    console.error('Get course detail error:', error);
    res.status(500).json({ error: 'Failed to get course detail' });
  }
};

// ============================================================================
// LESSONS MANAGEMENT
// ============================================================================

export const getCourseLessons = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    let userPackage = 'Free';
    if (req.userId) {
      const user = await User.findById(req.userId);
      if (user?.company) {
        const company = await Company.findById(user.company);
        userPackage = company?.package?.name || 'Free';
      } else if (user?.package) {
        userPackage = user.package;
      }
    }

    const effectiveTiers = getEffectivePackageTiers(course);
    const hasAccess = effectiveTiers.includes(userPackage) || effectiveTiers.includes('Free');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Backward compatibility: some legacy flows may miss lesson ids in lessonsArray.
    // Merge by both reference list and courseId to avoid hiding chapters/lessons.
    const rawLessons = await Lesson.find({
      $or: [
        { _id: { $in: course.lessonsArray || [] } },
        { courseId: course._id }
      ]
    });

    const uniqueById = new Map();
    rawLessons.forEach((lesson) => uniqueById.set(lesson._id.toString(), lesson));

    const lessons = Array.from(uniqueById.values()).sort((a, b) => {
      const aChapterOrder = Number.isFinite(a?.chapter?.order) ? a.chapter.order : 9999;
      const bChapterOrder = Number.isFinite(b?.chapter?.order) ? b.chapter.order : 9999;
      if (aChapterOrder !== bChapterOrder) return aChapterOrder - bChapterOrder;

      const aOrder = Number.isFinite(a?.order) ? a.order : 9999;
      const bOrder = Number.isFinite(b?.order) ? b.order : 9999;
      return aOrder - bOrder;
    });

    res.json(lessons);
  } catch (error) {
    console.error('Get course lessons error:', error);
    res.status(500).json({ error: 'Failed to get lessons' });
  }
};

export const getLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    let userPackage = 'Free';
    if (req.userId) {
      const user = await User.findById(req.userId);
      if (user?.company) {
        const company = await Company.findById(user.company);
        userPackage = company?.package?.name || 'Free';
      } else if (user?.package) {
        userPackage = user.package;
      }
    }

    const effectiveTiers = getEffectivePackageTiers(course);
    const hasAccess = effectiveTiers.includes(userPackage) || effectiveTiers.includes('Free');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson || !course.lessonsArray.includes(lessonId)) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json(lesson);
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Failed to get lesson' });
  }
};

// ============================================================================
// ADMIN - COURSE CRUD
// ============================================================================

export const createCourse = async (req, res) => {
  try {
    const { title, description, level, instructors, packageTiers } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    const course = new Course({
      title,
      description,
      level: level || 'Beginner',
      instructors: instructors || [],
      packageTiers: packageTiers || ['Free'],
      lessonsArray: [],
      isFree: packageTiers?.includes('Free'),
      status: 'draft'
    });

    await course.save();

    res.status(201).json({
      success: true,
      message: 'Course created',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, level, instructors, status } = req.body;

    const course = await Course.findByIdAndUpdate(
      courseId,
      {
        title,
        description,
        level,
        instructors,
        status,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('instructors lessonsArray');

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({
      success: true,
      message: 'Course updated',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await deleteMediaObject(course.video);
    await deleteMediaObject(course.thumbnail);
    await deleteMediaObject(course.instructorImage);
    await b2Service.deleteByReference(course.videoUrl, { strict: true });
    await b2Service.deleteByReference(course.hlsUrl, { strict: true });
    await b2Service.deleteFolder(`hls/${courseId}/`, { strict: true });
    const historicalCoursePrefixes = [
      `videos/${courseId}-`,
      `thumbnails/${courseId}-`,
      `lessons/videos/${courseId}-`,
      `lessons/thumbnails/${courseId}-`
    ];
    for (const prefix of historicalCoursePrefixes) {
      await b2Service.deleteFolder(prefix, { strict: true });
    }
    hlsService.deleteHLSOutput(courseId);

    const lessons = await Lesson.find({ courseId }).select('video thumbnail resources hlsUrl');
    for (const lesson of lessons) {
      await cleanupLessonMedia(lesson);
      await b2Service.deleteByReference(lesson.hlsUrl, { strict: true });
    }

    await Lesson.deleteMany({ courseId });

    const reels = await Reel.find({
      $or: [
        { course: courseId },
        { courseId: courseId }
      ]
    }).select('video thumbnail videoUrl');
    for (const reel of reels) {
      await deleteMediaObject(reel.video);
      await deleteMediaObject(reel.thumbnail);
      await b2Service.deleteByReference(reel.videoUrl, { strict: true });
    }
    await Reel.deleteMany({
      $or: [
        { course: courseId },
        { courseId: courseId }
      ]
    });

    await Course.findByIdAndDelete(courseId);

    res.json({
      success: true,
      message: 'Course deleted with all lessons'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

export const updateCoursePackageTiers = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { packageTiers, expirationDate } = req.body;

    if (!packageTiers || !Array.isArray(packageTiers)) {
      return res.status(400).json({ error: 'Package tiers must be an array' });
    }

    const course = await Course.findByIdAndUpdate(
      courseId,
      {
        packageTiers,
        isFree: packageTiers.includes('Free'),
        expirationDate,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Broadcast the update via SSE
    broadcastEvent('course_updated', {
      courseId: course._id,
      packageTiers: course.packageTiers
    });

    res.json({
      success: true,
      message: 'Course package access updated',
      course
    });
  } catch (error) {
    console.error('Update course packages error:', error);
    res.status(500).json({ error: 'Failed to update course packages' });
  }
};

// ============================================================================
// ADMIN - LESSON CRUD
// ============================================================================

export const addLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, order, duration, chapter } = req.body;

    if (!/^[a-fA-F0-9]{24}$/.test(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }
    
    // With .fields(), files are in req.files as an object with arrays
    const videoFiles = req.files?.video || [];
    const thumbnailFiles = req.files?.thumbnail || [];
    const videoFile = videoFiles[0];
    const thumbnailFile = thumbnailFiles[0];

    if (!title) {
      return res.status(400).json({ error: 'Lesson title is required' });
    }

    if (!videoFile) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    // ⚠️ CRITICAL: Validate video file has content
    if (!videoFile.buffer || videoFile.buffer.length === 0) {
      console.error(`[ADD LESSON ERROR] Video file is empty!`, {
        filename: videoFile.originalname,
        size: videoFile.size,
        bufferLength: videoFile.buffer?.length
      });
      return res.status(400).json({ error: 'Video file is empty. Please upload a valid video file.' });
    }

    console.log(`[ADD LESSON] Video file validated:`, {
      filename: videoFile.originalname,
      size: videoFile.size,
      bufferLength: videoFile.buffer.length,
      mimeType: videoFile.mimetype
    });

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const sanitizeFilename = (name = 'file') => name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const videoB2Filename = `lessons/videos/${courseId}-${Date.now()}-${sanitizeFilename(videoFile.originalname)}`;
    
    let uploadedVideo;
    try {
      uploadedVideo = await b2Service.uploadFile(
        videoFile.buffer,
        videoB2Filename,
        videoFile.mimetype || 'video/mp4'
      );
    } catch (b2Error) {
      console.error(`[ADD LESSON] Video upload failed:`, b2Error.message);
      return res.status(500).json({ error: `Video upload failed: ${b2Error.message}` });
    }
    
    // Parse chapter data if provided
    let chapterData = null;
    if (chapter) {
      try {
        chapterData = typeof chapter === 'string' ? JSON.parse(chapter) : chapter;
        if (chapterData && typeof chapterData === 'object') {
          const safeName = String(chapterData.name || '').trim();
          const parsedChapterOrder = Number.parseInt(chapterData.order, 10);
          chapterData = {
            name: safeName || 'Capitol 1',
            order: Number.isFinite(parsedChapterOrder) ? parsedChapterOrder : 1
          };
        }
      } catch (e) {
        console.warn('Could not parse chapter data:', e);
      }
    }
    
    const lessonData = {
      courseId,
      title,
      description,
      order: parseInt(order) || (course.lessonsArray?.length || 0) + 1,
      duration: parseInt(duration) || 0,
      ...(chapterData && { chapter: chapterData }),
      video: {
        fileId: uploadedVideo.fileId,
        filename: uploadedVideo.filename,
        contentType: uploadedVideo.contentType,
        size: uploadedVideo.size,
        url: uploadedVideo.url
      },
      isPublished: true,
      hlsReady: false
    };

    // Add thumbnail if provided
    if (thumbnailFile) {
      // ⚠️ CRITICAL: Validate thumbnail file has content
      if (!thumbnailFile.buffer || thumbnailFile.buffer.length === 0) {
        console.error(`[ADD LESSON ERROR] Thumbnail file is empty!`, {
          filename: thumbnailFile.originalname,
          size: thumbnailFile.size,
          bufferLength: thumbnailFile.buffer?.length
        });
        return res.status(400).json({ error: 'Thumbnail file is empty. Please upload a valid image file.' });
      }

      const thumbnailB2Filename = `lessons/thumbnails/${courseId}-${Date.now()}-${sanitizeFilename(thumbnailFile.originalname)}`;
      
      let uploadedThumb;
      try {
        uploadedThumb = await b2Service.uploadFile(
          thumbnailFile.buffer,
          thumbnailB2Filename,
          thumbnailFile.mimetype || 'image/jpeg'
        );
      } catch (b2Error) {
        console.error(`[ADD LESSON] Thumbnail upload failed:`, b2Error.message);
        return res.status(500).json({ error: `Thumbnail upload failed: ${b2Error.message}` });
      }

      lessonData.thumbnail = {
        fileId: uploadedThumb.fileId,
        filename: uploadedThumb.filename,
        contentType: uploadedThumb.contentType,
        url: uploadedThumb.url
      };
    }

    const lesson = new Lesson(lessonData);
    await lesson.save();

    course.lessonsArray.push(lesson._id);
    course.lessons = course.lessonsArray.length;
    await course.save();

    console.log(`🎬 Queued HLS transcoding for lesson ${lesson._id} in chapter: ${chapterData?.name || 'N/A'}${thumbnailFile ? ' (with thumbnail)' : ''}`);

    res.status(201).json({
      success: true,
      message: 'Lesson added (HLS transcoding in progress)',
      lesson: {
        ...lesson.toObject(),
        hlsReady: false
      }
    });
  } catch (error) {
    console.error('Add lesson error:', error);
    res.status(500).json({ error: 'Failed to add lesson' });
  }
};

export const updateLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { title, description, order, duration } = req.body;
    const videoFile = req.file;

    if (!/^[a-fA-F0-9]{24}$/.test(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    let updateData = {
      title,
      description,
      order: parseInt(order),
      duration: parseInt(duration),
      updatedAt: new Date()
    };

    if (videoFile) {
      const videoB2Url = `https://cdn.mentora.page/file/mentora/lessons/${videoFile.filename}`;
      updateData.video = {
        fileId: videoFile.filename,
        url: videoB2Url,
        hlsUrl: `${videoB2Url.replace(/\.[^.]+$/, '')}_hls/playlist.m3u8`,
        hlsReady: false
      };
      updateData.hlsReady = false;
    }

    const lesson = await Lesson.findByIdAndUpdate(lessonId, updateData, { new: true });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({
      success: true,
      message: 'Lesson updated',
      lesson
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    await cleanupLessonMedia(lesson);

    course.lessonsArray = course.lessonsArray.filter(id => id.toString() !== lessonId);
    course.lessons = course.lessonsArray.length;
    await course.save();

    await Lesson.findByIdAndDelete(lessonId);

    res.json({
      success: true,
      message: 'Lesson deleted'
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
};
