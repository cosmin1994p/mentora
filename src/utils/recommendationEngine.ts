/**
 * TypeScript Recommendation Engine Integration
 * Bridge between React frontend and Python ML backend
 */

export enum UserMood {
  ENERGETIC = 'energetic',
  CALM = 'calm',
  CREATIVE = 'creative',
  FOCUSED = 'focused',
  MOTIVATED = 'motivated',
  RELAXED = 'relaxed',
  CURIOUS = 'curious',
  INSPIRED = 'inspired'
}

export interface MoodOption {
  id: string
  label: string
  emoji: string
  description: string
}

export interface CourseRecommendation {
  courseId: string
  title: string
  category: string
  instructor: string
  rating: number
  studentsCount: number
  durationMinutes: number
  tags: string[]
  description: string
  recommendationScore: number
  scoreBreakdown?: {
    moodScore: number
    personalizationScore: number
    similarityScore: number
    popularityScore: number
  }
}

export interface RecommendationResponse {
  success: boolean
  data?: {
    recommendations: CourseRecommendation[]
    userMood: string
    count: number
    timestamp: string
  }
  error?: string
}

export interface UserLearningStats {
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  completionRate: number
  averageRating: number
  categoryDistribution: Record<string, number>
  topTags: [string, number][]
  currentMood: string
}

export interface StatsResponse {
  success: boolean
  data?: UserLearningStats
  error?: string
}

export interface MoodOptionsResponse {
  moods: MoodOption[]
}

/**
 * RecommendationService handles communication with the ML backend
 * Can be used with Python Flask/FastAPI or a Node.js adapter
 */
export class RecommendationService {
  private apiBase: string
  private apiKey?: string

  constructor(apiBase: string = '/api/recommendations', apiKey?: string) {
    this.apiBase = apiBase
    this.apiKey = apiKey
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiBase}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get available mood options for UI display
   */
  async getMoodOptions(): Promise<MoodOption[]> {
    const response = await this.fetch<MoodOptionsResponse>('/mood-options')
    return response.moods
  }

  /**
   * Get personalized course recommendations
   */
  async getRecommendations(
    userId: string,
    mood: UserMood,
    enrolledCourses: string[],
    completedCourses: string[],
    courseRatings: Record<string, number> = {},
    numRecommendations: number = 5,
    includeBreakdown: boolean = true
  ): Promise<CourseRecommendation[]> {
    const userData = {
      userId,
      mood,
      enrolledCourses,
      completedCourses,
      courseRatings,
      numRecommendations,
      includeBreakdown
    }

    const response = await this.fetch<RecommendationResponse>('/recommend', {
      method: 'POST',
      body: JSON.stringify(userData)
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to get recommendations')
    }

    return response.data?.recommendations || []
  }

  /**
   * Get recommendations for a specific mood (mood-specific collection)
   */
  async getRecommendationsByMood(
    userId: string,
    currentMood: UserMood,
    targetMood: UserMood,
    enrolledCourses: string[],
    completedCourses: string[],
    numRecommendations: number = 5
  ): Promise<CourseRecommendation[]> {
    const userData = {
      userId,
      mood: currentMood,
      enrolledCourses,
      completedCourses,
      targetMood,
      numRecommendations
    }

    const response = await this.fetch<RecommendationResponse>(
      '/recommend-by-mood',
      {
        method: 'POST',
        body: JSON.stringify(userData)
      }
    )

    if (!response.success) {
      throw new Error(response.error || 'Failed to get mood-based recommendations')
    }

    return response.data?.recommendations || []
  }

  /**
   * Get user learning statistics and insights
   */
  async getUserStats(
    userId: string,
    mood: UserMood,
    enrolledCourses: string[],
    completedCourses: string[],
    courseRatings: Record<string, number> = {}
  ): Promise<UserLearningStats> {
    const userData = {
      userId,
      mood,
      enrolledCourses,
      completedCourses,
      courseRatings
    }

    const response = await this.fetch<StatsResponse>('/stats', {
      method: 'POST',
      body: JSON.stringify(userData)
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to get user statistics')
    }

    return response.data!
  }
}

/**
 * Local recommendation engine (client-side, no server needed)
 * Uses pre-computed mood/tag affinities
 */
export class LocalRecommendationEngine {
  private moodCategoryAffinities: Record<UserMood, Record<string, number>> = {
    [UserMood.ENERGETIC]: {
      sports: 0.95, business: 0.85, music: 0.80, creative: 0.70, tech: 0.65, culinary: 0.60
    },
    [UserMood.CALM]: {
      wellness: 0.95, creative: 0.85, culinary: 0.80, music: 0.75, photography: 0.70, design: 0.65
    },
    [UserMood.CREATIVE]: {
      creative: 0.95, design: 0.90, music: 0.85, photography: 0.85, culinary: 0.75, tech: 0.65
    },
    [UserMood.FOCUSED]: {
      tech: 0.95, business: 0.90, design: 0.85, creative: 0.80, music: 0.70, culinary: 0.65
    },
    [UserMood.MOTIVATED]: {
      business: 0.95, tech: 0.90, sports: 0.85, creative: 0.80, design: 0.75, music: 0.65
    },
    [UserMood.RELAXED]: {
      wellness: 0.95, music: 0.90, creative: 0.85, culinary: 0.80, photography: 0.75, design: 0.70
    },
    [UserMood.CURIOUS]: {
      tech: 0.95, design: 0.90, creative: 0.85, business: 0.80, culinary: 0.75, photography: 0.70
    },
    [UserMood.INSPIRED]: {
      creative: 0.95, music: 0.90, design: 0.85, business: 0.80, photography: 0.75, tech: 0.70
    }
  }

  /**
   * Calculate mood-based score for a course
   */
  calculateMoodScore(
    categoryAffinity: number,
    tagAffinities: number[]
  ): number {
    const avgTagAffinity = tagAffinities.length > 0 
      ? tagAffinities.reduce((a, b) => a + b, 0) / tagAffinities.length 
      : 0.3

    return (categoryAffinity * 0.5) + (avgTagAffinity * 0.5)
  }

  /**
   * Calculate personalization score based on user history
   */
  calculatePersonalizationScore(
    userTags: Set<string>,
    courseTags: string[],
    userCategories: Set<string>,
    courseCategory: string
  ): number {
    const tagMatches = courseTags.filter(tag => userTags.has(tag)).length
    const tagScore = courseTags.length > 0 ? tagMatches / courseTags.length : 0.5

    const categoryScore = userCategories.has(courseCategory) ? 1.0 : 0.5

    return (tagScore * 0.4) + (categoryScore * 0.6)
  }

  /**
   * Get top recommended courses
   */
  async getRecommendations(
    courses: any[],
    mood: UserMood,
    enrolledCourseIds: Set<string>,
    completedCourseIds: Set<string>,
    userRatings: Record<string, number>,
    numRecommendations: number = 5
  ): Promise<CourseRecommendation[]> {
    // Extract user preferences
    const userTags = new Set<string>()
    const userCategories = new Set<string>()

    for (const courseId of completedCourseIds) {
      const course = courses.find((c: any) => c.id === courseId)
      if (course) {
        course.tags?.forEach((tag: string) => userTags.add(tag))
        userCategories.add(course.category)
      }
    }

    // Score all courses
    const scored = courses
      .filter(
        (course: any) =>
          !enrolledCourseIds.has(course.id) && !completedCourseIds.has(course.id)
      )
      .map((course: any) => {
        const categoryAffinities = this.moodCategoryAffinities[mood] || {}
        const categoryAffinity = categoryAffinities[course.category] || 0.3

        const moodScore = this.calculateMoodScore(categoryAffinity, [])

        const personalizationScore = this.calculatePersonalizationScore(
          userTags,
          course.tags || [],
          userCategories,
          course.category
        )

        const popularityScore =
          ((course.students || 0) / 100000) * 0.4 + ((course.rating || 0) / 5) * 0.6

        const finalScore =
          moodScore * 0.4 +
          personalizationScore * 0.3 +
          personaliz * 0.15 +
          popularityScore * 0.15

        return {
          courseId: course.id,
          title: course.title,
          category: course.category,
          instructor: course.instructor,
          rating: course.rating,
          studentsCount: course.students,
          durationMinutes: course.duration,
          tags: course.tags || [],
          description: course.description,
          recommendationScore: Math.round(finalScore * 100)
        }
      })

    // Sort and return top N
    return scored.sort((a: any, b: any) => b.recommendationScore - a.recommendationScore).slice(0, numRecommendations)
  }
}

/**
 * Utility functions for mood-related UI features
 */
export class MoodUtils {
  static getMoodEmoji(mood: UserMood): string {
    const emojiMap: Record<UserMood, string> = {
      [UserMood.ENERGETIC]: '⚡',
      [UserMood.CALM]: '🧘',
      [UserMood.CREATIVE]: '🎨',
      [UserMood.FOCUSED]: '🎯',
      [UserMood.MOTIVATED]: '🚀',
      [UserMood.RELAXED]: '😌',
      [UserMood.CURIOUS]: '🔍',
      [UserMood.INSPIRED]: '✨'
    }
    return emojiMap[mood]
  }

  static getMoodLabel(mood: UserMood): string {
    const labelMap: Record<UserMood, string> = {
      [UserMood.ENERGETIC]: 'Energetic',
      [UserMood.CALM]: 'Calm',
      [UserMood.CREATIVE]: 'Creative',
      [UserMood.FOCUSED]: 'Focused',
      [UserMood.MOTIVATED]: 'Motivated',
      [UserMood.RELAXED]: 'Relaxed',
      [UserMood.CURIOUS]: 'Curious',
      [UserMood.INSPIRED]: 'Inspired'
    }
    return labelMap[mood]
  }

  static getMoodColor(mood: UserMood): string {
    const colorMap: Record<UserMood, string> = {
      [UserMood.ENERGETIC]: 'from-yellow-500 to-[#FF5530]',
      [UserMood.CALM]: 'from-blue-400 to-cyan-400',
      [UserMood.CREATIVE]: 'from-purple-500 to-pink-500',
      [UserMood.FOCUSED]: 'from-indigo-500 to-blue-500',
      [UserMood.MOTIVATED]: 'from-red-500 to-pink-500',
      [UserMood.RELAXED]: 'from-green-400 to-teal-400',
      [UserMood.CURIOUS]: 'from-amber-500 to-yellow-500',
      [UserMood.INSPIRED]: 'from-purple-400 to-pink-400'
    }
    return colorMap[mood]
  }

  static formatRecommendationScore(score: number): string {
    return `${score.toFixed(0)}%`
  }

  static getScoreInterpretation(score: number): string {
    if (score >= 85) return 'Excellent match for your mood'
    if (score >= 70) return 'Great match for your mood'
    if (score >= 55) return 'Good match for your mood'
    return 'Might be interesting to explore'
  }
}

export default RecommendationService
