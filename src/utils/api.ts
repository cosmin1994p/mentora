/**
 * API Service Layer
 * Handles all communication with MongoDB Atlas backend
 * Automatically includes authentication token in requests
 */
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

export const apiService = {
  /**
   * Generic API request method that includes auth token
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('authToken');
    const isFormData = options.body instanceof FormData;

    const requestHeaders: Record<string, string> = {};

    // Only set Content-Type for non-FormData requests
    // Browser will automatically set correct Content-Type with boundary for FormData
    if (!isFormData) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Merge with existing headers if provided (but don't override FormData handling)
    const existingHeaders = options.headers as Record<string, string> | undefined;
    const allHeaders = isFormData
      ? { ...requestHeaders } // For FormData, just use our headers (no Content-Type)
      : { ...requestHeaders, ...existingHeaders };

    // Use AbortController to enforce a 5-second timeout so the app doesn't
    // hang for minutes when the backend is unreachable (ERR_CONNECTION_REFUSED).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: allHeaders,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `API Error: ${response.status}`;
      
      // If we get a forbidden/unauthorized error, the token might be signature-mismatched 
      // due to server restart. Force logout immediately to fix user session state.
      if (response.status === 401 || response.status === 403) {
        if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('expired')) {
           console.warn('[API] Invalid token detected, forcing automatic session cleanup.');
           localStorage.removeItem('authToken');
           localStorage.removeItem('userProfile');
           // Reloading triggers App.tsx component tree to reset to Login state naturally
           window.location.reload(); 
        }
      }
      
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  },

  /**
   * Authentication endpoints
   */
  auth: {
    register: (username: string, email: string, password: string, emotion?: string, energyLevel?: string) =>
      apiService.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, emotion, energyLevel }),
      }),

    login: (email: string, password: string, emotion?: string, energyLevel?: string) =>
      apiService.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, emotion, energyLevel }),
      }),

    getCurrentUser: () =>
      apiService.request('/auth/me', {
        method: 'GET',
      }),

    updateEmotion: (emotion: string, energyLevel: string) =>
      apiService.request('/auth/emotion', {
        method: 'PUT',
        body: JSON.stringify({ emotion, energyLevel }),
      }),

    getActivity: () =>
      apiService.request('/auth/activity', {
        method: 'GET',
      }),
  },

  /**
   * Courses endpoints
   */
  courses: {
    getAll: () =>
      apiService.request('/courses', {
        method: 'GET',
      }),

    getById: (id: string) =>
      apiService.request(`/courses/${id}`, {
        method: 'GET',
      }),

    create: (courseData: FormData) =>
      apiService.request('/courses', {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: courseData,
      }),

    enroll: (courseId: string) =>
      apiService.request(`/courses/${courseId}/enroll`, {
        method: 'POST',
      }),

    complete: (courseId: string) =>
      apiService.request(`/courses/${courseId}/complete`, {
        method: 'POST',
      }),

    getRecommendations: (emotion?: string, energyLevel?: string) =>
      apiService.request(
        `/courses/recommendations${emotion && energyLevel
          ? `?emotion=${emotion}&energyLevel=${energyLevel}`
          : ''
        }`,
        {
          method: 'GET',
        }
      ),
  },

  /**
   * Reels endpoints
   */
  reels: {
    getAll: () =>
      apiService.request('/reels', {
        method: 'GET',
      }),

    getById: (id: string) =>
      apiService.request(`/reels/${id}`, {
        method: 'GET',
      }),

    create: (reelData: FormData) =>
      apiService.request('/reels', {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: reelData,
      }),

    like: (reelId: string) =>
      apiService.request(`/reels/${reelId}/like`, {
        method: 'POST',
      }),

    unlike: (reelId: string) =>
      apiService.request(`/reels/${reelId}/unlike`, {
        method: 'POST',
      }),

    getRecommendations: (emotion?: string, energyLevel?: string) =>
      apiService.request(
        `/reels/recommendations${emotion && energyLevel
          ? `?emotion=${emotion}&energyLevel=${energyLevel}`
          : ''
        }`,
        {
          method: 'GET',
        }
      ),
  },

  /**
   * Admin endpoints
   */
  admin: {
    createCourse: (courseData: FormData) =>
      apiService.request('/admin/courses', {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: courseData,
      }),

    updateCourse: (courseId: string, courseData: FormData) =>
      apiService.request(`/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {}, // Let browser set Content-Type for FormData
        body: courseData,
      }),

    deleteCourse: (courseId: string) =>
      apiService.request(`/admin/courses/${courseId}`, {
        method: 'DELETE',
      }),

    getCourseEnrolledUsers: (courseId: string) =>
      apiService.request(`/admin/courses/${courseId}/enrolled-users`, {
        method: 'GET',
      }),

    createReel: (reelData: FormData) =>
      apiService.request('/admin/reels', {
        method: 'POST',
        headers: {}, // Let browser set Content-Type for FormData
        body: reelData,
      }),

    deleteReel: (reelId: string) =>
      apiService.request(`/admin/reels/${reelId}`, {
        method: 'DELETE',
      }),

    getDashboardStats: () =>
      apiService.request('/admin/dashboard', {
        method: 'GET',
      }),

    cleanupB2DeleteMarkers: () =>
      apiService.request('/admin/b2/cleanup-delete-markers', {
        method: 'POST',
      }),

    uploadThumbnail: (courseId: string, file: File) => {
      const formData = new FormData();
      formData.append('thumbnail', file);

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetch(`${API_URL}/admin/courses/${courseId}/thumbnail`, {
        method: 'POST',
        headers,
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      });
    },

    uploadReelThumbnail: (reelId: string, file: File) => {
      const formData = new FormData();
      formData.append('thumbnail', file);

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetch(`${API_URL}/admin/reels/${reelId}/thumbnail`, {
        method: 'POST',
        headers,
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      });
    },

    uploadReelVideo: (reelId: string, file: File) => {
      const formData = new FormData();
      formData.append('video', file);

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetch(`${API_URL}/admin/reels/${reelId}/video`, {
        method: 'POST',
        headers,
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      });
    },

    // Video Management
    uploadVideo: (videoData: FormData) =>
      apiService.request('/admin/videos', {
        method: 'POST',
        headers: {},
        body: videoData,
      }),

    deleteVideo: (videoId: string) =>
      apiService.request(`/admin/videos/${videoId}`, {
        method: 'DELETE',
      }),

    getVideos: (filter?: { type?: string; status?: string }) =>
      apiService.request(`/admin/videos${filter ? `?${new URLSearchParams(filter as any).toString()}` : ''}`, {
        method: 'GET',
      }),

    // User Activity & Analytics
    getUserActivity: (userId: string) =>
      apiService.request(`/admin/users/${userId}/activity`, {
        method: 'GET',
      }),

    getUserCourseHistory: (userId: string) =>
      apiService.request(`/admin/users/${userId}/course-history`, {
        method: 'GET',
      }),

    getUserEngagementMetrics: (userId: string) =>
      apiService.request(`/admin/users/${userId}/engagement-metrics`, {
        method: 'GET',
      }),

    getUserBackground: (userId: string) =>
      apiService.request(`/admin/users/${userId}/background`, {
        method: 'GET',
      }),

    updateUserBackground: (userId: string, backgroundData: any) =>
      apiService.request(`/admin/users/${userId}/background`, {
        method: 'PUT',
        body: JSON.stringify(backgroundData),
      }),

    getAllUsers: (filter?: { role?: string; active?: boolean }) =>
      apiService.request(`/admin/users${filter ? `?${new URLSearchParams(filter as any).toString()}` : ''}`, {
        method: 'GET',
      }),

    // Platform Analytics
    getPlatformAnalytics: (period?: 'daily' | 'weekly' | 'monthly') =>
      apiService.request(`/admin/analytics/platform${period ? `?period=${period}` : ''}`, {
        method: 'GET',
      }),

    getUserPreferenceAnalysis: () =>
      apiService.request('/admin/analytics/user-preferences', {
        method: 'GET',
      }),

    getStatisticsReport: (period?: 'daily' | 'weekly' | 'monthly') =>
      apiService.request(`/admin/analytics/report${period ? `?period=${period}` : ''}`, {
        method: 'GET',
      }),

    getTopCourses: (limit?: number) =>
      apiService.request(`/admin/analytics/top-courses${limit ? `?limit=${limit}` : ''}`, {
        method: 'GET',
      }),

    getTopTags: (limit?: number) =>
      apiService.request(`/admin/analytics/top-tags${limit ? `?limit=${limit}` : ''}`, {
        method: 'GET',
      }),

    getCourseDetailedStats: (courseId: string) =>
      apiService.request(`/admin/analytics/courses/${courseId}`, {
        method: 'GET',
      }),

    // Media Storage (MongoDB)
    uploadMedia: (mediaData: FormData) =>
      apiService.request('/admin/media', {
        method: 'POST',
        headers: {},
        body: mediaData,
      }),

    getMedia: (filter?: { type?: string; userId?: string }) =>
      apiService.request(`/admin/media${filter ? `?${new URLSearchParams(filter as any).toString()}` : ''}`, {
        method: 'GET',
      }),

    deleteMedia: (mediaId: string) =>
      apiService.request(`/admin/media/${mediaId}`, {
        method: 'DELETE',
      }),
  },

  /**
   * Media endpoints
   */
  media: {
    getThumbnailUrl: (imageId: string) => `${API_URL}/media/thumbnails/${imageId}`,

    getReelThumbnailUrl: (imageId: string) => `${API_URL}/media/reel-thumbnails/${imageId}`,
  },

  /**
   * User endpoints
   */
  user: {
    getProfile: () =>
      apiService.request('/user/profile', {
        method: 'GET',
      }),

    updateProfile: (profileData: Partial<any>) =>
      apiService.request('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      }),

    getEnrolledCourses: () =>
      apiService.request('/user/enrolled-courses', {
        method: 'GET',
      }),

    getCompletedCourses: () =>
      apiService.request('/user/completed-courses', {
        method: 'GET',
      }),

    getLikedReels: () =>
      apiService.request('/user/liked-reels', {
        method: 'GET',
      }),

    recordReelView: (reelId: string) =>
      apiService.request(`/user/reels/${reelId}/view`, {
        method: 'POST',
      }),

    getRecentlyViewedReels: () =>
      apiService.request('/user/reels/recent', {
        method: 'GET',
      }),
  },

  /**
   * Notifications endpoints
   */
  notifications: {
    getAll: (status?: 'unread' | 'read' | 'dismissed') =>
      apiService.request(`/notifications${status ? `?status=${status}` : ''}`, {
        method: 'GET',
      }),

    getUnreadCount: () =>
      apiService.request('/notifications/unread-count', {
        method: 'GET',
      }),

    create: (data: { type: string; title: string; message: string; metadata?: any }) =>
      apiService.request('/notifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    markAllAsRead: () =>
      apiService.request('/notifications/mark-read', {
        method: 'PUT',
        body: JSON.stringify({}),
      }),

    markAsRead: (notificationIds: string[]) =>
      apiService.request('/notifications/mark-read', {
        method: 'PUT',
        body: JSON.stringify({ notificationIds }),
      }),

    markOneAsRead: (id: string) =>
      apiService.request(`/notifications/${id}/read`, {
        method: 'PUT',
      }),

    dismiss: (id: string) =>
      apiService.request(`/notifications/${id}`, {
        method: 'DELETE',
      }),
  },

  /**
   * Company endpoints
   */
  companies: {
    createRequest: (companyDetails: any) =>
      apiService.request('/companies/request', {
        method: 'POST',
        body: JSON.stringify({ companyDetails }),
      }),
      
    getRequests: () =>
      apiService.request('/companies/requests', {
        method: 'GET',
      }),
      
    updateRequest: (id: string, companyDetails: any) =>
      apiService.request(`/companies/requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ companyDetails }),
      }),
      
    approveRequest: (id: string) =>
      apiService.request(`/companies/requests/${id}/approve`, {
        method: 'PUT',
      }),
      
    rejectRequest: (id: string, adminFeedback?: string) =>
      apiService.request(`/companies/requests/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ adminFeedback }),
      }),
  },
};

export default apiService;
