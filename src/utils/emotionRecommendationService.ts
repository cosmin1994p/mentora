/**
 * Emotion-Based ML Recommendation Service
 * ========================================
 * TypeScript service for integrating the Python ML recommendation API
 * with the React frontend.
 * 
 * This service communicates with the Flask API server to get
 * personalized course recommendations based on user emotions.
 */

import { Course, UserProfile } from '../App';

// API Configuration
// API Configuration
const getMlApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:5001`;
  }
  return 'http://localhost:5001';
};

const ML_API_BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ML_API_URL) || getMlApiUrl();

// Types
export interface MoodData {
  mood: string;
  energy: string;
}

export interface RecommendationRequest {
  userId: string;
  dailyMood: MoodData;
  interests?: string[];
  activityDomain?: string;
  enrolledCourses: string[];
  completedCourses: string[];
  courseRatings: Record<string, number>;
  numRecommendations?: number;
  excludeEnrolled?: boolean;
}

export interface MatchFactors {
  emotionMatch: number;
  energyMatch: number;
  interestMatch: number;
  domainMatch: number;
  historyMatch: number;
  tagMatch: number;
  categoryMatch: number;
}

export interface MLRecommendation {
  courseId: string;
  title: string;
  category: string;
  tags: string[];
  rating: number;
  students: number;
  duration: string;
  instructor: string;
  description: string;
  recommendationScore: number;
  explanation: string;
  matchFactors: MatchFactors;
}

export interface RecommendationResponse {
  success: boolean;
  data?: {
    recommendations: MLRecommendation[];
    userMood: string;
    userEnergy: string;
    count: number;
    timestamp: string;
  };
  error?: string;
}

export interface MoodRecommendationRequest {
  targetMood: string;
  targetEnergy: string;
  numRecommendations?: number;
}

export interface MoodRecommendationResponse {
  success: boolean;
  data?: {
    recommendations: MLRecommendation[];
    targetMood: string;
    targetEnergy: string;
    recommendedCategories: Array<{ category: string; affinity: number }>;
    count: number;
    timestamp: string;
  };
  error?: string;
}

export interface InteractionRequest {
  userId: string;
  courseId: string;
  interactionType: 'view' | 'enroll' | 'complete' | 'rate';
  rating?: number;
  mood?: string;
  energy?: string;
}

export interface AvailableMoods {
  moods: Array<{ value: string; label: string; emoji: string }>;
  energyLevels: Array<{ value: string; label: string; emoji: string }>;
}

// Service class
class EmotionRecommendationService {
  private baseUrl: string;
  private isOnline: boolean = false;

  constructor(baseUrl: string = ML_API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.checkHealth();
  }

  /**
   * Check if the ML API server is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.isOnline = data.status === 'healthy';
        return this.isOnline;
      }

      this.isOnline = false;
      return false;
    } catch (error) {
      console.warn('ML API not available, using fallback recommendations');
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Get personalized course recommendations based on user profile and mood
   */
  async getRecommendations(
    userProfile: UserProfile,
    courses: Course[],
    numRecommendations: number = 10
  ): Promise<Course[]> {
    // Check API availability
    if (!this.isOnline) {
      await this.checkHealth();
    }

    if (!this.isOnline) {
      // Fallback to local recommendations
      return this.getLocalRecommendations(userProfile, courses, numRecommendations);
    }

    try {
      // Prepare request with full profile data
      const request: RecommendationRequest = {
        userId: userProfile.email || 'anonymous',
        dailyMood: {
          mood: userProfile.dailyMood?.mood || 'curios',
          energy: userProfile.dailyMood?.energy || 'medie'
        },
        interests: userProfile.initialQuestionnaire?.interests || [],
        activityDomain: userProfile.initialQuestionnaire?.activityDomain || '',
        enrolledCourses: courses.filter(c => c.enrolled).map(c => c.id),
        completedCourses: courses.filter(c => c.quizCompleted).map(c => c.id),
        courseRatings: {},
        numRecommendations,
        excludeEnrolled: false
      };

      const response = await fetch(`${this.baseUrl}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: RecommendationResponse = await response.json();

      if (result.success && result.data) {
        // Map ML recommendations back to Course objects
        const mappedCourses = this.mapRecommendationsToCourses(result.data.recommendations, courses);

        // STRICT FILTERING for ML results too
        const domain = userProfile.initialQuestionnaire?.activityDomain || '';
        const interests = userProfile.initialQuestionnaire?.interests || [];

        // Use same mapping tables as local algorithm
        const domainToTagsMap: Record<string, string[]> = {
          'technology': ['tech'],
          'education': ['languages'],
          'finance': ['finance'],
          'healthcare': ['wellness'],
          'retail': ['marketing'],
          'manufacturing': ['tech'],
          'entertainment': ['creative', 'music'],
          'consulting': ['business'],
          'startup': ['business'],
          'other': [],
        };
        const interestToTagsMap: Record<string, string[]> = {
          'technology': ['tech'],
          'design': ['design'],
          'marketing': ['marketing'],
          'business': ['business'],
          'programming': ['programming'],
          'data science': ['science'],
          'music': ['music'],
          'art': ['art'],
          'photography': ['photography'],
          'writing': ['writing'],
          'gaming': ['tech'],
          'sports': ['fitness'],
          'fitness': ['fitness'],
          'cooking': ['cooking'],
          'travel': ['languages'],
        };

        const expandedDomainTags = new Set<string>();
        if (domain) {
          (domainToTagsMap[domain.toLowerCase()] || [domain.toLowerCase()]).forEach(t => expandedDomainTags.add(t));
        }
        const expandedInterestTags = new Set<string>();
        interests.forEach((interest: string) => {
          (interestToTagsMap[interest.toLowerCase()] || [interest.toLowerCase()]).forEach(t => expandedInterestTags.add(t));
        });

        let finalCourses = mappedCourses;

        if ((expandedDomainTags.size > 0 || expandedInterestTags.size > 0) && domain?.toLowerCase() !== 'other') {
          finalCourses = mappedCourses.filter(course => {
            const courseTags = course.tags.map(t => t.toLowerCase());
            const courseCategory = course.category?.toLowerCase() || '';

            let matchesDomain = expandedDomainTags.has(courseCategory) || courseTags.some(t => expandedDomainTags.has(t));
            let matchesInterest = expandedInterestTags.has(courseCategory) || courseTags.some(t => expandedInterestTags.has(t));

            return matchesDomain || matchesInterest;
          });

          console.log(`[ML] Filtered ${mappedCourses.length} -> ${finalCourses.length} courses based on strict domain/interests`);
        }

        // If mapping returned courses, RE-SCORE them
        if (finalCourses.length > 0) {
          if (expandedDomainTags.size > 0 || expandedInterestTags.size > 0) {
            const rescoredCourses = finalCourses.map(course => {
              const category = course.category?.toLowerCase() || '';
              const tags = course.tags.map(t => t.toLowerCase());
              let boost = 0;

              // Domain match
              if (expandedDomainTags.has(category)) boost += 100;
              boost += tags.filter(t => expandedDomainTags.has(t)).length * 25;

              // Interest match
              if (expandedInterestTags.has(category)) boost += 50;
              boost += tags.filter(t => expandedInterestTags.has(t)).length * 15;

              return { course, boost };
            });

            rescoredCourses.sort((a, b) => b.boost - a.boost);

            console.log('📊 ML recommendations rescored for domain/interests:',
              rescoredCourses.slice(0, 5).map(c => ({
                title: c.course.title,
                category: c.course.category,
                boost: c.boost
              }))
            );

            return rescoredCourses.map(r => r.course);
          }

          return mappedCourses;
        }

        // If ML IDs didn't match, fall back to local algorithm with ML's mood/energy info
        console.log('ℹ ML course IDs did not match, using local algorithm with ML logic');
        return this.getLocalRecommendations(userProfile, courses, numRecommendations);
      }

      throw new Error(result.error || 'Unknown error');
    } catch (error) {
      console.error('Error getting ML recommendations:', error);
      return this.getLocalRecommendations(userProfile, courses, numRecommendations);
    }
  }

  /**
   * Get recommendations optimized for a specific mood
   */
  async getMoodBasedRecommendations(
    targetMood: string,
    targetEnergy: string,
    courses: Course[],
    numRecommendations: number = 5
  ): Promise<{
    recommendations: Course[];
    recommendedCategories: Array<{ category: string; affinity: number }>;
  }> {
    if (!this.isOnline) {
      await this.checkHealth();
    }

    if (!this.isOnline) {
      return {
        recommendations: this.getMoodFilteredCourses(targetMood, targetEnergy, courses, numRecommendations),
        recommendedCategories: this.getLocalMoodCategories(targetMood)
      };
    }

    try {
      const request: MoodRecommendationRequest = {
        targetMood,
        targetEnergy,
        numRecommendations
      };

      const response = await fetch(`${this.baseUrl}/api/recommendations/mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: MoodRecommendationResponse = await response.json();

      if (result.success && result.data) {
        return {
          recommendations: this.mapRecommendationsToCourses(result.data.recommendations, courses),
          recommendedCategories: result.data.recommendedCategories
        };
      }

      throw new Error(result.error || 'Unknown error');
    } catch (error) {
      console.error('Error getting mood recommendations:', error);
      return {
        recommendations: this.getMoodFilteredCourses(targetMood, targetEnergy, courses, numRecommendations),
        recommendedCategories: this.getLocalMoodCategories(targetMood)
      };
    }
  }

  /**
   * Record user interaction for model improvement
   */
  async recordInteraction(
    userId: string,
    courseId: string,
    interactionType: 'view' | 'enroll' | 'complete' | 'rate',
    options?: { rating?: number; mood?: string; energy?: string }
  ): Promise<boolean> {
    if (!this.isOnline) {
      return false;
    }

    try {
      const request: InteractionRequest = {
        userId,
        courseId,
        interactionType,
        ...options
      };

      const response = await fetch(`${this.baseUrl}/api/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      return response.ok;
    } catch (error) {
      console.error('Error recording interaction:', error);
      return false;
    }
  }

  /**
   * Get available moods and energy levels
   */
  async getAvailableMoods(): Promise<AvailableMoods | null> {
    if (!this.isOnline) {
      await this.checkHealth();
    }

    if (!this.isOnline) {
      return this.getLocalMoods();
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/moods`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error getting moods:', error);
      return this.getLocalMoods();
    }
  }

  // ==========================================================================
  // LOCAL FALLBACK METHODS
  // ==========================================================================

  /**
   * Local fallback when ML API is not available
   */
  private getLocalRecommendations(
    userProfile: UserProfile,
    courses: Course[],
    numRecommendations: number
  ): Course[] {
    const mood = userProfile.dailyMood?.mood || 'curios';
    const energy = userProfile.dailyMood?.energy || 'medie';
    const interests = userProfile.initialQuestionnaire?.interests || [];
    const activityDomain = userProfile.initialQuestionnaire?.activityDomain || '';

    console.log('[DEBUG] getLocalRecommendations - interests:', JSON.stringify(interests), 'domain:', activityDomain);

    return this.getMoodFilteredCourses(mood, energy, courses, numRecommendations, interests, activityDomain);
  }

  /**
   * Filter courses based on mood, energy, and interests (local implementation)
   */
  private getMoodFilteredCourses(
    mood: string,
    energy: string,
    courses: Course[],
    limit: number,
    interests: string[] = [],
    activityDomain: string = ''
  ): Course[] {
    // Interest to tags mapping - STRICT 1:1
    const interestTagsMap: Record<string, string[]> = {
      'Fitness': ['fitness'],
      'Sports': ['fitness'],
      'Technology': ['tech'],
      'Design': ['design'],
      'Marketing': ['marketing'],
      'Business': ['business'],
      'Programming': ['programming'],
      'Data Science': ['science'],
      'Music': ['music'],
      'Art': ['art'],
      'Photography': ['photography'],
      'Writing': ['writing'],
      'Gaming': ['tech'],
      'Cooking': ['cooking'],
      'Travel': ['languages']
    };

    // Category to interest mapping - STRICT 1:1
    const interestCategoryMap: Record<string, string[]> = {
      'Fitness': ['fitness'],
      'Sports': ['fitness'],
      'Technology': ['tech'],
      'Design': ['design'],
      'Marketing': ['marketing'],
      'Business': ['business'],
      'Programming': ['tech'],
      'Data Science': ['tech'],
      'Music': ['music'],
      'Art': ['creative'],
      'Photography': ['photography'],
      'Writing': ['writing'],
      'Gaming': ['tech'],
      'Cooking': ['cooking'],
      'Travel': ['languages']
    };

    // Mood to tags mapping
    const moodTagsMap: Record<string, string[]> = {
      'felicit': ['inspiring', 'creative', 'motivational', 'success', 'art'],
      'motivat': ['achievement', 'leadership', 'business', 'goals', 'intensive'],
      'relaxat': ['creative', 'artistic', 'photography', 'relaxing', 'easy', 'yoga', 'wellness'],
      'curios': ['learning', 'tech', 'science', 'innovation', 'challenging'],
      'productiv': ['business', 'productivity', 'strategy', 'efficiency', 'practical'],
      'creativ': ['art', 'design', 'creative', 'artistic', 'music']
    };

    // Energy modifiers
    const energyTagsMap: Record<string, string[]> = {
      'ridicata': ['intensive', 'challenging', 'advanced', 'hiit'],
      'medie': ['balanced', 'practical', 'moderate'],
      'scazuta': ['relaxing', 'easy', 'beginner', 'yoga', 'gentle']
    };

    // Build interest-related tags
    const interestTags: string[] = [];
    const interestCategories: string[] = [];
    for (const interest of interests) {
      interestTags.push(...(interestTagsMap[interest] || []));
      interestCategories.push(...(interestCategoryMap[interest] || []));
    }

    const moodTags = moodTagsMap[mood] || [];
    const energyTags = energyTagsMap[energy] || [];

    // Score courses
    const scoredCourses = courses
      .filter(c => !c.enrolled)
      .filter(course => {
        // STRICT FILTERING using expanded tag sets
        const courseTags = course.tags.map(t => t.toLowerCase());
        const courseCategory = course.category?.toLowerCase() || '';

        // If no preferences, allow everything
        if (!activityDomain && interests.length === 0) return true;

        // Domain matching via mapping table
        const domainMatchTags = activityDomain
          ? ({
            'technology': ['tech'],
            'education': ['languages'],
            'finance': ['finance'],
            'healthcare': ['wellness'],
            'retail': ['marketing'],
            'manufacturing': ['tech'],
            'entertainment': ['creative', 'music'],
            'consulting': ['business'],
            'startup': ['business'],
            'other': [] as string[],
          } as Record<string, string[]>)[activityDomain.toLowerCase()] || [activityDomain.toLowerCase()]
          : [];

        // If domain is 'Other', allow everything
        if (activityDomain?.toLowerCase() === 'other') return true;

        let matchesDomain = domainMatchTags.some(t => courseCategory === t || courseTags.includes(t));

        let matchesInterest = interestCategories.some(cat => courseCategory === cat);
        if (!matchesInterest) {
          matchesInterest = interestTags.some(tag => courseTags.includes(tag.toLowerCase()));
        }

        return matchesDomain || matchesInterest;
      })
      .map(course => {
        const courseTags = course.tags.map(t => t.toLowerCase());
        const courseCategory = course.category?.toLowerCase() || '';

        let score = 0;

        // HIGHEST PRIORITY: Activity Domain matching (25% weight)
        if (activityDomain) {
          const domainMatchTags = ({
            'technology': ['tech'],
            'education': ['languages'],
            'finance': ['finance'],
            'healthcare': ['wellness'],
            'retail': ['marketing'],
            'manufacturing': ['tech'],
            'entertainment': ['creative', 'music'],
            'consulting': ['business'],
            'startup': ['business'],
            'other': [] as string[],
          } as Record<string, string[]>)[activityDomain.toLowerCase()] || [activityDomain.toLowerCase()];

          if (domainMatchTags.includes(courseCategory)) {
            score += 15;
          }
          if (courseTags.some(tag => domainMatchTags.includes(tag))) {
            score += 5;
          }
        }

        // HIGH PRIORITY: Interest matching (40% weight)
        // Match by category first - strong boost
        if (interestCategories.some(cat => courseCategory.includes(cat))) {
          score += 10; // Very high boost for matching category
        }

        // Match by interest tags
        for (const tag of interestTags) {
          if (courseTags.some(ct => ct.includes(tag.toLowerCase()))) {
            score += 3; // Strong boost for each matching interest tag
          }
        }

        // MEDIUM PRIORITY: Mood matching (20% weight)
        for (const tag of moodTags) {
          if (courseTags.some(ct => ct.includes(tag.toLowerCase()))) {
            score += 1;
          }
        }

        // LOW PRIORITY: Energy matching (10% weight)
        for (const tag of energyTags) {
          if (courseTags.some(ct => ct.includes(tag.toLowerCase()))) {
            score += 0.5;
          }
        }

        // LOWEST PRIORITY: Rating boost (5% weight)
        score += (course.rating / 5) * 2;

        return { course, score };
      })
      .sort((a, b) => b.score - a.score);

    // Debug: show top 5 scored courses
    console.log('[DEBUG] ML Service - Strictly Filtered courses:',
      scoredCourses.slice(0, 5).map(sc => ({ title: sc.course.title, score: sc.score, category: sc.course.category })));

    return scoredCourses.slice(0, limit).map(sc => sc.course);
  }

  /**
   * Get local mood-category mapping
   */
  private getLocalMoodCategories(mood: string): Array<{ category: string; affinity: number }> {
    const moodCategoryMap: Record<string, Array<{ category: string; affinity: number }>> = {
      'felicit': [
        { category: 'creative', affinity: 0.9 },
        { category: 'featured', affinity: 0.8 },
        { category: 'business', affinity: 0.7 }
      ],
      'motivat': [
        { category: 'business', affinity: 0.95 },
        { category: 'tech', affinity: 0.85 },
        { category: 'featured', affinity: 0.75 }
      ],
      'relaxat': [
        { category: 'creative', affinity: 0.9 },
        { category: 'featured', affinity: 0.85 },
        { category: 'music', affinity: 0.8 }
      ],
      'curios': [
        { category: 'tech', affinity: 0.95 },
        { category: 'business', affinity: 0.8 },
        { category: 'creative', affinity: 0.75 }
      ],
      'productiv': [
        { category: 'business', affinity: 0.95 },
        { category: 'tech', affinity: 0.9 },
        { category: 'featured', affinity: 0.75 }
      ],
      'creativ': [
        { category: 'creative', affinity: 0.95 },
        { category: 'music', affinity: 0.9 },
        { category: 'featured', affinity: 0.8 }
      ]
    };

    return moodCategoryMap[mood] || moodCategoryMap['curios'];
  }

  /**
   * Get local moods data
   */
  private getLocalMoods(): AvailableMoods {
    return {
      moods: [
        { value: 'felicit', label: 'Fericit', emoji: '😊' },
        { value: 'motivat', label: 'Motivat', emoji: '💪' },
        { value: 'relaxat', label: 'Relaxat', emoji: '😌' },
        { value: 'curios', label: 'Curios', emoji: '🤔' },
        { value: 'productiv', label: 'Productiv', emoji: '⚡' },
        { value: 'creativ', label: 'Creativ', emoji: '🎨' }
      ],
      energyLevels: [
        { value: 'ridicata', label: 'Energie Ridicată', emoji: '🚀' },
        { value: 'medie', label: 'Energie Medie', emoji: '🌟' },
        { value: 'scazuta', label: 'Energie Scăzută', emoji: '🌙' }
      ]
    };
  }

  /**
   * Map ML recommendations to Course objects
   */
  private mapRecommendationsToCourses(
    recommendations: MLRecommendation[],
    courses: Course[]
  ): Course[] {
    const courseMap = new Map(courses.map(c => [c.id, c]));

    // Debug: Log IDs to understand the mismatch
    if (recommendations.length > 0 && courses.length > 0) {
      const mlIds = recommendations.slice(0, 3).map(r => (r as any).id || r.courseId);
      const courseIds = courses.slice(0, 3).map(c => c.id);
      // Debug logging removed - uncomment for debugging
      // console.log('ML IDs sample:', JSON.stringify(mlIds));
      // console.log('Course IDs sample:', JSON.stringify(courseIds));
    }

    return recommendations
      .map(rec => {
        // Check both id and courseId fields
        const recId = (rec as any).id || rec.courseId;
        return courseMap.get(recId);
      })
      .filter((c): c is Course => c !== undefined);
  }

  /**
   * Check if service is online
   */
  get isServiceOnline(): boolean {
    return this.isOnline;
  }
}

// Export singleton instance
export const emotionRecommendationService = new EmotionRecommendationService();

// Export class for custom instances
export { EmotionRecommendationService };

/**
 * React hook-compatible function for getting recommendations
 */
export async function getEmotionBasedRecommendations(
  userProfile: UserProfile | null,
  courses: Course[],
  numRecommendations: number = 10
): Promise<Course[]> {
  if (!userProfile || courses.length === 0) {
    return [];
  }

  return emotionRecommendationService.getRecommendations(
    userProfile,
    courses,
    numRecommendations
  );
}

/**
 * Record a user interaction
 */
export async function recordCourseInteraction(
  userProfile: UserProfile | null,
  courseId: string,
  interactionType: 'view' | 'enroll' | 'complete' | 'rate',
  rating?: number
): Promise<void> {
  if (!userProfile) return;

  await emotionRecommendationService.recordInteraction(
    userProfile.email || 'anonymous',
    courseId,
    interactionType,
    {
      rating,
      mood: userProfile.dailyMood?.mood,
      energy: userProfile.dailyMood?.energy
    }
  );
}
