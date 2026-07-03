/**
 * Admin Panel Data & Analytics Types
 * Comprehensive user tracking, activity history, and analytics
 */

// User Background Information
export interface UserBackground {
  domain?: string;        // Business, Technology, Art, etc.
  education?: {
    level: string;        // High School, Bachelor, Master, PhD
    field: string;        // Field of study
    institution?: string; // University/School name
  };
  profession?: {
    job_title: string;
    company: string;
    industry: string;
    experience_years: number;
  };
  location?: {
    country: string;
    city: string;
  };
  interests: string[];
  goals: string[];
}

// User Activity Record
export interface UserActivity {
  userId: string;
  timestamp: Date;
  type: 'course_enrolled' | 'course_completed' | 'reel_watched' | 'reel_liked' | 'quiz_taken' | 'profile_updated';
  courseId?: string;
  courseName?: string;
  reelId?: string;
  reelName?: string;
  metadata?: any;
}

// User Course History
export interface UserCourseHistory {
  userId: string;
  courseId: string;
  courseName: string;
  instructor: string;
  enrolledDate: Date;
  completedDate?: Date;
  progress: number; // 0-100
  timeSpent: number; // minutes
  lastAccessDate: Date;
  status: 'enrolled' | 'in-progress' | 'completed' | 'abandoned';
  quizScore?: number;
}

// User Engagement Metrics
export interface UserEngagementMetrics {
  userId: string;
  totalCoursesEnrolled: number;
  totalCoursesCompleted: number;
  totalReelsWatched: number;
  totalReelsLiked: number;
  averageCourseProgress: number;
  totalLearningTime: number; // minutes
  lastActiveDate: Date;
  engagementScore: number; // 0-100
  favoriteCategories: string[];
  frequentTags: string[];
}

// Platform Analytics
export interface PlatformAnalytics {
  date: Date;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalCourseEnrollments: number;
  completedCourses: number;
  averageEngagement: number;
  topCourses: Array<{
    courseId: string;
    courseName: string;
    enrollments: number;
    completions: number;
  }>;
  topCategories: Array<{
    category: string;
    enrollments: number;
  }>;
  userPreferences: {
    mostLikedTags: string[];
    mostViewedCategories: string[];
    peakActivityHours: number[];
  };
}

// User Preference Analysis
export interface UserPreferenceAnalysis {
  userId: string;
  preferredCategories: Array<{
    category: string;
    weight: number;
  }>;
  preferredTags: Array<{
    tag: string;
    weight: number;
  }>;
  preferredInstructors: Array<{
    instructor: string;
    weight: number;
  }>;
  learningStyle: 'visual' | 'audio' | 'kinesthetic' | 'reading' | 'mixed';
  engagementPattern: 'consistent' | 'sporadic' | 'intensive';
  recommendedCourses: string[];
}

// Admin Statistics Report
export interface AdminStatisticsReport {
  reportDate: Date;
  period: 'daily' | 'weekly' | 'monthly';
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisPeriod: number;
    churnRate: number;
  };
  courseMetrics: {
    totalCourses: number;
    activeCourses: number;
    averageEnrollment: number;
    averageCompletionRate: number;
  };
  contentMetrics: {
    totalReels: number;
    averageReelViews: number;
    averageReelLikes: number;
  };
  engagementMetrics: {
    averageSessionDuration: number;
    totalLearningHours: number;
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
  };
  topPerformers: {
    topUsers: Array<{ userId: string; score: number }>;
    topCourses: Array<{ courseId: string; score: number }>;
    topTags: Array<{ tag: string; frequency: number }>;
  };
}

// Media Storage (MongoDB)
export interface MediaFile {
  _id?: string;
  type: 'photo' | 'story' | 'reel' | 'thumbnail';
  userId?: string;
  courseId?: string;
  reelId?: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadDate: Date;
  duration?: number; // For video
  gridFsId?: string; // MongoDB GridFS ObjectId
  metadata?: {
    width?: number;
    height?: number;
    tags?: string[];
    description?: string;
  };
}

// Video Management
export interface VideoManagement {
  videoId: string;
  title: string;
  type: 'course' | 'reel';
  courseId?: string;
  reelId?: string;
  uploadedBy: string;
  uploadDate: Date;
  duration: number; // seconds
  size: number; // bytes
  gridFsId?: string;
  views: number;
  likes: number;
  status: 'draft' | 'published' | 'archived';
  quality?: 'HD' | '4K' | 'SD';
}

export interface AdminVideoAction {
  actionId: string;
  adminId: string;
  videoId: string;
  action: 'upload' | 'delete' | 'publish' | 'archive';
  timestamp: Date;
  metadata?: any;
}
