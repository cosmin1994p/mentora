import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://localhost:5000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('authToken');
        }
        return Promise.reject(error);
      }
    );
  }

  // Set auth token
  async setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await AsyncStorage.setItem('authToken', token);
  }

  async clearAuthToken() {
    delete this.client.defaults.headers.common['Authorization'];
    await AsyncStorage.removeItem('authToken');
  }

  // ==================== AUTH ====================
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', {
      username,
      password,
    });
    return response.data.data;
  }

  async register(username: string, email: string, password: string, name: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
      name,
    });
    return response.data.data;
  }

  // ==================== COURSES ====================
  async getAllCourses() {
    const response = await this.client.get('/courses');
    return response.data.data;
  }

  async getCourseById(courseId: string) {
    const response = await this.client.get(`/courses/${courseId}`);
    return response.data.data;
  }

  async getCoursesByCategory(category: string) {
    const response = await this.client.get('/courses', {
      params: { category },
    });
    return response.data.data;
  }

  async enrollCourse(courseId: string) {
    const response = await this.client.post(`/courses/${courseId}/enroll`);
    return response.data;
  }

  async completeCourse(courseId: string) {
    const response = await this.client.post(`/courses/${courseId}/complete`);
    return response.data;
  }

  // ==================== REELS ====================
  async getAllReels() {
    const response = await this.client.get('/reels');
    return response.data.data;
  }

  async getReelById(reelId: string) {
    const response = await this.client.get(`/reels/${reelId}`);
    return response.data.data;
  }

  async getReelsByCategory(category: string) {
    const response = await this.client.get('/reels', {
      params: { category },
    });
    return response.data.data;
  }

  async likeReel(reelId: string) {
    const response = await this.client.post(`/reels/${reelId}/like`);
    return response.data;
  }

  async watchReel(reelId: string) {
    const response = await this.client.post(`/reels/${reelId}/watch`);
    return response.data;
  }

  // ==================== USER ====================
  async getUserProfile() {
    const response = await this.client.get('/user/profile');
    return response.data.data;
  }

  async updateUserProfile(data: any) {
    const response = await this.client.put('/user/profile', data);
    return response.data.data;
  }

  async updateUserBackground(backgroundData: any) {
    const response = await this.client.put('/user/background', backgroundData);
    return response.data.data;
  }

  async getMyEnrolledCourses() {
    const response = await this.client.get('/user/courses');
    return response.data.data;
  }

  async getMyCompletedCourses() {
    const response = await this.client.get('/user/completed-courses');
    return response.data.data;
  }

  // ==================== ADMIN ====================
  
  // Videos
  async uploadVideo(formData: FormData) {
    const response = await this.client.post('/admin/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deleteVideo(videoId: string) {
    const response = await this.client.delete(`/admin/videos/${videoId}`);
    return response.data;
  }

  async getAdminVideos(type?: string, status?: string) {
    const response = await this.client.get('/admin/videos', {
      params: { type, status },
    });
    return response.data.data;
  }

  // Users
  async getAllUsers(filter?: string) {
    const response = await this.client.get('/admin/users', {
      params: { filter },
    });
    return response.data.data;
  }

  async getUserActivity(userId: string) {
    const response = await this.client.get(`/admin/users/${userId}/activity`);
    return response.data.data;
  }

  async getUserCourseHistory(userId: string) {
    const response = await this.client.get(`/admin/users/${userId}/course-history`);
    return response.data.data;
  }

  async getUserEngagementMetrics(userId: string) {
    const response = await this.client.get(`/admin/users/${userId}/engagement-metrics`);
    return response.data.data;
  }

  async getUserBackground(userId: string) {
    const response = await this.client.get(`/admin/users/${userId}/background`);
    return response.data.data;
  }

  // Analytics
  async getPlatformAnalytics(period?: string) {
    const response = await this.client.get('/admin/analytics/platform', {
      params: { period },
    });
    return response.data.data;
  }

  async getTopCourses(limit?: number) {
    const response = await this.client.get('/admin/analytics/top-courses', {
      params: { limit },
    });
    return response.data.data;
  }

  async getTopTags(limit?: number) {
    const response = await this.client.get('/admin/analytics/top-tags', {
      params: { limit },
    });
    return response.data.data;
  }

  async getStatisticsReport(period?: string) {
    const response = await this.client.get('/admin/analytics/report', {
      params: { period },
    });
    return response.data.data;
  }

  // Media
  async uploadMedia(formData: FormData) {
    const response = await this.client.post('/admin/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getMedia(type?: string) {
    const response = await this.client.get('/admin/media', {
      params: { type },
    });
    return response.data.data;
  }

  async deleteMedia(mediaId: string) {
    const response = await this.client.delete(`/admin/media/${mediaId}`);
    return response.data;
  }
}

export const apiService = new ApiService();
