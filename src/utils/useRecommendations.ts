/**
 * React Hook for ML Course Recommendations
 * Provides personalized course recommendations based on mood and history
 */

import { useState, useCallback, useEffect } from 'react'
import RecommendationService, { 
  UserMood, 
  CourseRecommendation,
  UserLearningStats 
} from './recommendationEngine'

interface UseRecommendationsProps {
  userId: string
  apiBase?: string
  apiKey?: string
}

interface UseRecommendationsReturn {
  // State
  recommendations: CourseRecommendation[]
  stats: UserLearningStats | null
  loading: boolean
  error: string | null

  // Methods
  getRecommendations: (
    mood: UserMood,
    enrolledCourses: string[],
    completedCourses: string[],
    courseRatings?: Record<string, number>,
    count?: number
  ) => Promise<void>

  getRecommendationsByMood: (
    currentMood: UserMood,
    targetMood: UserMood,
    enrolledCourses: string[],
    completedCourses: string[],
    count?: number
  ) => Promise<void>

  getStats: (
    mood: UserMood,
    enrolledCourses: string[],
    completedCourses: string[],
    courseRatings?: Record<string, number>
  ) => Promise<void>

  clearError: () => void
  reset: () => void
}

/**
 * Hook for managing course recommendations
 */
export function useRecommendations({
  userId,
  apiBase = '/api/recommendations',
  apiKey
}: UseRecommendationsProps): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([])
  const [stats, setStats] = useState<UserLearningStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const service = new RecommendationService(apiBase, apiKey)

  const getRecommendations = useCallback(
    async (
      mood: UserMood,
      enrolledCourses: string[],
      completedCourses: string[],
      courseRatings: Record<string, number> = {},
      count: number = 5
    ) => {
      setLoading(true)
      setError(null)
      try {
        const recs = await service.getRecommendations(
          userId,
          mood,
          enrolledCourses,
          completedCourses,
          courseRatings,
          count
        )
        setRecommendations(recs)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        setRecommendations([])
      } finally {
        setLoading(false)
      }
    },
    [userId, service]
  )

  const getRecommendationsByMood = useCallback(
    async (
      currentMood: UserMood,
      targetMood: UserMood,
      enrolledCourses: string[],
      completedCourses: string[],
      count: number = 5
    ) => {
      setLoading(true)
      setError(null)
      try {
        const recs = await service.getRecommendationsByMood(
          userId,
          currentMood,
          targetMood,
          enrolledCourses,
          completedCourses,
          count
        )
        setRecommendations(recs)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        setRecommendations([])
      } finally {
        setLoading(false)
      }
    },
    [userId, service]
  )

  const getStats = useCallback(
    async (
      mood: UserMood,
      enrolledCourses: string[],
      completedCourses: string[],
      courseRatings: Record<string, number> = {}
    ) => {
      setLoading(true)
      setError(null)
      try {
        const userStats = await service.getUserStats(
          userId,
          mood,
          enrolledCourses,
          completedCourses,
          courseRatings
        )
        setStats(userStats)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        setStats(null)
      } finally {
        setLoading(false)
      }
    },
    [userId, service]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setRecommendations([])
    setStats(null)
    setError(null)
  }, [])

  return {
    recommendations,
    stats,
    loading,
    error,
    getRecommendations,
    getRecommendationsByMood,
    getStats,
    clearError,
    reset
  }
}

export default useRecommendations
