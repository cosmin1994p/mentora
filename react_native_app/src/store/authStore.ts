import { create } from 'zustand';
import { apiService } from '../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar: string;
  bio: string;
  role: 'admin' | 'user';
  enrolledCourses: string[];
  completedCourses: string[];
  background?: {
    domain?: string;
    education?: {
      level: string;
      field: string;
      institution?: string;
    };
    profession?: {
      job_title: string;
      company: string;
      industry: string;
      experience_years: number;
    };
    location?: {
      country: string;
      city: string;
    };
  };
  createdAt: string;
  lastActiveAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        apiService.setAuthToken(token);
        const user = await apiService.getUserProfile();
        set({ user, token, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Initialize error:', error);
    }
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.login(username, password);
      await apiService.setAuthToken(response.token);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (username: string, email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.register(username, email, password, name);
      await apiService.setAuthToken(response.token);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    await apiService.clearAuthToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  updateProfile: async (data: Partial<User>) => {
    try {
      const updated = await apiService.updateUserProfile(data);
      set((state) => ({
        user: state.user ? { ...state.user, ...updated } : null,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Update failed',
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
