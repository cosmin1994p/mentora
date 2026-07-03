/**
 * useEmotionRecommendations Hook
 * ===============================
 * React hook for fetching emotion-based course recommendations
 * from the ML API service.
 */

import { useState, useEffect, useCallback } from 'react';
import { Course, UserProfile } from '../App';
import { 
  emotionRecommendationService,
  getEmotionBasedRecommendations,
  recordCourseInteraction,
  MLRecommendation
} from './emotionRecommendationService';

interface UseEmotionRecommendationsResult {
  recommendations: Course[];
  isLoading: boolean;
  error: string | null;
  isServiceOnline: boolean;
  refreshRecommendations: () => Promise<void>;
  recordInteraction: (courseId: string, type: 'view' | 'enroll' | 'complete' | 'rate', rating?: number) => Promise<void>;
  getMoodCategories: () => Promise<Array<{ category: string; affinity: number }>>;
}

interface UseEmotionRecommendationsOptions {
  numRecommendations?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

/**
 * Hook for getting emotion-based course recommendations
 */
export function useEmotionRecommendations(
  userProfile: UserProfile | null,
  courses: Course[],
  options: UseEmotionRecommendationsOptions = {}
): UseEmotionRecommendationsResult {
  const {
    numRecommendations = 10,
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes
  } = options;

  const [recommendations, setRecommendations] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isServiceOnline, setIsServiceOnline] = useState(false);

  // Check service status
  useEffect(() => {
    const checkStatus = async () => {
      const online = await emotionRecommendationService.checkHealth();
      setIsServiceOnline(online);
    };
    checkStatus();
  }, []);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!userProfile || courses.length === 0) {
      setRecommendations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const recs = await getEmotionBasedRecommendations(
        userProfile,
        courses,
        numRecommendations
      );
      setRecommendations(recs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(errorMessage);
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, courses, numRecommendations]);

  // Initial fetch
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRecommendations();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchRecommendations]);

  // Refresh when mood changes
  useEffect(() => {
    if (userProfile?.dailyMood) {
      fetchRecommendations();
    }
  }, [userProfile?.dailyMood?.mood, userProfile?.dailyMood?.energy]);

  // Record interaction
  const recordInteraction = useCallback(async (
    courseId: string,
    type: 'view' | 'enroll' | 'complete' | 'rate',
    rating?: number
  ) => {
    await recordCourseInteraction(userProfile, courseId, type, rating);
  }, [userProfile]);

  // Get mood-based categories
  const getMoodCategories = useCallback(async () => {
    if (!userProfile?.dailyMood) {
      return [];
    }

    const result = await emotionRecommendationService.getMoodBasedRecommendations(
      userProfile.dailyMood.mood,
      userProfile.dailyMood.energy,
      courses,
      5
    );

    return result.recommendedCategories;
  }, [userProfile, courses]);

  return {
    recommendations,
    isLoading,
    error,
    isServiceOnline,
    refreshRecommendations: fetchRecommendations,
    recordInteraction,
    getMoodCategories
  };
}

/**
 * Hook for mood-specific recommendations
 */
export function useMoodRecommendations(
  targetMood: string,
  targetEnergy: string,
  courses: Course[],
  numRecommendations: number = 5
) {
  const [recommendations, setRecommendations] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; affinity: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMoodRecommendations = async () => {
      if (!targetMood || courses.length === 0) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await emotionRecommendationService.getMoodBasedRecommendations(
          targetMood,
          targetEnergy,
          courses,
          numRecommendations
        );

        setRecommendations(result.recommendations);
        setCategories(result.recommendedCategories);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get mood recommendations';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoodRecommendations();
  }, [targetMood, targetEnergy, courses, numRecommendations]);

  return {
    recommendations,
    categories,
    isLoading,
    error
  };
}

/**
 * Utility hook for tracking course interactions
 */
export function useCourseInteractionTracker(userProfile: UserProfile | null) {
  const trackView = useCallback(async (courseId: string) => {
    if (!userProfile) return;
    await recordCourseInteraction(userProfile, courseId, 'view');
  }, [userProfile]);

  const trackEnroll = useCallback(async (courseId: string) => {
    if (!userProfile) return;
    await recordCourseInteraction(userProfile, courseId, 'enroll');
  }, [userProfile]);

  const trackComplete = useCallback(async (courseId: string) => {
    if (!userProfile) return;
    await recordCourseInteraction(userProfile, courseId, 'complete');
  }, [userProfile]);

  const trackRating = useCallback(async (courseId: string, rating: number) => {
    if (!userProfile) return;
    await recordCourseInteraction(userProfile, courseId, 'rate', rating);
  }, [userProfile]);

  return {
    trackView,
    trackEnroll,
    trackComplete,
    trackRating
  };
}

export default useEmotionRecommendations;
