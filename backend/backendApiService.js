const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class BackendApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    };
  }

  async request(method, endpoint, body = null) {
    try {
      const options = {
        method,
        headers: this.getHeaders()
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async register(username, email, password) {
    return this.request('POST', '/auth/register', { username, email, password });
  }

  async login(email, password, emotion = 'MOTIVAT', energyLevel = 'MEDIE') {
    const result = await this.request('POST', '/auth/login', {
      email,
      password,
      emotion,
      energyLevel
    });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  async getCurrentUser() {
    return this.request('GET', '/auth/me');
  }

  async updateEmotion(emotion, energyLevel) {
    return this.request('PUT', '/auth/emotion', { emotion, energyLevel });
  }

  async updatePreferredTags(tags) {
    return this.request('PUT', '/auth/tags', { tags });
  }

  // Course endpoints
  async getCourses(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.tags) params.append('tags', filters.tags.join(','));
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    return this.request('GET', `/courses${queryString ? '?' + queryString : ''}`);
  }

  async getCourseById(courseId) {
    return this.request('GET', `/courses/${courseId}`);
  }

  async getCategories() {
    return this.request('GET', '/courses/categories');
  }

  async createCourse(courseData) {
    return this.request('POST', '/courses', courseData);
  }

  // Recommendation endpoints
  async getRecommendations() {
    return this.request('GET', '/recommendations');
  }

  async getRecommendationsByEmotion(emotion, energyLevel) {
    return this.request('POST', '/recommendations/emotion', {
      emotion,
      energyLevel
    });
  }

  async recordInteraction(courseId, actionType) {
    return this.request('POST', '/recommendations/interaction', {
      courseId,
      actionType
    });
  }

  async rateCourse(courseId, rating, emotion) {
    return this.request('POST', '/recommendations/rate', {
      courseId,
      rating,
      emotion
    });
  }

  // Health check
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default new BackendApiService();
