import Instructor from '../models/Instructor.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import b2Service from '../services/b2Service.js';

const parseSocialLinks = (value) => {
  if (!value) return undefined;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const sanitizeFileName = (name = 'file') => String(name).replace(/[^a-zA-Z0-9._-]/g, '_');

const uploadInstructorProfileImage = async (file, name = 'instructor') => {
  if (!file?.buffer) return undefined;

  const timestamp = Date.now();
  const safeName = sanitizeFileName(name.toLowerCase().replace(/\s+/g, '-'));
  const ext = sanitizeFileName(file.originalname || 'profile.jpg').split('.').pop() || 'jpg';
  const b2Path = `instructors/${safeName}-${timestamp}.${ext}`;

  const uploadResult = await b2Service.uploadFile(
    file.buffer,
    b2Path,
    file.mimetype || 'image/jpeg'
  );

  return {
    fileId: uploadResult.fileId,
    filename: uploadResult.filename,
    contentType: uploadResult.contentType,
    url: uploadResult.url
  };
};

export const getAllInstructors = async (req, res) => {
  try {
    const instructors = await Instructor.find({ isActive: true })
      .select('name title bio profileImage rating reviewCount email socialLinks');

    // Hydrate real time associations from Course model since one-way saves are common
    const hydratedInstructors = await Promise.all(
      instructors.map(async (inst) => {
        const instObj = inst.toObject();
        // Find all courses explicitly referencing this instructor ID
        const actualCourses = await Course.find({ instructors: inst._id })
          .select('title thumbnail rating enrollmentCount students');
        
        // Calculate accurate aggregation sums
        const totalStudents = actualCourses.reduce((sum, course) => sum + (course.enrollmentCount || course.students || 0), 0);
        
        instObj.courses = actualCourses;
        instObj.students = totalStudents; // Overwrite the cached/static zero value
        return instObj;
      })
    );

    res.json(hydratedInstructors);
  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getInstructorDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const instructor = await Instructor.findById(id);
    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    // Dynamic fetch from Course model to prevent stale cache syncing issues
    const actualCourses = await Course.find({ instructors: instructor._id })
      .select('title description thumbnail duration rating students enrollmentCount');

    const totalStudents = actualCourses.reduce((sum, course) => sum + (course.enrollmentCount || course.students || 0), 0);

    const instObj = instructor.toObject();
    instObj.courses = actualCourses;
    instObj.students = totalStudents;

    res.json(instObj);
  } catch (error) {
    console.error('Get instructor detail error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createInstructor = async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, title, bio, email, socialLinks, profileImage } = req.body;

    if (!name || !title) {
      return res.status(400).json({ error: 'Name and title are required' });
    }

    let profileImageData;
    if (req.file) {
      profileImageData = await uploadInstructorProfileImage(req.file, name);
    } else if (profileImage && typeof profileImage === 'string') {
      profileImageData = { url: profileImage };
    }

    const instructor = new Instructor({
      name,
      title,
      bio,
      email,
      socialLinks: parseSocialLinks(socialLinks),
      profileImage: profileImageData,
      isActive: true
    });

    await instructor.save();

    res.status(201).json({
      success: true,
      message: 'Instructor created successfully',
      instructor
    });
  } catch (error) {
    console.error('Create instructor error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateInstructor = async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.socialLinks) {
      updates.socialLinks = parseSocialLinks(updates.socialLinks);
    }

    if (req.file) {
      const imageName = updates.name || 'instructor';
      updates.profileImage = await uploadInstructorProfileImage(req.file, imageName);
    } else if (updates.profileImage && typeof updates.profileImage === 'string') {
      updates.profileImage = { url: updates.profileImage };
    }

    updates.updatedAt = new Date();

    const instructor = await Instructor.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    res.json({
      success: true,
      message: 'Instructor updated successfully',
      instructor
    });
  } catch (error) {
    console.error('Update instructor error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteInstructor = async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Soft delete
    const instructor = await Instructor.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    res.json({
      success: true,
      message: 'Instructor deleted successfully'
    });
  } catch (error) {
    console.error('Delete instructor error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const addCourseToInstructor = async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { courseId } = req.body;

    const instructor = await Instructor.findByIdAndUpdate(
      id,
      { $addToSet: { courses: courseId } },
      { new: true }
    ).populate('courses');

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    res.json({
      success: true,
      message: 'Course added to instructor',
      instructor
    });
  } catch (error) {
    console.error('Add course error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getInstructorCoursesWithUsers = async (req, res) => {
  try {
    const { id } = req.params;

    const instructor = await Instructor.findById(id);
    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    // Dynamic fetch directly from Course table
    const actualCourses = await Course.find({ instructors: instructor._id });
    
    // For each course, find enrolled users
    const coursesWithUsers = await Promise.all(
      actualCourses.map(async (course) => {
        const enrolledUsers = await User.find(
          { enrolledCourses: course._id },
          { password: 0, __v: 0 }
        );

        return {
          courseId: course._id,
          courseTitle: course.title,
          thumbnail: course.thumbnail,
          enrollmentCount: enrolledUsers.length,
          users: enrolledUsers
        };
      })
    );

    res.json(coursesWithUsers);
  } catch (error) {
    console.error('Get instructor courses with users error:', error);
    res.status(500).json({ error: error.message });
  }
};

export default {
  getAllInstructors,
  getInstructorDetail,
  createInstructor,
  updateInstructor,
  deleteInstructor,
  addCourseToInstructor,
  getInstructorCoursesWithUsers
};
