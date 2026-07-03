import { useState, useEffect, useCallback } from 'react';
import backendApiService from '../backendApiService';

/**
 * Hook pentru autentificare și gestionare utilizator
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verifică dacă utilizatorul este autentificat la load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          backendApiService.setToken(token);
          const result = await backendApiService.getCurrentUser();
          setUser(result.user);
          setIsAuthenticated(true);
        } catch (err) {
          localStorage.removeItem('authToken');
          setIsAuthenticated(false);
        }
      }
    };
    checkAuth();
  }, []);

  const register = useCallback(async (username, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backendApiService.register(username, email, password);
      backendApiService.setToken(result.token);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password, emotion = 'MOTIVAT', energyLevel = 'MEDIE') => {
    setLoading(true);
    setError(null);
    try {
      const result = await backendApiService.login(email, password, emotion, energyLevel);
      backendApiService.setToken(result.token);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    backendApiService.clearToken();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
  }, []);

  const updateEmotion = useCallback(async (emotion, energyLevel) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backendApiService.updateEmotion(emotion, energyLevel);
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferredTags = useCallback(async (tags) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backendApiService.updatePreferredTags(tags);
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    updateEmotion,
    updatePreferredTags
  };
};

/**
 * Hook pentru recomandări de cururi
 */
export const useRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mlHealthy, setMlHealthy] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await backendApiService.getRecommendations();
      setRecommendations(result.recommendations || []);
      setMlHealthy(result.mlHealthy);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecommendationsByEmotion = useCallback(async (emotion, energyLevel) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backendApiService.getRecommendationsByEmotion(emotion, energyLevel);
      setRecommendations(result.recommendations || []);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching emotion recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const recordInteraction = useCallback(async (courseId, actionType) => {
    try {
      const result = await backendApiService.recordInteraction(courseId, actionType);
      return result;
    } catch (err) {
      console.error('Error recording interaction:', err);
      throw err;
    }
  }, []);

  const rateCourse = useCallback(async (courseId, rating, emotion) => {
    try {
      const result = await backendApiService.rateCourse(courseId, rating, emotion);
      return result;
    } catch (err) {
      console.error('Error rating course:', err);
      throw err;
    }
  }, []);

  return {
    recommendations,
    loading,
    error,
    mlHealthy,
    fetchRecommendations,
    getRecommendationsByEmotion,
    recordInteraction,
    rateCourse
  };
};

/**
 * Hook pentru cururi
 */
export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCourses = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backendApiService.getCourses(filters);
      setCourses(result.courses || []);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await backendApiService.getCategories();
      setCategories(result.categories || []);
      setTags(result.tags || []);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCourseById = useCallback(async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backendApiService.getCourseById(courseId);
      return result.course;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    courses,
    categories,
    tags,
    loading,
    error,
    fetchCourses,
    fetchCategories,
    getCourseById
  };
};

export default {
  useAuth,
  useRecommendations,
  useCourses
};
