import { Course, UserProfile } from '../App';

interface RecommendationScore {
  course: Course;
  totalScore: number;
  breakdown: {
    moodScore: number;
    goalScore: number;
    historyScore: number;
    tagScore: number;
    progressBoost: number;
  };
}

/**
 * Advanced ML-based recommendation system
 * Uses multiple factors to calculate personalized course recommendations
 */
export function generateMLRecommendations(
  courses: Course[],
  userProfile: UserProfile | null
): Course[] {
  if (!userProfile || courses.length === 0) {
    return [];
  }

  const scoredCourses: RecommendationScore[] = courses.map(course => {
    const breakdown = {
      moodScore: calculateMoodScore(course, userProfile),
      goalScore: calculateGoalScore(course, userProfile),
      historyScore: calculateHistoryScore(course, courses, userProfile),
      tagScore: calculateTagScore(course, userProfile),
      progressBoost: calculateProgressBoost(course)
    };

    // Weighted combination of all scores
    const totalScore = 
      breakdown.moodScore * 0.30 +      // 30% weight for current mood
      breakdown.goalScore * 0.25 +      // 25% weight for user goals
      breakdown.historyScore * 0.20 +   // 20% weight for viewing history
      breakdown.tagScore * 0.15 +       // 15% weight for tag matching
      breakdown.progressBoost * 0.10;   // 10% weight for in-progress courses

    return {
      course,
      totalScore,
      breakdown
    };
  });

  // Sort by total score (descending) and return top recommendations
  const topRecommendations = scoredCourses
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10)
    .map(item => item.course);

  return topRecommendations;
}

/**
 * Calculate score based on user's current mood and energy level
 */
function calculateMoodScore(course: Course, userProfile: UserProfile): number {
  const mood = userProfile.dailyMood?.mood || '';
  const energy = userProfile.dailyMood?.energy || '';
  
  let score = 0;

  // Mood to tags mapping with relevance scores
  const moodTagsMap: Record<string, { tags: string[]; weight: number }> = {
    'felicit': { 
      tags: ['inspiring', 'creative', 'motivational', 'success', 'achievement', 'art'], 
      weight: 10 
    },
    'motivat': { 
      tags: ['achievement', 'leadership', 'business', 'goals', 'success', 'intensive'], 
      weight: 10 
    },
    'relaxat': { 
      tags: ['creative', 'artistic', 'photography', 'music', 'relaxing', 'balanced', 'easy'], 
      weight: 8 
    },
    'curios': { 
      tags: ['learning', 'tech', 'science', 'innovation', 'challenging', 'advanced'], 
      weight: 10 
    },
    'productiv': { 
      tags: ['business', 'productivity', 'strategy', 'efficiency', 'practical', 'fundamental'], 
      weight: 9 
    },
    'creativ': { 
      tags: ['art', 'design', 'creative', 'writing', 'artistic', 'music'], 
      weight: 10 
    }
  };

  // Energy level to tags mapping
  const energyTagsMap: Record<string, { tags: string[]; weight: number }> = {
    'ridicata': { 
      tags: ['intensive', 'challenging', 'advanced', 'energizing', 'workout', 'achievement'], 
      weight: 8 
    },
    'medie': { 
      tags: ['moderate', 'practical', 'balanced', 'fundamental', 'learning', 'introductory'], 
      weight: 7 
    },
    'scazuta': { 
      tags: ['relaxing', 'beginner', 'easy', 'introductory', 'creative', 'artistic'], 
      weight: 6 
    }
  };

  // Match mood tags
  const moodConfig = moodTagsMap[mood];
  if (moodConfig) {
    course.tags.forEach(tag => {
      if (moodConfig.tags.includes(tag)) {
        score += moodConfig.weight;
      }
    });
  }

  // Match energy tags
  const energyConfig = energyTagsMap[energy];
  if (energyConfig) {
    course.tags.forEach(tag => {
      if (energyConfig.tags.includes(tag)) {
        score += energyConfig.weight;
      }
    });
  }

  // Check title keywords for mood/energy alignment
  const titleLower = course.title.toLowerCase();
  if (moodConfig) {
    moodConfig.tags.forEach(tag => {
      if (titleLower.includes(tag.toLowerCase())) {
        score += 3;
      }
    });
  }

  return score;
}

/**
 * Calculate score based on user's initial goals and interests
 */
function calculateGoalScore(course: Course, userProfile: UserProfile): number {
  const interests = userProfile.initialQuestionnaire?.interests || [];
  const goals = userProfile.initialQuestionnaire?.goals || [];
  
  let score = 0;

  // Match interests
  interests.forEach(interest => {
    const interestLower = interest.toLowerCase();
    
    // Check if interest matches course tags
    course.tags.forEach(tag => {
      if (tag.toLowerCase().includes(interestLower) || interestLower.includes(tag.toLowerCase())) {
        score += 15;
      }
    });

    // Check if interest appears in title
    if (course.title.toLowerCase().includes(interestLower)) {
      score += 10;
    }

    // Check if interest matches category
    if (course.category.toLowerCase().includes(interestLower) || interestLower.includes(course.category.toLowerCase())) {
      score += 12;
    }
  });

  // Match goals
  goals.forEach(goal => {
    const goalLower = goal.toLowerCase();
    
    // Check if goal matches course tags
    course.tags.forEach(tag => {
      if (tag.toLowerCase().includes(goalLower) || goalLower.includes(tag.toLowerCase())) {
        score += 12;
      }
    });

    // Check if goal appears in title or description
    if (course.title.toLowerCase().includes(goalLower) || course.description.toLowerCase().includes(goalLower)) {
      score += 8;
    }
  });

  return score;
}

/**
 * Calculate score based on viewing history and similar courses
 * (Collaborative filtering approach)
 */
function calculateHistoryScore(course: Course, allCourses: Course[], userProfile: UserProfile): number {
  // Get courses user has enrolled in or progressed
  const viewedCourses = allCourses.filter(c => 
    c.enrolled && c.progress && c.progress > 0
  );

  if (viewedCourses.length === 0) {
    return 0;
  }

  let score = 0;

  viewedCourses.forEach(viewedCourse => {
    // Don't recommend the same course
    if (viewedCourse.id === course.id) {
      return;
    }

    // Calculate similarity based on shared tags
    const sharedTags = course.tags.filter(tag => viewedCourse.tags.includes(tag));
    score += sharedTags.length * 8;

    // Same category bonus
    if (course.category === viewedCourse.category) {
      score += 10;
    }

    // Same instructor bonus (user likes this instructor's style)
    if (course.instructor === viewedCourse.instructor) {
      score += 15;
    }

    // Weight by how much they progressed in the viewed course
    // Higher progress = stronger signal of interest
    if (viewedCourse.progress) {
      const progressWeight = viewedCourse.progress / 100;
      score += progressWeight * 5;
    }
  });

  return score;
}

/**
 * Calculate score based on tag matching with user's overall preferences
 */
function calculateTagScore(course: Course, userProfile: UserProfile): number {
  const interests = userProfile.initialQuestionnaire?.interests || [];
  let score = 0;

  // Create a set of all relevant tags from user's interests
  const relevantTags = new Set<string>();
  interests.forEach(interest => {
    relevantTags.add(interest.toLowerCase());
  });

  // Score based on tag matches
  course.tags.forEach(tag => {
    const tagLower = tag.toLowerCase();
    
    // Direct match
    if (relevantTags.has(tagLower)) {
      score += 10;
    }

    // Partial match
    interests.forEach(interest => {
      if (tagLower.includes(interest.toLowerCase()) || interest.toLowerCase().includes(tagLower)) {
        score += 5;
      }
    });
  });

  return score;
}

/**
 * Boost score for courses in progress
 * Encourages users to complete what they started
 */
function calculateProgressBoost(course: Course): number {
  if (!course.enrolled || !course.progress || course.progress === 0) {
    return 0;
  }

  // Strong boost for courses with some progress (not completed)
  if (course.progress > 0 && course.progress < 100) {
    // Higher boost for courses closer to completion
    return 20 + (course.progress / 100) * 30;
  }

  return 0;
}

/**
 * Get explanation for why a course was recommended
 */
export function getRecommendationReason(
  course: Course,
  userProfile: UserProfile | null
): string {
  if (!userProfile) {
    return 'Curs popular';
  }

  const mood = userProfile.dailyMood?.mood || '';
  const interests = userProfile.initialQuestionnaire?.interests || [];

  // Check if it's a continuation
  if (course.enrolled && course.progress && course.progress > 0 && course.progress < 100) {
    return `Continue: ${course.progress}% completat`;
  }

  // Check mood alignment
  if (mood === 'felicit' && course.tags.some(tag => ['inspiring', 'creative', 'success'].includes(tag))) {
    return 'Perfect pentru starea ta de azi ✨';
  }
  if (mood === 'motivat' && course.tags.some(tag => ['achievement', 'leadership', 'goals'].includes(tag))) {
    return 'Se potrivește cu energia ta! 🔥';
  }
  if (mood === 'relaxat' && course.tags.some(tag => ['relaxing', 'creative', 'artistic'].includes(tag))) {
    return 'Ideal pentru relaxare 🌿';
  }
  if (mood === 'curios' && course.tags.some(tag => ['learning', 'innovation', 'science'].includes(tag))) {
    return 'Pentru mintea ta curioasă 🧠';
  }

  // Check interests alignment
  const matchingInterest = interests.find(interest => 
    course.tags.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
  );
  if (matchingInterest) {
    return `Bazat pe interesul tău: ${matchingInterest}`;
  }

  return 'Recomandat pentru tine';
}
