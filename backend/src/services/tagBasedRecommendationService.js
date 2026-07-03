import Course from '../models/Course.js';
import User from '../models/User.js';

class TagBasedRecommendationService {
  /**
   * Calculate tag similarity score
   */
  calculateTagSimilarity(userTags, courseTags) {
    if (!userTags || !courseTags || userTags.length === 0 || courseTags.length === 0) {
      return 0;
    }

    const userTagSet = new Set(userTags.map(t => t.toLowerCase()));
    const commonTags = courseTags.filter(t => userTagSet.has(t.toLowerCase()));
    
    // Jaccard similarity
    const unionSize = new Set([...userTags.map(t => t.toLowerCase()), ...courseTags.map(t => t.toLowerCase())]).size;
    return unionSize > 0 ? commonTags.length / unionSize : 0;
  }

  /**
   * Get tag-based recommendations
   */
  async getTagBasedRecommendations(user, topN = 10) {
    try {
      const courses = await Course.find({
        _id: { $nin: [...(user.enrolledCourses || []), ...(user.completedCourses || [])] }
      }).limit(100);

      const scoredCourses = courses.map(course => {
        const tagScore = this.calculateTagSimilarity(user.preferredTags || [], course.tags || []);
        const categoryMatch = user.preferredTags?.includes(course.category) ? 0.3 : 0;
        const popularityScore = Math.min(course.enrollmentCount / 1000, 1) * 0.2;
        
        return {
          courseId: course._id,
          course,
          tagScore,
          categoryMatch,
          popularityScore,
          totalScore: (tagScore * 0.5) + (categoryMatch * 0.2) + (popularityScore * 0.3)
        };
      });

      return scoredCourses
        .filter(c => c.totalScore > 0)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, topN)
        .map(c => ({
          _id: c.course._id,
          title: c.course.title,
          description: c.course.description,
          category: c.course.category,
          tags: c.course.tags,
          score: c.totalScore,
          matchFactors: {
            tagMatch: c.tagScore,
            categoryMatch: c.categoryMatch,
            popularityScore: c.popularityScore
          }
        }));
    } catch (error) {
      console.error('Tag-based recommendation error:', error);
      return [];
    }
  }

  /**
   * Get popularity-based recommendations
   */
  async getPopularityBasedRecommendations(user, topN = 5) {
    try {
      const courses = await Course.find({
        _id: { $nin: [...(user.enrolledCourses || []), ...(user.completedCourses || [])] }
      })
        .sort({ enrollmentCount: -1 })
        .limit(topN);

      return courses.map(course => ({
        _id: course._id,
        title: course.title,
        description: course.description,
        enrollmentCount: course.enrollmentCount,
        rating: course.rating,
        score: (course.enrollmentCount / 10000) * (course.rating / 5) * 100
      }));
    } catch (error) {
      console.error('Popularity recommendation error:', error);
      return [];
    }
  }

  /**
   * Calculate emotion affinity score
   */
  calculateEmotionAffinity(emotion, course) {
    const emotionMap = {
      'FERICIT': 'FERICIT',
      'MOTIVAT': 'MOTIVAT',
      'RELAXAT': 'RELAXAT',
      'CURIOS': 'CURIOS',
      'PRODUCTIV': 'PRODUCTIV',
      'CREATIV': 'CREATIV'
    };

    const affinity = course.emotionAffinity[emotionMap[emotion]] || 0;
    return Math.min(affinity / 100, 1); // Normalize to 0-1
  }

  /**
   * Get emotion-based recommendations (fallback if ML API is down)
   */
  async getEmotionBasedRecommendationsFallback(user, topN = 10) {
    try {
      const courses = await Course.find({
        _id: { $nin: [...(user.enrolledCourses || []), ...(user.completedCourses || [])] }
      }).limit(100);

      const emotion = user.currentEmotion || 'NEUTRU';
      
      const scoredCourses = courses.map(course => {
        const emotionScore = this.calculateEmotionAffinity(emotion, course);
        const tagScore = this.calculateTagSimilarity(user.preferredTags || [], course.tags || []);
        const popularityScore = Math.min(course.enrollmentCount / 1000, 1);
        const ratingScore = course.rating / 5;

        const totalScore = (emotionScore * 0.4) + (tagScore * 0.25) + (popularityScore * 0.15) + (ratingScore * 0.2);

        return {
          _id: course._id,
          title: course.title,
          description: course.description,
          category: course.category,
          tags: course.tags,
          score: Math.round(totalScore * 100),
          matchFactors: {
            emotionMatch: emotionScore,
            tagMatch: tagScore,
            popularityScore,
            ratingScore
          }
        };
      });

      return scoredCourses
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
    } catch (error) {
      console.error('Emotion-based recommendation fallback error:', error);
      return [];
    }
  }
}

export default new TagBasedRecommendationService();
