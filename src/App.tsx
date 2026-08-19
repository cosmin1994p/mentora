import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CourseGrid } from './components/CourseGrid';
import { ReelsSection } from './components/ReelsSection';
import { VideoPlayer } from './components/VideoPlayer';
import { CourseDetail } from './components/CourseDetail';
import { ProfileModal } from './components/ProfileModal';
import { AdminPanel } from './components/AdminPanel';
import { ReelCreator } from './components/ReelCreator';
import { AuthModal } from './components/AuthModal';
import { MoodModal } from './components/MoodModal';
import { ReelViewer } from './components/ReelViewer';
import { SearchModal } from './components/SearchModal';
import { NotificationsPanel } from './components/NotificationsPanel';
import { NotificationSystem, Notification } from './components/NotificationSystem';
import { GDPRConsentModal } from './components/GDPRConsentModal';
import { UpgradeModal } from './components/UpgradeModal';
import { SpeakersTab } from './components/SpeakersTab';
import { recordCourseInteraction } from './utils/emotionRecommendationService';
import { apiService } from './utils/api';
import { Toaster } from 'sonner';
import { API_BASE_URL, rewriteUrl } from './config';

// Package tier hierarchy for lock computation (higher index = more access)
const TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 3,
  enterprise: 4,
  elite: 5
};

/**
 * Compute isLocked for each course based on the user's effective package tier.
 * A course is locked if:
 *   - It is NOT isFree
 *   - It has packageTiers defined (non-empty)
 *   - The user's tier is below ALL of the required tiers
 */
const computeCourseLocks = (coursesArr: Course[], userTier: string | undefined): Course[] => {
  const userLevel = TIER_ORDER[(userTier || 'free').toLowerCase()] ?? 0;
  return coursesArr.map(course => {
    if (course.isFree) return { ...course, isLocked: false };
    if (!course.packageTiers || course.packageTiers.length === 0) return { ...course, isLocked: false };
    // User has access if their tier level is >= the minimum required tier
    const minRequired = Math.min(...course.packageTiers.map(t => TIER_ORDER[t.toLowerCase()] ?? 0));
    return { ...course, isLocked: userLevel < minRequired };
  });
};

// Theme colors for styling
const theme = {
  primary: '#FF5530',
  secondary: '#FF5530',
  background: '#0f0f0f',
  surface: '#002147',
};

const isValidMongoId = (value: unknown) => /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());

export type View = 'home' | 'courses' | 'reels' | 'my-learning' | 'speakers' | 'admin';

export interface Course {
  id: string;
  title: string;
  instructor: string;
  thumbnail: string;
  thumbnailImageId?: string; // MongoDB GridFS image ID
  duration: string;
  lessons: number;
  category: string;
  description: string;
  rating: number;
  students: number;
  videoUrl?: string;
  hlsUrl?: string;  // HLS adaptive streaming URL
  progress?: number;
  tags: string[];
  createdAt?: string;
  enrolled?: boolean;
  quizCompleted?: boolean;
  forceDirectPlayback?: boolean;
  isLocked?: boolean;
  packageTiers?: string[];
  isFree?: boolean;
  // Emotion affinity scores for mood-based recommendations
  emotionAffinity?: {
    FERICIT?: number;
    MOTIVAT?: number;
    RELAXAT?: number;
    CURIOS?: number;
    PRODUCTIV?: number;
    CREATIV?: number;
  };
}

export interface Reel {
  id: string;
  title: string;
  creator: string;
  thumbnail: string;
  thumbnailImageId?: string; // MongoDB GridFS image ID
  views: string;
  likes: string;
  videoUrl?: string;
  courseId?: string;
  tags: string[];
  category?: string;  // Category for matching with user interests
  createdAt?: string; // Creation date for recency bonus
  startTime?: number;  // Start time in seconds
  endTime?: number;    // End time in seconds
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  bio: string;
  role: 'user' | 'admin';
  packageTier?: string;
  phone?: string;
  companyName?: string;
  background?: {
    domain?: string;        // Business, Technology, Art, etc.
    education?: {
      level: string;        // High School, Bachelor, Master, PhD
      field: string;        // Field of study
      institution?: string; // University/School name
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
  initialQuestionnaire?: {
    interests: string[];
    goals: string[];
    experience: string;
    activityDomain?: string;
  };
  dailyMood?: {
    date: string;
    mood: string;
    energy: string;
  };
}

export interface Quiz {
  id: string;
  courseId: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

const getGdprConsentKeyForEmail = (email?: string) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return normalizedEmail ? `gdprConsent:${normalizedEmail}` : 'gdprConsent:anonymous';
};

const getLikedCoursesKeyForEmail = (email?: string) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return normalizedEmail ? `likedCourses:${normalizedEmail}` : 'likedCourses:anonymous';
};

const CATEGORY_LABELS: Record<string, string> = {
  business: 'Business & Leadership',
  creative: 'Creative Arts',
  tech: 'Science & Technology',
  featured: 'Featured Courses',
  trending: 'Trending Now',
  wellness: 'Wellness & Lifestyle',
  music: 'Music & Audio',
  writing: 'Writing & Literature',
  photography: 'Photography & Film',
  design: 'Design & Art',
  development: 'Software Development',
  marketing: 'Marketing & Sales',
  finance: 'Finance & Investing',
};

const readCachedProfile = (): UserProfile | null => {
  try {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [mountedViews, setMountedViews] = useState<Set<View>>(() => new Set(['home']));
  const [selectedVideo, setSelectedVideo] = useState<Course | null>(null);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);  // Track minimized state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showReels, setShowReels] = useState(false);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReelCreator, setShowReelCreator] = useState(false);
  const [selectedCourseForReel, setSelectedCourseForReel] = useState<Course | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('authToken')));
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => readCachedProfile());
  const [courses, setCourses] = useState<Course[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [likedCourses, setLikedCourses] = useState<string[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [recommendedReels, setRecommendedReels] = useState<Reel[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<Notification[]>([]);
  const [panelNotifications, setPanelNotifications] = useState<Notification[]>([]);
  const [recentReels, setRecentReels] = useState<Reel[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(() => !localStorage.getItem('authToken'));
  const [showGDPRModal, setShowGDPRModal] = useState(false);
  const userConsentKey = useMemo(() => getGdprConsentKeyForEmail(userProfile?.email), [userProfile?.email]);
  const likedCoursesKey = useMemo(() => getLikedCoursesKeyForEmail(userProfile?.email), [userProfile?.email]);

  // Check authentication and load app data on mount
  useEffect(() => {
    const loadProfileFromAPI = async (authToken: string, localProfile: UserProfile | null) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const userData = await response.json();
          console.log('✓ Loaded profile from MongoDB:', userData);

          const apiProfile: UserProfile = {
            name: userData.username || userData.fullName || 'User',
            email: userData.email,
            avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
            bio: userData.bio || 'Mentora Student',
            role: userData.role || 'user',
            packageTier: userData.company?.package?.name?.toLowerCase()
              || userData.package?.name?.toLowerCase()
              || 'free',
            companyName: userData.company?.name || userData.companyName || undefined,
            initialQuestionnaire: userData.initialQuestionnaire || {},
            background: userData.background || {},
            dailyMood: localProfile?.dailyMood?.date === new Date().toDateString()
              ? localProfile.dailyMood
              : undefined
          };

          setUserProfile(apiProfile);
          setProfileLoaded(true);
          localStorage.setItem('userProfile', JSON.stringify(apiProfile));

          const today = new Date().toDateString();
          if (ENABLE_MOOD_MODAL && (!apiProfile.dailyMood || apiProfile.dailyMood.date !== today)) {
            setShowMoodModal(true);
          }
        } else {
          console.warn('Failed to load profile from API, using local');
          setProfileLoaded(true);
          if (localProfile) {
            setUserProfile(localProfile);
            const today = new Date().toDateString();
            if (ENABLE_MOOD_MODAL && (!localProfile.dailyMood || localProfile.dailyMood.date !== today)) {
              setShowMoodModal(true);
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile from API:', error);
        setProfileLoaded(true);
        if (localProfile) {
          setUserProfile(localProfile);
        }
      }
    };

    const savedProfile = localStorage.getItem('userProfile');
    const authToken = localStorage.getItem('authToken');

    if (authToken) {
      const localProfile = savedProfile ? JSON.parse(savedProfile) : null;
      setIsAuthenticated(true);
      loadProfileFromAPI(authToken, localProfile);
    } else {
      setProfileLoaded(true);
      setShowAuth(true);
    }

    // Don't load cached recommendations — they cause a visible flicker
    // when the live algorithm produces slightly different results.
    // The loading skeleton shows for ~1-2s while recommendations are generated fresh.

    const loadCoursesFromAPI = async () => {
      try {
        const response = await apiService.courses.getAll();
        const coursesData = Array.isArray(response)
          ? response
          : (response as any)?.data || (response as any)?.courses || [];

        const validCourses = (Array.isArray(coursesData) ? coursesData : []).map((course: any) => {
          const objectId = course?._id?.toString?.() || course?._id;
          const fallbackId = course?.id?.toString?.() || course?.id;
          const resolvedId = isValidMongoId(objectId)
            ? String(objectId)
            : String(fallbackId || objectId || '');

          let thumbnailUrl = course.thumbnail;
          if (course.thumbnailImageId) {
            const thumbId = typeof course.thumbnailImageId === 'string'
              ? course.thumbnailImageId
              : course.thumbnailImageId?.toString?.() || course.thumbnailImageId;
            if (thumbId && /^[a-f0-9]{24}$/i.test(thumbId)) {
              thumbnailUrl = `${API_BASE_URL}/media/${thumbId}`;
            }
          }
          return {
            ...course,
            id: resolvedId,
            thumbnail: rewriteUrl(thumbnailUrl),
            videoUrl: rewriteUrl(course.videoUrl),
            hlsUrl: course.hlsUrl ? rewriteUrl(course.hlsUrl) : undefined,
          };
        }) as Course[];

        // SORTING FIX: Force descending order by createdAt
        const sortedCourses = validCourses.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        // Compute lock status based on user's package tier
        const userTier = userProfile?.packageTier || localStorage.getItem('userProfile') && (() => { try { return JSON.parse(localStorage.getItem('userProfile')!).packageTier; } catch { return 'free'; } })() || 'free';
        const lockedCourses = computeCourseLocks(sortedCourses, userTier);
        setCourses(lockedCourses);
        setCoursesLoading(false);
        // CRITICAL: Show courses immediately instead of waiting for recommendations
        // This prevents the loading splash screen from staying indefinitely
        if (recommendedCourses.length === 0) {
          setRecommendedCourses(sortedCourses.slice(0, 10));
          setRecommendationsLoading(false);
        }
        console.log('✓ Loaded', sortedCourses.length, 'courses from API');
      } catch (error) {
        console.error('Failed to load courses from API:', error);
        setCourses([]);
        setCoursesLoading(false);
      }
    };

    const loadReelsFromAPI = async () => {
      try {
        const response = await apiService.reels.getAll();
        const reelsData = Array.isArray(response)
          ? response
          : (response as any)?.data || (response as any)?.reels || [];

        const mappedReels = (Array.isArray(reelsData) ? reelsData : []).map((reel: any) => {
          let thumbnailUrl = reel.thumbnail || '';
          if (reel.thumbnailImageId) {
            const thumbId = typeof reel.thumbnailImageId === 'string'
              ? reel.thumbnailImageId
              : reel.thumbnailImageId?.toString?.() || reel.thumbnailImageId;
            if (thumbId && /^[a-f0-9]{24}$/i.test(thumbId)) {
              thumbnailUrl = `${API_BASE_URL}/media/${thumbId}`;
            }
          }
          return {
            ...reel,
            id: reel.id || reel._id?.toString() || `reel-${Date.now()}-${Math.random()}`,
            thumbnail: rewriteUrl(thumbnailUrl),
            videoUrl: rewriteUrl(reel.videoUrl) || '',
            title: reel.title || 'Untitled',
            creator: reel.creator || 'Unknown',
            views: reel.views || '0',
            likes: reel.likes || '0',
            tags: reel.tags || []
          };
        }) as Reel[];

        setReels(mappedReels);
      } catch (error) {
        console.error('Failed to load reels from API:', error);
        setReels([]);
      }
    };

    const loadNotificationsFromAPI = async () => {
      try {
        const response = await apiService.notifications.getAll();
        const notificationsData = (response as any)?.notifications || [];

        const mappedNotifications = notificationsData.map((n: any) => ({
          id: n.id,
          type: n.type as Notification['type'],
          title: n.title,
          message: n.message,
          timestamp: n.timestamp,
          read: n.status === 'read'
        }));

        setPanelNotifications(mappedNotifications);
      } catch (error) {
        console.error('Failed to load notifications from API:', error);
      }
    };

    const loadRecentReels = async () => {
      try {
        const response = await apiService.user.getRecentlyViewedReels();
        const mappedReels = (Array.isArray(response) ? response : []).map((reel: any) => {
          let thumbnailUrl = reel.thumbnail || '';
          if (reel.thumbnailImageId) {
            const thumbId = typeof reel.thumbnailImageId === 'string'
              ? reel.thumbnailImageId
              : reel.thumbnailImageId?.toString?.() || reel.thumbnailImageId;
            if (thumbId && /^[a-f0-9]{24}$/i.test(thumbId)) {
              thumbnailUrl = `${API_BASE_URL}/media/${thumbId}`;
            }
          }
          return {
            ...reel,
            id: reel.id || reel._id?.toString(),
            thumbnail: rewriteUrl(thumbnailUrl),
            videoUrl: rewriteUrl(reel.videoUrl) || '',
            title: reel.title || 'Untitled',
            creator: reel.creator || 'Unknown',
            views: reel.views || '0',
            likes: reel.likes || '0',
            tags: reel.tags || []
          };
        }) as Reel[];
        setRecentReels(mappedReels);
      } catch (error) {
        console.error('Failed to load recent reels:', error);
      }
    };

    loadCoursesFromAPI();
    loadReelsFromAPI();

    if (authToken) {
      loadNotificationsFromAPI();
      loadRecentReels();

      apiService.user.getEnrolledCourses()
        .then(data => {
          let coursesArray: any[] = [];
          if (Array.isArray(data)) {
            coursesArray = data;
          } else if ((data as any)?.enrolledCourses && Array.isArray((data as any).enrolledCourses)) {
            coursesArray = (data as any).enrolledCourses;
          }

          if (coursesArray.length > 0) {
            const enrolledIds = coursesArray.map((c: any) => (typeof c === 'object' ? (c.id || c._id) : c));
            setCourses((currentCourses: Course[]) =>
              currentCourses.map(course => ({
                ...course,
                enrolled: enrolledIds.includes(course.id)
              }))
            );
          }
        })
        .catch(err => console.error('Failed to fetch enrolled courses:', err));
    }
  }, []);

  // SSE: optional live updates when an admin changes course package tiers (see courseControllerV2).
  // Not used for video/HLS — those use polling elsewhere. Admin-only to avoid idle streams for students.
  useEffect(() => {
    if (!isAuthenticated || userProfile?.role !== 'admin') {
      return;
    }

    const sseUrl = `${API_BASE_URL.replace(/\/$/, '')}/events/stream`;
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let failures = 0;

    const connect = () => {
      if (closed) return;

      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        failures = 0;
      };

      eventSource.onerror = () => {
        if (closed) return;
        failures += 1;
        eventSource?.close();

        const delay = Math.min(30000, 2000 * failures);
        if (failures <= 3) {
          console.warn(`SSE disconnected, retry in ${delay}ms`);
        }
        reconnectTimer = setTimeout(connect, delay);
      };

      eventSource.addEventListener('course_updated', () => {
        apiService.courses.getAll()
          .then((response) => {
            const coursesData = Array.isArray(response)
              ? response
              : (response as any)?.data || (response as any)?.courses || [];
            if (!Array.isArray(coursesData) || coursesData.length === 0) return;

            setCourses((currentCourses) => {
              const updates = new Map(
                coursesData.map((c: any) => {
                  const id = c?._id?.toString?.() || c?.id;
                  return [id, c];
                })
              );
              return currentCourses.map((course) => {
                const fresh = updates.get(course.id);
                if (!fresh) return course;
                return {
                  ...course,
                  packageTiers: fresh.packageTiers ?? course.packageTiers,
                  hlsReady: fresh.hlsReady ?? course.hlsReady,
                  hlsUrl: fresh.hlsUrl ? rewriteUrl(fresh.hlsUrl) : course.hlsUrl,
                };
              });
            });
          })
          .catch(() => {});
      });
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [isAuthenticated, userProfile?.role]);

  useEffect(() => {
    if (!isAuthenticated || !userProfile?.email) {
      setLikedCourses([]);
      setCourses((currentCourses: Course[]) =>
        currentCourses.map((course) => ({ ...course, enrolled: false }))
      );
      return;
    }

    const persistedLikes = localStorage.getItem(likedCoursesKey);
    if (persistedLikes) {
      try {
        const parsedLikes = JSON.parse(persistedLikes);
        setLikedCourses(Array.isArray(parsedLikes) ? parsedLikes : []);
      } catch {
        setLikedCourses([]);
      }
    } else {
      setLikedCourses([]);
    }

    apiService.user.getEnrolledCourses()
      .then(data => {
        let coursesArray: any[] = [];
        if (Array.isArray(data)) {
          coursesArray = data;
        } else if ((data as any)?.enrolledCourses && Array.isArray((data as any).enrolledCourses)) {
          coursesArray = (data as any).enrolledCourses;
        }

        const enrolledIds = new Set(
          coursesArray
            .map((c: any) => (typeof c === 'object' ? (c.id || c._id) : c))
            .map((id: any) => String(id || ''))
            .filter(Boolean)
        );

        setCourses((currentCourses: Course[]) =>
          currentCourses.map(course => ({
            ...course,
            enrolled: enrolledIds.has(course.id)
          }))
        );
      })
      .catch(err => {
        console.error('Failed to fetch enrolled courses for active user:', err);
        setCourses((currentCourses: Course[]) =>
          currentCourses.map(course => ({ ...course, enrolled: false }))
        );
      });
  }, [isAuthenticated, userProfile?.email, likedCoursesKey]);

  useEffect(() => {
    if (!isAuthenticated || !userProfile?.email) {
      setShowGDPRModal(false);
      return;
    }

    const perUserConsent = localStorage.getItem(userConsentKey);
    if (perUserConsent) {
      setShowGDPRModal(false);
      return;
    }

    setShowGDPRModal(true);
  }, [isAuthenticated, userProfile?.email, userConsentKey]);

  // Recompute course locks whenever the user's package tier changes
  useEffect(() => {
    if (courses.length === 0) return;
    const tier = userProfile?.packageTier || 'free';
    setCourses(prev => computeCourseLocks(prev, tier));
  }, [userProfile?.packageTier]);

  // Stable key that changes when courses set changes (IDs or count)
  const coursesKey = useMemo(() => courses.map(c => c.id).join(','), [courses]);

  // Stable key for interests (array refs change on every render)
  const interestsKey = useMemo(
    () => JSON.stringify(userProfile?.initialQuestionnaire?.interests || []),
    [userProfile?.initialQuestionnaire?.interests]
  );

  // Generate recommendations when profile, courses, or mood/energy change
  useEffect(() => {
    if (userProfile && courses.length > 0 && recommendedCourses.length === 0) {
      generateRecommendations();
    } else if (courses.length > 0 && !userProfile && profileLoaded && recommendedCourses.length === 0) {
      // Only show unscored guest fallback after we're sure no profile is coming
      setRecommendedCourses(Array.isArray(courses) ? courses.slice(0, 10) : []);
      setRecommendationsLoading(false);
    } else if (courses.length === 0 && !coursesLoading && profileLoaded) {
      // Backend is unreachable — courses failed to load.
      // Dismiss the loading overlay so the user sees the (empty) UI instead of
      // an infinite spinner.
      setRecommendationsLoading(false);
    }
  }, [coursesKey, userProfile?.dailyMood?.mood, userProfile?.dailyMood?.energy, interestsKey, profileLoaded, recommendedCourses.length, coursesLoading]);

  // Sync selectedCourse with courses array
  useEffect(() => {
    if (selectedCourse && courses.length > 0) {
      const updatedCourse = courses.find(c => c.id === selectedCourse.id);
      if (updatedCourse && JSON.stringify(updatedCourse) !== JSON.stringify(selectedCourse)) {
        setSelectedCourse(updatedCourse);
      }
    }
  }, [courses]);

  // Regenerate reel recommendations when reels or mood/interests change
  const reelsRecInProgress = useRef(false);
  useEffect(() => {
    if (!userProfile || !Array.isArray(reels) || reels.length === 0) return;
    if (reelsRecInProgress.current) return;

    reelsRecInProgress.current = true;
    generateReelRecommendations(userProfile);
    reelsRecInProgress.current = false;
  }, [reels.length, userProfile?.dailyMood?.mood, userProfile?.dailyMood?.energy, interestsKey]);

  // Guard against duplicate recommendation generation (useEffect can fire twice)
  const recommendationsInProgress = useRef(false);

  const generateRecommendations = async (profileOverride?: UserProfile) => {
    // Prevent concurrent/duplicate calls — only one generation at a time
    if (recommendationsInProgress.current) {
      return;
    }
    recommendationsInProgress.current = true;

    if (recommendedCourses.length === 0) {
      setRecommendationsLoading(true);
    }
    const profile = profileOverride || userProfile;
    if (!profile) {
      setRecommendationsLoading(false);
      recommendationsInProgress.current = false;
      return;
    }

    try {
      generateLocalRecommendations(profile);
    } finally {
      setRecommendationsLoading(false);
      recommendationsInProgress.current = false;
    }
  };


  // Local fallback recommendation algorithm
  const generateLocalRecommendations = (profileOverride?: UserProfile) => {
    const profile = profileOverride || userProfile;
    if (!profile) return;

    // Get mood and energy info
    const mood = profile.dailyMood?.mood || 'curious';
    const energy = profile.dailyMood?.energy || 'medium';

    // Get user preferences
    const userInterests: string[] = profile.initialQuestionnaire?.interests || [];
    const userDomain: string = profile.initialQuestionnaire?.activityDomain || profile.background?.domain || '';

    // =========================================================================
    // MAPPING TABLES: User Interests / Domains → Course Tags & Categories
    // =========================================================================
    // User Interests (from AuthModal INTERESTS):
    //   Technology, Design, Marketing, Business, Programming,
    //   Data Science, Music, Art, Photography, Writing,
    //   Gaming, Sports, Fitness, Cooking, Travel
    //
    // User Domains (from AuthModal ACTIVITY_DOMAINS):
    //   Technology, Education, Finance, Healthcare, Retail,
    //   Manufacturing, Entertainment, Consulting, Startup, Other
    //
    // Course Categories (from AdminPanel PREDEFINED_CATEGORIES):
    //   business, creative, tech, wellness, music, writing,
    //   photography, fitness, design, marketing, finance, cooking, languages
    //
    // Course Tags (from AdminPanel PREDEFINED_TAGS):
    //   leadership, business, creative, art, tech, programming,
    //   photography, relaxing, motivational, inspiring, productivity,
    //   challenging, beginner, intermediate, advanced, fitness,
    //   wellness, music, writing, design, marketing, finance,
    //   communication, negotiation, entrepreneurship, management,
    //   health, mindfulness, cooking, science, languages
    // =========================================================================

    // Map each user interest to ONLY the directly related course tags & categories
    const interestToTagsMap: Record<string, string[]> = {
      'technology': ['tech'],
      'design': ['design'],
      'marketing': ['marketing'],
      'business': ['business'],
      'programming': ['programming'],
      'data science': ['science'],
      'music': ['music'],
      'art': ['art'],
      'photography': ['photography'],
      'writing': ['writing'],
      'gaming': ['tech'],
      'sports': ['fitness'],
      'fitness': ['fitness'],
      'cooking': ['cooking'],
      'travel': ['languages'],
    };

    // Map each user domain to ONLY the directly related course category
    const domainToTagsMap: Record<string, string[]> = {
      'technology': ['tech'],
      'education': ['languages'],
      'finance': ['finance'],
      'healthcare': ['wellness'],
      'retail': ['marketing'],
      'manufacturing': ['tech'],
      'entertainment': ['creative', 'music'],
      'consulting': ['business'],
      'startup': ['business'],
      'other': [],
    };

    // Helper: resolve user interest to matched tags (lowercase)
    const getMatchedTagsForInterest = (interest: string): string[] => {
      return interestToTagsMap[interest.toLowerCase()] || [interest.toLowerCase()];
    };

    // Helper: resolve user domain to matched tags (lowercase)
    const getMatchedTagsForDomain = (domain: string): string[] => {
      return domainToTagsMap[domain.toLowerCase()] || [domain.toLowerCase()];
    };

    // Build expanded sets of tags the user cares about
    const expandedInterestTags = new Set<string>();
    userInterests.forEach((interest: string) => {
      getMatchedTagsForInterest(interest).forEach(t => expandedInterestTags.add(t));
    });

    const expandedDomainTags = new Set<string>();
    if (userDomain) {
      getMatchedTagsForDomain(userDomain).forEach(t => expandedDomainTags.add(t));
    }

    // Score courses based on multiple factors
    const scoredCourses = courses
      .filter(course => {
        const courseCategory = course.category?.toLowerCase() || '';
        const courseTags = (course.tags || []).map((t: string) => t.toLowerCase());

        // If no preferences at all, allow everything
        if (!userDomain && userInterests.length === 0) return true;

        // If domain is 'Other', allow everything
        if (userDomain?.toLowerCase() === 'other') return true;

        // Check domain match using expanded mapping
        let matchesDomain = false;
        if (expandedDomainTags.size > 0) {
          if (expandedDomainTags.has(courseCategory)) matchesDomain = true;
          if (!matchesDomain) {
            matchesDomain = courseTags.some((t: string) => expandedDomainTags.has(t));
          }
        }

        // Check interest match using expanded mapping
        let matchesInterest = false;
        if (expandedInterestTags.size > 0) {
          if (expandedInterestTags.has(courseCategory)) matchesInterest = true;
          if (!matchesInterest) {
            matchesInterest = courseTags.some((t: string) => expandedInterestTags.has(t));
          }
        }

        return matchesDomain || matchesInterest;
      })
      .map(course => {
        let score = 0;
        const courseCategory = course.category?.toLowerCase() || '';
        const courseTags = (course.tags || []).map((t: string) => t.toLowerCase());

        // 1. DOMAIN MATCHING (25% weight)
        if (expandedDomainTags.size > 0) {
          if (expandedDomainTags.has(courseCategory)) score += 25;
          const domainTagMatches = courseTags.filter((t: string) => expandedDomainTags.has(t)).length;
          score += Math.min(domainTagMatches * 5, 10);
        }

        // 2. INTEREST MATCHING (25% weight)
        if (expandedInterestTags.size > 0) {
          if (expandedInterestTags.has(courseCategory)) score += 15;
          const interestTagMatches = courseTags.filter((t: string) => expandedInterestTags.has(t)).length;
          score += Math.min(interestTagMatches * 5, 15);
        }

        // 3. Match with current mood (15% weight)
        const moodTags: Record<string, string[]> = {
          'happy': ['inspiring', 'creative', 'motivational'],
          'motivated': ['leadership', 'business', 'productivity'],
          'relaxed': ['relaxing', 'photography', 'music', 'mindfulness'],
          'curious': ['tech', 'science', 'programming'],
          'productive': ['business', 'productivity', 'management'],
          'creative': ['art', 'design', 'creative', 'writing']
        };
        const moodRelevantTags = moodTags[mood] || [];
        const moodMatches = courseTags.filter((t: string) => moodRelevantTags.includes(t)).length;
        score += (moodMatches / Math.max(moodRelevantTags.length, 1)) * 15;

        // 4. Match with energy level (10% weight)
        const energyTags: Record<string, string[]> = {
          'high': ['challenging', 'advanced'],
          'medium': ['intermediate', 'beginner'],
          'low': ['relaxing', 'beginner']
        };
        const energyRelevantTags = energyTags[energy] || [];
        const energyMatches = courseTags.filter((t: string) => energyRelevantTags.includes(t)).length;
        score += (energyMatches / Math.max(energyRelevantTags.length, 1)) * 10;

        // 5. Rating and popularity (10% weight) — bumped from 5% to compensate for removed enrolled factors
        score += (course.rating / 5) * 10;

        return { course, score, category: course.category };
      })
      .sort((a, b) => {
        // Primary: Score (higher is better)
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;

        // Secondary: Recency (newest first)
        const dateA = new Date(a.course.createdAt || 0).getTime();
        const dateB = new Date(b.course.createdAt || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;

        // Tertiary: Title (deterministic fallback)
        return a.course.title.localeCompare(b.course.title);
      });

    const finalRecs = scoredCourses.length > 0
      ? scoredCourses.map(item => item.course)
      : (Array.isArray(courses) ? courses.slice(0, 10) : []);

    setRecommendedCourses(finalRecs);
    localStorage.setItem('cachedRecommendations', JSON.stringify(finalRecs));
  };

  // Generate reel recommendations using emotionAffinity from parent courses
  const generateReelRecommendations = (profileOverride?: UserProfile) => {
    const profile = profileOverride || userProfile;
    if (!profile) return;

    const mood = profile.dailyMood?.mood || 'curious';
    const energy = profile.dailyMood?.energy || 'medium';

    // Map mood names to emotionAffinity keys
    const moodToEmotionKey: Record<string, keyof NonNullable<Course['emotionAffinity']>> = {
      'happy': 'FERICIT',
      'motivated': 'MOTIVAT',
      'relaxed': 'RELAXAT',
      'curious': 'CURIOS',
      'productive': 'PRODUCTIV',
      'creative': 'CREATIV'
    };

    // Energy level modifiers
    const energyModifiers: Record<string, { preferredLevels: string[], scoreBonus: number }> = {
      'high': { preferredLevels: ['Advanced', 'Intermediate'], scoreBonus: 10 },
      'medium': { preferredLevels: ['Intermediate', 'Beginner'], scoreBonus: 5 },
      'low': { preferredLevels: ['Beginner'], scoreBonus: 10 }
    };

    const emotionKey = moodToEmotionKey[mood] || 'CURIOS';
    const energyMod = energyModifiers[energy] || energyModifiers['medium'];

    // Map user interests to possible course category names (for better matching)
    const interestToCategoryMap: Record<string, string[]> = {
      'Technology': ['Technology', 'Tech', 'Tehnologie'],
      'Design': ['Design', 'UI/UX', 'Arte Creative'],
      'Marketing': ['Marketing', 'Digital Marketing', 'Business'],
      'Business': ['Business', 'Afaceri', 'Management'],
      'Programming': ['Programming', 'Tehnologie', 'Tech', 'Python', 'JavaScript'],
      'Data Science': ['Data Science', 'Tehnologie', 'Analytics'],
      'Music': ['Music', 'Muzică', 'Arte Creative'],
      'Art': ['Art', 'Artă', 'Arte Creative', 'Design'],
      'Photography': ['Photography', 'Fotografie', 'Arte Creative', 'Photo'],
      'Writing': ['Writing', 'Scriere', 'Creative Writing', 'Arte Creative'],
      'Gaming': ['Gaming', 'Game', 'Tehnologie'],
      'Sports': ['Sports', 'Sport', 'Fitness', 'Fitness și Nutriție'],
      'Fitness': ['Fitness', 'Sport', 'Fitness și Nutriție', 'Health'],
      'Cooking': ['Cooking', 'Culinar', 'Lifestyle'],
      'Travel': ['Travel', 'Călătorii', 'Lifestyle']
    };

    // Expand user interests to include related category names
    const rawInterests = profile.initialQuestionnaire?.interests || [];
    const expandedInterests = new Set<string>();
    rawInterests.forEach(interest => {
      expandedInterests.add(interest.toLowerCase());
      const related = interestToCategoryMap[interest] || [];
      related.forEach(r => expandedInterests.add(r.toLowerCase()));
    });
    const userInterests = Array.from(expandedInterests);

    const userDomain = profile.initialQuestionnaire?.activityDomain || profile.background?.domain || '';
    const enrolledCourses = Array.isArray(courses) ? courses.filter(c => c.enrolled) : [];
    const enrolledCourseIds = enrolledCourses.map(c => c.id);

    // Create a map of courseId -> course for quick lookup
    const courseMap = new Map(courses.map(c => [c.id, c]));

    // Score reels based on their parent course's emotionAffinity + user profile
    const scoredReels = reels.map(reel => {
      // Find the parent course for this reel
      const parentCourse = reel.courseId ? courseMap.get(reel.courseId) : null;

      let score = 0;

      // 1. Emotion affinity score from parent course (reduced to 20% weight)
      if (parentCourse?.emotionAffinity) {
        const emotionScore = parentCourse.emotionAffinity[emotionKey] || 0.5;
        score += emotionScore * 20; // 0-20 points based on emotion match (reduced from 40)
      } else {
        // No parent course - give base score of 15
        score += 15;
      }

      // 2. ACTIVITY DOMAIN matching (15% weight)
      // Use reel's own category if no parent course
      const reelCategory = parentCourse?.category || reel.category || '';
      if (userDomain && reelCategory) {
        const domainLower = userDomain.toLowerCase();
        const categoryLower = reelCategory.toLowerCase();
        if (categoryLower.includes(domainLower) || domainLower.includes(categoryLower)) {
          score += 15;
        }
      }

      // 3. INTERESTS matching (25% weight) - check tags AND category
      // Use reel's own tags if no parent course
      const courseTags = parentCourse?.tags || reel.tags || [];
      const courseCategory = parentCourse?.category || reel.category || '';

      // Count interest matches in tags
      const tagMatches = courseTags.filter((t: string) =>
        userInterests.some((interest: string) =>
          t.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(t.toLowerCase())
        )
      ).length;

      // Check if any interest matches the category
      const categoryMatch = userInterests.some((interest: string) =>
        courseCategory.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(courseCategory.toLowerCase())
      );

      score += Math.min(tagMatches * 8, 30); // Up to 30 points from tag matches (increased from 20)
      if (categoryMatch) score += 10; // Extra 10 points for category match (increased from 5)

      // 4. Enrolled course bonus (10% weight) - prefer reels from enrolled courses
      if (reel.courseId && enrolledCourseIds.includes(reel.courseId)) {
        score += 10;
      }

      // 5. Rating bonus (5% weight)
      const courseRating = parentCourse?.rating || 4.0;
      score += (courseRating / 5) * 5;

      // 6. Energy level match (increased to 25% weight - very important!)
      score += energyMod.scoreBonus * 2.5; // 0-25 points based on energy match

      // 7. Recency bonus for newer reels - SIGNIFICANTLY BOOSTED
      // New reels should always have a chance to appear
      let isNewReel = false;
      if (reel.createdAt) {
        const reelAge = Date.now() - new Date(reel.createdAt).getTime();
        const dayInMs = 24 * 60 * 60 * 1000;
        if (reelAge < dayInMs) {
          score += 25; // Created today - big boost!
          isNewReel = true;
        } else if (reelAge < 7 * dayInMs) {
          score += 15; // Created this week
        } else if (reelAge < 30 * dayInMs) {
          score += 5; // Created this month
        }
      }

      // 8. Minimum score guarantee for new reels (so they always appear)
      if (isNewReel && score < 45) {
        score = 45; // Guarantee new reels get a competitive score
      }

      return {
        reel,
        score,
        parentCourse,
        emotionScore: parentCourse?.emotionAffinity?.[emotionKey] || 0.5,
        domainMatch: userDomain && reelCategory?.toLowerCase().includes(userDomain.toLowerCase()),
        interestMatches: tagMatches,
        courseTags,
        hasParentCourse: !!parentCourse
      };
    });

    // Sort by score - highest first
    const sortedReels = scoredReels
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(item => item.reel);

    setRecommendedReels(sortedReels);
  };

  const handleCoursePlay = (course: Course) => {
    if (course.forceDirectPlayback) {
      setIsVideoMinimized(false);
      setSelectedVideo(course);
      return;
    }

    void playFromFirstLesson(course);
  };

  const [selectedLockedCourse, setSelectedLockedCourse] = useState<Course | null>(null);

  const handleCourseClick = (course: Course) => {
    if (course.isLocked) {
      setSelectedLockedCourse(course);
    } else {
      setSelectedCourse(course);
    }
  };

  const handlePlayCourse = (course: Course) => {
    if (course.isLocked) {
      setSelectedLockedCourse(course);
    } else {
      handleCoursePlay(course);
    }
  };

  const playFromFirstLesson = async (course: Course) => {
    setIsVideoMinimized(false);

    if (!isValidMongoId(course.id)) {
      setSelectedVideo(course);
      return;
    }

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
      const headers = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
      };

      const normalizeList = (payload: any): any[] => {
        if (Array.isArray(payload)) return payload;

        const candidates = [
          payload?.lessons,
          payload?.data,
          payload?.course?.lessonsArray,
          payload?.lessonsArray
        ];

        const firstArray = candidates.find((item) => Array.isArray(item));
        return firstArray || [];
      };

      const [lessonsRes, detailRes, adminLessonsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/courses/v2/${course.id}/lessons`, { headers }),
        fetch(`${API_BASE_URL}/courses/v2/${course.id}`, { headers }),
        fetch(`${API_BASE_URL}/courses/admin/${course.id}/lessons`, { headers })
      ]);

      const merged = new Map<string, any>();

      if (lessonsRes.ok) {
        const payload = await lessonsRes.json();
        normalizeList(payload).forEach((lesson: any) => {
          const key = lesson?._id || lesson?.id;
          if (key) merged.set(String(key), lesson);
        });
      }

      if (detailRes.ok) {
        const payload = await detailRes.json();
        normalizeList(payload).forEach((lesson: any) => {
          const key = lesson?._id || lesson?.id;
          if (key) merged.set(String(key), lesson);
        });
      }

      if (adminLessonsRes.ok) {
        const payload = await adminLessonsRes.json();
        normalizeList(payload).forEach((lesson: any) => {
          const key = lesson?._id || lesson?.id;
          if (key) merged.set(String(key), lesson);
        });
      }

      const lessons = Array.from(merged.values());

      if (!Array.isArray(lessons) || lessons.length === 0) {
        setSelectedVideo(course);
        return;
      }

      const sortedLessons = [...lessons].sort((a: any, b: any) => {
        const chapterOrderA = Number.isFinite(a?.chapter?.order) ? a.chapter.order : 9999;
        const chapterOrderB = Number.isFinite(b?.chapter?.order) ? b.chapter.order : 9999;
        if (chapterOrderA !== chapterOrderB) return chapterOrderA - chapterOrderB;

        const lessonOrderA = Number.isFinite(a?.order) ? a.order : 9999;
        const lessonOrderB = Number.isFinite(b?.order) ? b.order : 9999;
        return lessonOrderA - lessonOrderB;
      });

      const firstLesson = sortedLessons[0];
      const lessonVideoUrl = rewriteUrl(firstLesson?.video?.url || firstLesson?.videoUrl || '');
      const lessonHlsUrl = rewriteUrl(firstLesson?.video?.hlsUrl || firstLesson?.hlsUrl || '');

      const playbackCourse: Course = {
        ...course,
        videoUrl: lessonVideoUrl || course.videoUrl,
        hlsUrl: lessonHlsUrl || course.hlsUrl,
      };

      setSelectedVideo(playbackCourse);
    } catch {
      setSelectedVideo(course);
    }
  };

  // Notification helper function - saves to MongoDB for persistence
  const addNotification = async (type: Notification['type'], title: string, message: string, metadata?: any) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: Date.now()
    };

    // Add to live notifications (toast)
    setLiveNotifications(prev => [newNotification, ...prev]);

    // Add to panel notifications (persistent in UI)
    setPanelNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50

    // Save to MongoDB for persistence across sessions
    try {
      const response = await apiService.notifications.create({ type, title, message, metadata });
      // Update the notification ID with the one from MongoDB
      const savedNotification = (response as any)?.notification;
      if (savedNotification) {
        setPanelNotifications(prev => prev.map(n =>
          n.id === newNotification.id ? { ...n, id: savedNotification.id } : n
        ));
      }
    } catch (error) {
      console.error('Failed to save notification to MongoDB:', error);
      // Notification is still shown locally even if save fails
    }

    // Auto-dismiss toast after 5 seconds
    setTimeout(() => {
      setLiveNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  };

  const dismissNotification = async (id: string) => {
    setLiveNotifications(prev => prev.filter(n => n.id !== id));
    setPanelNotifications(prev => prev.filter(n => n.id !== id));

    // Also dismiss in MongoDB
    try {
      await apiService.notifications.dismiss(id);
    } catch (error) {
      console.error('Failed to dismiss notification in MongoDB:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    setPanelNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      await apiService.notifications.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const handleEnrollCourse = async (courseId: string) => {
    const course = courses.find(c => c.id === courseId);

    try {
      // Call API to enroll
      await apiService.courses.enroll(courseId);

      // Update local state
      setCourses(prev => {
        const updated = prev.map(c =>
          c.id === courseId ? { ...c, enrolled: true } : c
        );
        return updated;
      });

      // Update selectedCourse if it's the one being enrolled
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(prev => prev ? { ...prev, enrolled: true } : null);
      }

      // Record interaction for ML model training
      if (userProfile) {
        recordCourseInteraction(userProfile, courseId, 'enroll');
      }

      // Add notification
      if (course) {
        addNotification(
          'success',
          'Curs adăugat!',
          `Te-ai înscris cu succes la "${course.title}"`
        );
      }
    } catch (error: any) {
      // Handle "Already enrolled" as a success case
      if (error.message && (error.message.includes('Already enrolled') || error.message.includes('already enrolled'))) {
        console.log('User already enrolled, proceeding as success');

        // Update local state just in case
        setCourses(prev => {
          const updated = prev.map(c =>
            c.id === courseId ? { ...c, enrolled: true } : c
          );
          return updated;
        });

        // Update selectedCourse
        if (selectedCourse?.id === courseId) {
          setSelectedCourse(prev => prev ? { ...prev, enrolled: true } : null);
        }

        // Notify user they can watch now
        addNotification('success', 'Ești deja înscris', `Poți continua vizionarea cursului "${course?.title || ''}"`);
        return;
      }

      addNotification('info', 'Eroare', 'Nu s-a putut înscrie la curs. Încercă din nou.');
      console.error('Enrollment failed:', error);
    }
  };

  const handleUpdateProgress = useCallback((courseId: string, progress: number) => {
    // Determine previous progress from current state
    let previousProgress = 0;
    let course: Course | undefined;

    setCourses(prev => {
      const found = prev.find(c => c.id === courseId);
      if (found) {
        previousProgress = found.progress || 0;
        course = found;
      }

      const updated = prev.map(c =>
        c.id === courseId ? { ...c, progress } : c
      );
      return updated;
    });

    // We can't easily access the *updated* course immediately outside setCourses if we want to be pure,
    // but for notifications we need the course title. 
    // We'll use the 'course' found above. 
    // Note: 'courses' dependency is NOT included to avoid re-creating this function when courses change.
    // Instead we use functional state updates.

    if (!course) return;

    // Check for milestone achievements
    if (previousProgress < 25 && progress >= 25) {
      addNotification('milestone', 'Milestone Atins! 🎯', `Ai completat 25% din "${course.title}"`);
    } else if (previousProgress < 50 && progress >= 50) {
      addNotification('milestone', 'La Jumătate! 🔥', `Ai completat 50% din "${course.title}"`);
    } else if (previousProgress < 75 && progress >= 75) {
      addNotification('milestone', 'Aproape Gata! ⚡', `Ai completat 75% din "${course.title}"`);
    } else if (previousProgress < 100 && progress === 100) {
      addNotification('info', 'Video Completat! 📹', `Ai vizionat tot cursul "${course.title}". Acum completează quiz-ul pentru a finaliza cursul!`);
    }
  }, []); // Empty dependency array to ensure stability

  const handleQuizComplete = async (courseId: string, passed: boolean) => {
    if (!passed) {
      addNotification('info', 'Mai încearcă! 💪', 'Trebuie să obții cel puțin 60% pentru a promova quiz-ul.');
      return;
    }

    const course = courses.find(c => c.id === courseId);

    try {
      // Call API to mark course as complete
      await apiService.courses.complete(courseId);

      // Update local state
      setCourses(prev => {
        const updated = prev.map(c =>
          c.id === courseId ? { ...c, quizCompleted: true } : c
        );
        return updated;
      });

      // Update selectedCourse if it's the one completing quiz
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(prev => prev ? { ...prev, quizCompleted: true } : null);
      }

      // Add success notification
      if (course) {
        addNotification(
          'success',
          'Curs Finalizat! 🎉',
          `Felicitări! Ai completat cu succes "${course.title}"`
        );
      }
    } catch (error) {
      addNotification('info', 'Eroare', 'Nu s-a putut marca cursul ca finalizat. Încercă din nou.');
      console.error('Quiz completion failed:', error);
    }
  };

  const handleAuthComplete = (profile: UserProfile, token?: string) => {
    setLikedCourses([]);
    setCourses((prev) => prev.map((course) => ({ ...course, enrolled: false })));
    setUserProfile(profile);
    setIsAuthenticated(true);
    if (token) {
      localStorage.setItem('authToken', token);
    }
    localStorage.setItem('userProfile', JSON.stringify(profile));
    setShowAuth(false);
    if (ENABLE_MOOD_MODAL) {
      setShowMoodModal(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    setLikedCourses([]);
    setCourses((prev) => prev.map((course) => ({ ...course, enrolled: false })));
    setRecommendedCourses([]);
    setRecommendedReels([]);
    localStorage.removeItem('userProfile');
    localStorage.removeItem('streamclass_session');
    localStorage.removeItem('lastMoodCheck');
    localStorage.removeItem('authToken');
    localStorage.removeItem('likedCourses'); // Legacy global key cleanup to avoid cross-user leakage.
    localStorage.removeItem('cachedRecommendations');
    (window as any).__lastRecommendationKey = null;
    setCurrentView('home');
    setShowAuth(true);
  };

  const handleProfileUpdate = async (updatedProfile: UserProfile) => {
    // Update local state immediately for responsive UI
    setUserProfile(updatedProfile);
    setShowProfileModal(false);

    // Save to localStorage to persist across page refresh
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));

    // Then sync with backend
    try {
      await apiService.user.updateProfile({
        email: updatedProfile.email,
        username: updatedProfile.name,
        fullName: updatedProfile.name,
        phone: updatedProfile.phone,
        companyName: updatedProfile.companyName,
        bio: updatedProfile.bio,
        avatar: updatedProfile.avatar,
        // Send interests and activityDomain
        interests: updatedProfile.initialQuestionnaire?.interests || [],
        activityDomain: updatedProfile.initialQuestionnaire?.activityDomain || updatedProfile.background?.domain || '',
        packageTier: updatedProfile.packageTier
      });
      console.log('✓ Profile synced to database');
      console.log('✓ Interests saved:', updatedProfile.initialQuestionnaire?.interests);
      console.log('✓ Domain saved:', updatedProfile.initialQuestionnaire?.activityDomain);
      console.log('✓ Profile saved to localStorage');

      // Re-fetch the profile from backend to get the populated company/package data
      // This ensures localStorage has the correct packageTier before reload
      try {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          const refreshResp = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (refreshResp.ok) {
            const freshData = await refreshResp.json();
            const refreshedProfile: UserProfile = {
              name: freshData.username || freshData.fullName || 'User',
              email: freshData.email,
              avatar: freshData.avatar || updatedProfile.avatar,
              bio: freshData.bio || 'Mentora Student',
              role: freshData.role || 'user',
              packageTier: freshData.company?.package?.name?.toLowerCase()
                || freshData.package?.name?.toLowerCase()
                || 'free',
              companyName: freshData.company?.name || freshData.companyName || undefined,
              initialQuestionnaire: freshData.initialQuestionnaire || {},
              background: freshData.background || {},
              dailyMood: updatedProfile.dailyMood
            };
            setUserProfile(refreshedProfile);
            localStorage.setItem('userProfile', JSON.stringify(refreshedProfile));
            console.log('✓ Re-fetched profile with packageTier:', refreshedProfile.packageTier);
          }
        }
      } catch (refreshErr) {
        console.warn('Could not re-fetch profile, using local data:', refreshErr);
      }

      // Pass the new profile directly to avoid stale closure issues
      generateRecommendations(updatedProfile);
      
      // Reload the page to ensure all components (including Home) get the new package restrictions
      window.location.reload();

    } catch (error) {
      console.error('Failed to sync profile to database:', error);
      // UI already updated, backend sync failed - could show a toast notification
    }
  };

  const handleMoodUpdate = async (mood: string, energy: string) => {
    if (!userProfile) return;

    const updatedProfile = {
      ...userProfile,
      dailyMood: {
        date: new Date().toDateString(),
        mood,
        energy
      }
    };

    setUserProfile(updatedProfile);

    try {
      await apiService.auth.updateEmotion(mood, energy);
    } catch (error) {
      console.error('Failed to update mood:', error);
    }

    setShowMoodModal(false);
  };

  const visibleCourses = useMemo(
    () => (Array.isArray(courses) ? courses.filter(c => c.packageTiers && c.packageTiers.length > 0) : []),
    [courses]
  );
  const visibleRecommended = useMemo(
    () => recommendedCourses.filter(c => c.packageTiers && c.packageTiers.length > 0),
    [recommendedCourses]
  );
  const visibleReels = useMemo(
    () => (Array.isArray(reels) ? reels.filter(reel => {
      if (!reel.courseId) return true;
      const parentCourse = courses.find(c => c.id === reel.courseId);
      return parentCourse ? (parentCourse.packageTiers && parentCourse.packageTiers.length > 0) : true;
    }) : []),
    [reels, courses]
  );
  const visibleRecommendedReels = useMemo(
    () => (Array.isArray(recommendedReels) ? recommendedReels.filter(reel => {
      if (!reel.courseId) return true;
      const parentCourse = courses.find(c => c.id === reel.courseId);
      return parentCourse ? (parentCourse.packageTiers && parentCourse.packageTiers.length > 0) : true;
    }) : []),
    [recommendedReels, courses]
  );
  const coursesByCategory = useMemo(() => {
    const uniqueCategories = [...new Set(visibleCourses.map(c => c.category).filter(Boolean))];
    return uniqueCategories.map(category => ({
      category,
      title: CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1),
      courses: visibleCourses.filter(c => c.category === category),
    }));
  }, [visibleCourses]);

  const openReelViewer = useCallback((reel: Reel) => {
    const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
    audio.play().catch(() => {});
    setSelectedReel(reel);
    setShowReels(true);
  }, []);

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
    setMountedViews((prev) => {
      if (prev.has(view)) return prev;
      const next = new Set(prev);
      next.add(view);
      return next;
    });
  }, []);

  const heroCourses = useMemo(
    () => (visibleRecommended.length > 0 ? visibleRecommended : visibleCourses.slice(0, 10)),
    [visibleRecommended, visibleCourses]
  );

  useEffect(() => {
    const thumbnail = heroCourses[0]?.thumbnail;
    if (!thumbnail || !thumbnail.startsWith('http')) return;

    const existing = document.querySelector('link[data-hero-preload="true"]');
    if (existing?.getAttribute('href') === thumbnail) return;

    existing?.remove();
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = thumbnail;
    link.setAttribute('data-hero-preload', 'true');
    document.head.appendChild(link);
  }, [heroCourses]);

  if (!isAuthenticated) {
    return (
      <AuthModal
        isOpen={true}
        onClose={() => { }}
        onComplete={handleAuthComplete}
      />
    );
  }

  if (showGDPRModal) {
    return (
      <GDPRConsentModal
        userConsentKey={userConsentKey}
        onConsentGiven={() => setShowGDPRModal(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#002147] text-white relative overscroll-contain">
      {/* Content */}
      <div className="relative z-10">
        <Toaster
          position="top-right"
          theme="dark"
        />

        <Header
          currentView={currentView}
          onViewChange={handleViewChange}
          userProfile={userProfile}
          onProfileClick={() => setShowProfileModal(true)}
          onLogout={handleLogout}
          onSearchClick={() => setShowSearch(true)}
          onNotificationsClick={() => setShowNotifications(true)}
        />

        <main className="pb-8">
          {currentView === 'home' && (
            <div>
              <Hero onPlayClick={handleCoursePlay} onInfoClick={handleCourseClick} courses={heroCourses} />
              <div className="px-4 md:px-12 space-y-8 -mt-32 relative z-10">
                {visibleRecommended.length > 0 && (
                  <CourseGrid
                    title="Recommended For You"
                    category="recommended"
                    onCourseClick={handleCourseClick}
                    onPlay={handlePlayCourse}
                    onEnroll={handleEnrollCourse}
                    courses={visibleRecommended}
                  />
                )}
                <CourseGrid
                  title="Continue Learning"
                  category="featured"
                  onCourseClick={handleCourseClick}
                  onPlay={handlePlayCourse}
                  onEnroll={handleEnrollCourse}
                  courses={visibleCourses.filter(c => c.enrolled && c.progress && c.progress > 0)}
                  showProgress
                />
                <CourseGrid
                  title="Business & Leadership"
                  category="business"
                  onCourseClick={handleCourseClick}
                  onPlay={handlePlayCourse}
                  onEnroll={handleEnrollCourse}
                  courses={visibleCourses}
                />
                <CourseGrid
                  title="Arte Creative"
                  category="creative"
                  onCourseClick={handleCourseClick}
                  onPlay={handlePlayCourse}
                  onEnroll={handleEnrollCourse}
                  courses={visibleCourses}
                />
                <CourseGrid
                  title="Trending Acum"
                  category="featured"
                  onCourseClick={handleCourseClick}
                  onPlay={handlePlayCourse}
                  onEnroll={handleEnrollCourse}
                  courses={visibleCourses}
                />
                {visibleRecommendedReels.length > 0 && (
                  <div>
                    <h2 className="mb-4 px-4 md:px-0 text-xl md:text-2xl">Recommended Reels</h2>
                    <ReelsSection
                      key={`recommended-reels-${visibleRecommendedReels.length}`}
                      onReelClick={openReelViewer}
                      reels={visibleRecommendedReels}
                    />
                  </div>
                )}
                {visibleReels.length > 0 && (
                  <div>
                    <h2 className="mb-4 px-4 md:px-0 text-xl md:text-2xl">Reels from Courses</h2>
                    <ReelsSection
                      key={`course-reels-${visibleReels.length}`}
                      onReelClick={openReelViewer}
                      reels={visibleReels}
                    />
                  </div>
                )}
              </div>
            </div>
          )
          }

          {mountedViews.has('courses') && (
          <div className={currentView === 'courses' ? 'block' : 'hidden'} aria-hidden={currentView !== 'courses'}>
            <div className="px-4 md:px-12 pt-24 space-y-8">
              <div>
                <h1 className="mb-2">All Courses</h1>
                <p className="text-gray-400">all courses based on category</p>
              </div>
              {coursesByCategory.map(({ category, title, courses: categoryCourses }) => (
                <CourseGrid
                  key={category}
                  title={title}
                  category={category}
                  onCourseClick={handleCourseClick}
                  onPlay={handlePlayCourse}
                  onEnroll={handleEnrollCourse}
                  courses={categoryCourses}
                />
              ))}
            </div>
          </div>
          )}

          {mountedViews.has('reels') && (
          <div className={currentView === 'reels' ? 'block' : 'hidden'} aria-hidden={currentView !== 'reels'}>
            <div className="px-4 md:px-12 pt-24 pb-12 min-h-screen overflow-hidden">
              <div className="mb-8">
                <h1 className="mb-2">Reels</h1>
                <p className="text-gray-400">Quick lessons and highlights</p>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-4">All Reels</h2>
              <ReelsSection
                key={`all-reels-${visibleReels.length}`}
                onReelClick={openReelViewer}
                fullView
                reels={visibleReels}
              />
            </div>
          </div>
          )}

          {
            currentView === 'my-learning' && (
              <div className="px-4 md:px-12 pt-24 animate-fadeIn">
                <div className="mb-8">
                  <h1 className="mb-2">My Learning</h1>
                  <p className="text-gray-400">Continue from where you left off</p>
                </div>
                <CourseGrid
                  title="In Progress"
                  category="featured"
                  onCourseClick={handleCourseClick}
                  onPlay={handlePlayCourse}
                  onEnroll={handleEnrollCourse}
                  showProgress
                  courses={Array.isArray(courses) ? courses.filter(c => c.enrolled && c.progress && c.progress > 0) : []}
                />
                <CourseGrid
                  title="Completed"
                  category="featured"
                  onCourseClick={handleCourseClick}
                  onPlay={handlePlayCourse}
                  onEnroll={handleEnrollCourse}
                  courses={Array.isArray(courses) ? courses.filter(c => c.enrolled && c.progress === 100 && c.quizCompleted === true) : []}
                />
                <CourseGrid
                  title="Liked Courses"
                  category="featured"
                  onCourseClick={handleCourseClick}
                  onPlay={handlePlayCourse}
                  onEnroll={handleEnrollCourse}
                  courses={Array.isArray(courses) ? courses.filter(c => likedCourses.includes(c.id)) : []}
                />
                <CourseGrid
                  title="My List"
                  category="featured"
                  onCourseClick={handleCourseClick}
                  onPlay={handlePlayCourse}
                  onEnroll={handleEnrollCourse}
                  courses={Array.isArray(courses) ? courses.filter(c => c.enrolled && (!c.progress || c.progress === 0)) : []}
                />
              </div>
            )
          }

          {
            currentView === 'speakers' && (
              <div className="animate-fadeIn">
                <SpeakersTab userPackage={userProfile?.initialQuestionnaire?.expenses || 'Free'} onCourseClick={handleCourseClick} courses={courses} />
              </div>
            )
          }

          {
            currentView === 'admin' && userProfile?.role === 'admin' && (
              <div className="animate-fadeIn">
                <AdminPanel
                  courses={courses}
                  setCourses={setCourses}
                  reels={visibleReels}
                  setReels={setReels}
                  onCreateReel={(course) => {
                    setSelectedCourseForReel(course);
                    setShowReelCreator(true);
                  }}
                />
              </div>
            )
          }
        </main >

        {selectedVideo && (
          <VideoPlayer
            key={selectedVideo.id}
            course={selectedVideo}
            onClose={() => {
              // When exiting video, use fresh course data from state (not stale blob URLs)
              const freshCourse = courses.find(c => c.id === selectedVideo.id);
              if (freshCourse) {
                // Use the real course with proper B2 URLs
                setSelectedCourse(freshCourse);
              } else {
                // Fallback: use selectedVideo but it may have stale URLs
                setSelectedCourse(selectedVideo);
              }
              setSelectedVideo(null);
              setIsVideoMinimized(false);
            }}
            onProgressUpdate={handleUpdateProgress}
            isMinimized={isVideoMinimized}
            onMinimize={() => setIsVideoMinimized(!isVideoMinimized)}
          />
        )}

        {
          selectedCourse && (
            <CourseDetail
              key={selectedCourse.id + selectedCourse.enrolled}
              course={selectedCourse}
              onClose={() => setSelectedCourse(null)}
              onPlay={handleCoursePlay}
              onEnroll={handleEnrollCourse}
              onLikeCourse={(courseId) => {
                if (!likedCourses.includes(courseId)) {
                  const nextLiked = [...likedCourses, courseId];
                  setLikedCourses(nextLiked);
                  localStorage.setItem(likedCoursesKey, JSON.stringify(nextLiked));
                }
              }}
              onDislikeCourse={(courseId) => {
                if (likedCourses.includes(courseId)) {
                  const newLiked = likedCourses.filter(id => id !== courseId);
                  setLikedCourses(newLiked);
                  localStorage.setItem(likedCoursesKey, JSON.stringify(newLiked));
                }
              }}
              onQuizComplete={handleQuizComplete}
            />
          )
        }

        {
          showReels && selectedReel && (
            <ReelViewer
              reel={selectedReel}
              allReels={visibleReels}
              courses={courses}
              onClose={() => {
                setShowReels(false);
                setSelectedReel(null);
              }}
              onViewCourse={(courseId) => {
                const course = courses.find(c => c.id === courseId);
                if (course) {
                  setShowReels(false);
                  setSelectedReel(null);
                  setSelectedCourse(course);
                }
              }}
            />
          )
        }

        <UpgradeModal
          isOpen={!!selectedLockedCourse}
          onClose={() => setSelectedLockedCourse(null)}
          courseTitle={selectedLockedCourse?.title}
        />

        {
          showProfileModal && userProfile && (
            <ProfileModal
              profile={userProfile}
              onClose={() => setShowProfileModal(false)}
              onSave={handleProfileUpdate}
            />
          )
        }

        {
          showReelCreator && selectedCourseForReel && (
            <ReelCreator
              course={selectedCourseForReel}
              onClose={() => {
                setShowReelCreator(false);
                setSelectedCourseForReel(null);
              }}
              onSave={async (newReel) => {
                try {
                  // Save reel to backend
                  const formData = new FormData();
                  formData.append('title', newReel.title);
                  formData.append('creator', newReel.creator);
                  const rawReel = newReel as any;
                  // Ensure thumbnail is a string URL
                  const thumbUrl = typeof newReel.thumbnail === 'string'
                    ? newReel.thumbnail
                    : (newReel.thumbnail as any)?.url || '';

                  // Ensure videoUrl is a string URL
                  const vidUrl = typeof newReel.videoUrl === 'string'
                    ? newReel.videoUrl
                    : (newReel.videoUrl as any)?.url || '';

                  if (!rawReel.thumbnailFile) {
                    formData.append('thumbnail', thumbUrl);
                  }
                  formData.append('courseId', newReel.courseId || '');
                  formData.append('tags', JSON.stringify(newReel.tags || []));
                  formData.append('startTime', String(newReel.startTime || 0));
                  formData.append('endTime', String(newReel.endTime || 30));
                  formData.append('videoUrl', vidUrl);
                  if (rawReel.sourceLessonId) {
                    formData.append('sourceLessonId', rawReel.sourceLessonId);
                  }
                  if (rawReel.sourceChapterName) {
                    formData.append('sourceChapterName', rawReel.sourceChapterName);
                  }
                  if (rawReel.videoFile) {
                    formData.append('video', rawReel.videoFile);
                  }
                  if (rawReel.thumbnailFile) {
                    formData.append('thumbnail', rawReel.thumbnailFile);
                  }

                  const savedReel = await apiService.admin.createReel(formData);

                  // Transform saved reel to match Reel interface with all required fields
                  const transformedReel: Reel = {
                    id: (savedReel as any).id || (savedReel as any)._id?.toString() || `reel-${Date.now()}`,
                    title: (savedReel as any).title || newReel.title,
                    creator: (savedReel as any).creator || newReel.creator,
                    // Ensure thumbnail is never empty - use multiple fallbacks
                    thumbnail: rewriteUrl((savedReel as any).thumbnail || thumbUrl || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80'),
                    videoUrl: rewriteUrl((savedReel as any).videoUrl || vidUrl || newReel.videoUrl),
                    views: (savedReel as any).views || (savedReel as any).viewCount?.toString() || '0',
                    likes: (savedReel as any).likes || (savedReel as any).likeCount?.toString() || '0',
                    tags: (savedReel as any).tags || newReel.tags || [],
                    courseId: (savedReel as any).courseId || newReel.courseId,
                    startTime: (savedReel as any).startTime ?? newReel.startTime,
                    endTime: (savedReel as any).endTime ?? newReel.endTime,
                  };

                  console.log('🔵 NEW REEL DATA:', {
                    id: transformedReel.id,
                    title: transformedReel.title,
                    thumbnail: transformedReel.thumbnail,
                    reelsCountBefore: reels.length,
                    reelsCountAfter: reels.length + 1
                  });

                  const updatedReels = [transformedReel, ...reels];
                  setReels(updatedReels);
                  console.log('✓ Reel saved to MongoDB:', transformedReel);

                  // Add success notification
                  addNotification(
                    'success',
                    'Reel creat cu succes! 🎬',
                    `Reel-ul "${newReel.title}" a fost adăugat. Verifică secțiunea "Reels from Courses" din Home.`
                  );

                  setShowReelCreator(false);
                  setSelectedCourseForReel(null);
                } catch (error) {
                  console.error('Failed to save reel:', error);
                  addNotification(
                    'info',
                    'Reel creation failed',
                    'The reel was not saved on server. Please try again.'
                  );
                  setShowReelCreator(false);
                  setSelectedCourseForReel(null);
                }
              }}
            />
          )
        }

        {
          ENABLE_MOOD_MODAL && showMoodModal && (
            <MoodModal
              onComplete={handleMoodUpdate}
            />
          )
        }

        {
          showSearch && (
            <SearchModal
              courses={courses}
              onClose={() => setShowSearch(false)}
              onCourseSelect={(courseId) => {
                const course = courses.find(c => c.id === courseId);
                if (course) {
                  setShowSearch(false);
                  setSelectedCourse(course);
                }
              }}
            />
          )
        }

        {
          showNotifications && (
            <NotificationsPanel
              onClose={() => setShowNotifications(false)}
              liveNotifications={panelNotifications}
              onMarkAllRead={markAllNotificationsRead}
            />
          )
        }

        {/* Auth Modal for Login/Signup */}
        {
          showAuth && (
            <AuthModal
              isOpen={showAuth}
              onClose={() => setShowAuth(false)}
              onComplete={handleAuthComplete}
            />
          )
        }

        {/* Live Notifications */}
        <NotificationSystem
          notifications={liveNotifications}
          onDismiss={dismissNotification}
        />
      </div >
    </div >
  );
}