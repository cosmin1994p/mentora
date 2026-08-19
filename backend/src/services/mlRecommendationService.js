import axios from 'axios';

const ML_API_BASE_URL = process.env.ML_API_URL || '';
const ML_ENABLED = Boolean(ML_API_BASE_URL);

class MLRecommendationService {
  constructor() {
    this.mlApiUrl = ML_API_BASE_URL;
    this.retryCount = 3;
    this.retryDelay = 1000; // ms
  }

  /**
   * Call Python ML engine for emotion-based recommendations
   */
  async getEmotionBasedRecommendations(userData) {
    if (!ML_ENABLED) {
      return { success: false, recommendations: [] };
    }
    try {
      const response = await this.retryRequest(async () => {
        return await axios.post(`${this.mlApiUrl}/recommendations`, {
          currentMood: userData.currentEmotion,
          energyLevel: userData.currentEnergyLevel,
          enrolledCourses: userData.enrolledCourses || [],
          completedCourses: userData.completedCourses || [],
          learningHistory: userData.learningHistory || [],
          preferredTags: userData.preferredTags || [],
          recentEmotions: userData.recentEmotions || [],
          userId: userData._id.toString()
        }, {
          timeout: 30000
        });
      });

      return response.data;
    } catch (error) {
      console.error('ML API Error:', error.message);
      return {
        success: false,
        error: 'ML Service unavailable',
        recommendations: []
      };
    }
  }

  /**
   * Get health status of ML API
   */
  async checkMLServiceHealth() {
    if (!ML_ENABLED) {
      return false;
    }
    try {
      const response = await axios.get(`${this.mlApiUrl}/health`, {
        timeout: 5000
      });
      return response.data.status === 'healthy';
    } catch (error) {
      console.warn('ML Service health check failed:', error.message);
      return false;
    }
  }

  /**
   * Record user interaction with course for ML model training
   */
  async recordInteraction(userId, courseId, actionType, emotion) {
    if (!ML_ENABLED) {
      return;
    }
    try {
      await this.retryRequest(async () => {
        return await axios.post(`${this.mlApiUrl}/interactions`, {
          userId: userId.toString(),
          courseId: courseId.toString(),
          actionType, // 'view', 'enroll', 'complete', 'rate'
          emotion,
          timestamp: new Date().toISOString()
        }, {
          timeout: 10000
        });
      });
    } catch (error) {
      console.warn('Failed to record interaction:', error.message);
      // Don't throw - non-critical operation
    }
  }

  /**
   * Retry logic for API calls
   */
  async retryRequest(requestFn) {
    let lastError;
    for (let i = 0; i < this.retryCount; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        if (i < this.retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)));
        }
      }
    }
    throw lastError;
  }
}

export default new MLRecommendationService();
