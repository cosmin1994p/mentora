/**
 * React/TypeScript Integration Examples
 * How to integrate the ML Recommendation Engine into your React components
 */

import { API_BASE_URL } from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type UserMood =
  | 'energetic' | 'calm' | 'creative' | 'focused' | 'motivated'
  | 'relaxed' | 'curious' | 'inspired' | 'stressed' | 'confused';

export interface RecommendationScore {
  moodScore: number;
  personalizationScore: number;
  similarityScore: number;
  popularityScore: number;
  diversityBonus: number;
  recencyBonus: number;
}

export interface CourseRecommendation {
  rank: number;
  courseId: string;
  title: string;
  category: string;
  instructor: string;
  rating: number;
  studentsCount: number;
  durationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  description: string;
  recommendationScore: number;
  scorePercentage: number;
  scoreBreakdown?: RecommendationScore;
}

export interface RecommendationResponse {
  success: boolean;
  timestamp: string;
  userId: string;
  userMood: UserMood;
  recommendationCount: number;
  recommendations: CourseRecommendation[];
  from_cache?: boolean;
}

// ============================================================================
// API CLIENT SERVICE
// ============================================================================

class MLRecommendationClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL.replace('/api', '')) {
    this.baseURL = baseURL;
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(
    userId: string,
    currentMood: UserMood,
    enrolledCourses: string[] = [],
    completedCourses: string[] = [],
    courseRatings: Record<string, number> = {},
    watchedMinutes: Record<string, number> = {},
    numRecommendations: number = 5
  ): Promise<RecommendationResponse> {
    try {
      const response = await fetch(`${this.baseURL}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          currentMood,
          enrolledCourses,
          completedCourses,
          courseRatings,
          watchedMinutes,
          num_recommendations: numRecommendations,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  /**
   * Get mood-specific recommendations
   */
  async getMoodSpecificRecommendations(
    userId: string,
    targetMood: UserMood,
    enrolledCourses: string[] = [],
    completedCourses: string[] = [],
    numRecommendations: number = 5
  ): Promise<RecommendationResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/recommendations/by-mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          targetMood,
          enrolledCourses,
          completedCourses,
          num_recommendations: numRecommendations,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching mood-specific recommendations:', error);
      throw error;
    }
  }

  /**
   * Get available moods
   */
  async getAvailableMoods(): Promise<UserMood[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/moods`);

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.moods;
    } catch (error) {
      console.error('Error fetching moods:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// CUSTOM REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for fetching recommendations
 */
export function useRecommendations(userId: string) {
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = new MLRecommendationClient();

  const fetchRecommendations = useCallback(
    async (
      mood: UserMood,
      enrolledCourses: string[],
      completedCourses: string[],
      courseRatings: Record<string, number> = {}
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await client.getRecommendations(
          userId,
          mood,
          enrolledCourses,
          completedCourses,
          courseRatings,
          {},
          5
        );

        if (response.success) {
          setRecommendations(response.recommendations);
        } else {
          setError('Failed to fetch recommendations');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  return { recommendations, loading, error, fetchRecommendations };
}

/**
 * Hook for mood-specific recommendations
 */
export function useMoodSpecificRecommendations(userId: string) {
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = new MLRecommendationClient();

  const fetchByMood = useCallback(
    async (
      targetMood: UserMood,
      enrolledCourses: string[],
      completedCourses: string[]
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await client.getMoodSpecificRecommendations(
          userId,
          targetMood,
          enrolledCourses,
          completedCourses,
          5
        );

        if (response.success) {
          setRecommendations(response.recommendations);
        } else {
          setError('Failed to fetch recommendations');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  return { recommendations, loading, error, fetchByMood };
}

/**
 * Hook for available moods
 */
export function useMoods() {
  const [moods, setMoods] = useState<UserMood[]>([]);
  const [loading, setLoading] = useState(true);
  const client = new MLRecommendationClient();

  useEffect(() => {
    client.getAvailableMoods().then(setMoods).finally(() => setLoading(false));
  }, []);

  return { moods, loading };
}

// ============================================================================
// EXAMPLE COMPONENTS
// ============================================================================

/**
 * Example: RecommendationGrid Component
 */
export function RecommendationGrid({
  recommendations,
  onCourseSelect,
}: {
  recommendations: CourseRecommendation[];
  onCourseSelect: (courseId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recommendations.map((course) => (
        <div
          key={course.courseId}
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
        >
          {/* Recommendation Score Badge */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">
              #{course.rank}
            </span>
            <div className="bg-green-100 text-green-800 px-2 py-1 rounded">
              {course.recommendationScore}%
            </div>
          </div>

          {/* Course Title */}
          <h3 className="text-lg font-bold mb-2">{course.title}</h3>

          {/* Course Info */}
          <div className="text-sm text-gray-600 mb-3">
            <p>👨‍🏫 {course.instructor}</p>
            <p>⭐ {course.rating}/5 ({course.studentsCount.toLocaleString()} students)</p>
            <p>⏱️ {course.durationMinutes} minutes</p>
            <p>📚 {course.category}</p>
          </div>

          {/* Tags */}
          <div className="mb-3 flex flex-wrap gap-1">
            {course.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-[#002147]/20 text-[#FF5530] text-xs px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Score Breakdown */}
          {course.scoreBreakdown && (
            <div className="mb-3 text-xs bg-gray-50 p-2 rounded">
              <p>Mood Match: {course.scoreBreakdown.moodScore}%</p>
              <p>Personalization: {course.scoreBreakdown.personalizationScore}%</p>
              <p>Similarity: {course.scoreBreakdown.similarityScore}%</p>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => onCourseSelect(course.courseId)}
            className="w-full bg-[#002147] text-white py-2 rounded hover:bg-[#003366] transition"
          >
            View Course
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Example: MoodSelector Component with Recommendations
 */
export function MoodSelectorWithRecommendations({
  userId,
  enrolledCourses,
  completedCourses,
  courseRatings,
}: {
  userId: string;
  enrolledCourses: string[];
  completedCourses: string[];
  courseRatings: Record<string, number>;
}) {
  const { moods, loading: modsLoading } = useMoods();
  const [selectedMood, setSelectedMood] = useState<UserMood>('creative');
  const { recommendations, loading, error, fetchRecommendations } =
    useRecommendations(userId);

  useEffect(() => {
    if (selectedMood) {
      fetchRecommendations(selectedMood, enrolledCourses, completedCourses, courseRatings);
    }
  }, [selectedMood]);

  return (
    <div className="w-full">
      {/* Mood Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          How are you feeling today?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {moods.map((mood) => (
            <button
              key={mood}
              onClick={() => setSelectedMood(mood)}
              className={`py-2 px-3 rounded text-sm font-medium transition ${selectedMood === mood
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              {mood.charAt(0).toUpperCase() + mood.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {loading && <p className="text-center text-gray-500">Loading recommendations...</p>}
      {error && <p className="text-center text-[#FF5530]">Error: {error}</p>}

      {recommendations.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mb-4">
            Recommended for your {selectedMood} mood
          </h2>
          <RecommendationGrid
            recommendations={recommendations}
            onCourseSelect={(courseId) => {
              console.log('Course selected:', courseId);
              // Navigate to course details
            }}
          />
        </>
      )}
    </div>
  );
}

/**
 * Example: RecommendationDetails Component
 */
export function RecommendationDetails({
  recommendation,
}: {
  recommendation: CourseRecommendation;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-bold">{recommendation.title}</h1>
          <p className="text-gray-600">by {recommendation.instructor}</p>
        </div>
        <div className="bg-[#FF5530] text-white px-4 py-2 rounded-lg">
          Recommendation: {recommendation.recommendationScore}%
        </div>
      </div>

      {/* Course Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6 py-4 border-y">
        <div>
          <p className="text-gray-600 text-sm">Rating</p>
          <p className="text-2xl font-bold">{'⭐'.repeat(Math.round(recommendation.rating))}</p>
          <p className="text-sm">{recommendation.rating}/5</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Students</p>
          <p className="text-2xl font-bold">{(recommendation.studentsCount / 1000).toFixed(0)}K</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Duration</p>
          <p className="text-2xl font-bold">
            {Math.round(recommendation.durationMinutes / 60)}h
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Difficulty</p>
          <p className="text-2xl font-bold capitalize">{recommendation.difficulty.charAt(0)}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Topics Covered</h3>
        <div className="flex flex-wrap gap-2">
          {recommendation.tags.map((tag) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Score Breakdown */}
      {recommendation.scoreBreakdown && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Why This Recommendation?</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Mood Match</span>
              <div className="w-32 bg-gray-200 rounded">
                <div
                  className="bg-blue-500 h-2 rounded"
                  style={{ width: `${recommendation.scoreBreakdown.moodScore}%` }}
                />
              </div>
              <span className="text-sm">{recommendation.scoreBreakdown.moodScore}%</span>
            </div>
            <div className="flex justify-between">
              <span>Personalization</span>
              <div className="w-32 bg-gray-200 rounded">
                <div
                  className="bg-[#FF5530] h-2 rounded"
                  style={{ width: `${recommendation.scoreBreakdown.personalizationScore}%` }}
                />
              </div>
              <span className="text-sm">
                {recommendation.scoreBreakdown.personalizationScore}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Similarity to Your Courses</span>
              <div className="w-32 bg-gray-200 rounded">
                <div
                  className="bg-purple-500 h-2 rounded"
                  style={{ width: `${recommendation.scoreBreakdown.similarityScore}%` }}
                />
              </div>
              <span className="text-sm">{recommendation.scoreBreakdown.similarityScore}%</span>
            </div>
            <div className="flex justify-between">
              <span>Popularity</span>
              <div className="w-32 bg-gray-200 rounded">
                <div
                  className="bg-yellow-500 h-2 rounded"
                  style={{ width: `${recommendation.scoreBreakdown.popularityScore}%` }}
                />
              </div>
              <span className="text-sm">{recommendation.scoreBreakdown.popularityScore}%</span>
            </div>
          </div>
        </div>
      )}

      {/* CTA Button */}
      <button className="w-full bg-[#002147] text-white py-3 rounded-lg font-semibold hover:bg-[#003366] transition">
        Enroll Now
      </button>
    </div>
  );
}

// ============================================================================
// USAGE EXAMPLE IN A PAGE
// ============================================================================

/**
 * Example page component
 */
export function RecommendationPage({ userId }: { userId: string }) {
  const [userState, setUserState] = useState({
    enrolledCourses: [],
    completedCourses: [],
    courseRatings: {},
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Personalized Learning Path</h1>

      <MoodSelectorWithRecommendations
        userId={userId}
        enrolledCourses={userState.enrolledCourses}
        completedCourses={userState.completedCourses}
        courseRatings={userState.courseRatings}
      />
    </div>
  );
}

export default MLRecommendationClient;
