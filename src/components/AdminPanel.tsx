
import { Plus, Video, Film, Trash2, Edit, Upload, Image, BarChart3, Users, X, Clock, Save, ChevronDown, ChevronUp, AlertCircle, Package } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { Course, Reel } from '../App';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../utils/api';
import { imageUploadManager } from '../utils/imageUploadManager';
import { AdminAnalyticsDashboard } from './AdminAnalyticsDashboard';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminVideoManagement } from './AdminVideoManagement';
import { AdminSpeakersManager } from './AdminSpeakersManager';
import { AdminCourseCard } from './AdminCourseCard';
import { AdminPackagesManager } from './AdminPackagesManager';
import { ReelCreator } from './ReelCreator';
import { B2StorageMonitor, type StorageData } from './admin/B2StorageMonitor';

// Predefined Tags for ML Recommendations
const PREDEFINED_TAGS = [
  'leadership', 'business', 'creative', 'art', 'tech', 'programming',
  'photography', 'relaxing', 'motivational', 'inspiring', 'productivity',
  'challenging', 'beginner', 'intermediate', 'advanced', 'fitness',
  'wellness', 'music', 'writing', 'design', 'marketing', 'finance',
  'communication', 'negotiation', 'entrepreneurship', 'management',
  'health', 'mindfulness', 'cooking', 'science', 'languages'
];

// Predefined Categories
const PREDEFINED_CATEGORIES = [
  { id: 'business', label: 'Business & Leadership' },
  { id: 'creative', label: 'Creative Arts' },
  { id: 'tech', label: 'Science & Technology' },
  { id: 'wellness', label: 'Wellness & Lifestyle' },
  { id: 'music', label: 'Music & Audio' },
  { id: 'writing', label: 'Writing & Literature' },
  { id: 'photography', label: 'Photography & Film' },
  { id: 'fitness', label: 'Fitness & Sports' },
  { id: 'design', label: 'Design & Art' },
  { id: 'marketing', label: 'Marketing & Sales' },
  { id: 'finance', label: 'Finance & Investing' },
  { id: 'cooking', label: 'Cooking & Culinary' },
  { id: 'languages', label: 'Languages & Communication' }
];

interface Lesson {
  title: string;
  startTime: string;
  description: string;
}

interface PendingLessonUpload {
  id: string;
  chapterName: string;
  lessonTitle: string;
  videoFile: File;
  thumbnailFile?: File;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface CourseFormData {
  title: string;
  instructor: string;
  thumbnail: string;
  duration: string;
  category: string;
  description: string;
  rating: number;
  students: number;
  videoUrl: string;
  progress: number;
  tags: string[];
  selectedCategories: string[];
  lessonsData: Lesson[];
  quizQuestions: QuizQuestion[];
  infoContent: string;
  emotionAffinity: {
    FERICIT: number;
    MOTIVAT: number;
    RELAXAT: number;
    CURIOS: number;
    PRODUCTIV: number;
    CREATIV: number;
  };
  energyLevel: string;
  packageTiers: string[];
}

interface AdminPanelProps {
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  reels: Reel[];
  setReels: (reels: Reel[]) => void;
  onCreateReel: (course: Course) => void;
}

interface SpeakerOption {
  _id?: string;
  id?: string;
  name: string;
  title?: string;
}

const getInitialFormData = (): CourseFormData => ({
  title: '',
  instructor: '',
  thumbnail: '',
  duration: '',
  category: '',
  description: '',
  rating: 5.0,
  students: 0,
  videoUrl: '',
  progress: 0,
  tags: [],
  selectedCategories: [],
  packageTiers: [],
  lessonsData: [],
  quizQuestions: [],
  infoContent: '',
  emotionAffinity: {
    FERICIT: 0.5,
    MOTIVAT: 0.5,
    RELAXAT: 0.5,
    CURIOS: 0.5,
    PRODUCTIV: 0.5,
    CREATIV: 0.5
  },
  energyLevel: 'medium'
});

const isValidMongoId = (value: unknown) => /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());

export function AdminPanel({ courses, setCourses, reels, setReels, onCreateReel }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'courses' | 'reels' | 'media' | 'analytics' | 'users' | 'videos' | 'speakers' | 'packages' | 'company_requests'>('courses');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingReel, setEditingReel] = useState<Reel | null>(null);
  const [uploadingCourseId, setUploadingCourseId] = useState<string | null>(null);
  const [uploadingReelId, setUploadingReelId] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<SpeakerOption[]>([]);
  const [lessonsPerCourse, setLessonsPerCourse] = useState<{ [key: string]: any[] }>({});
  const [loadingLessons, setLoadingLessons] = useState<Set<string>>(new Set());
  const [chaptersData, setChaptersData] = useState<{ [key: string]: { [key: string]: any[] } }>({});
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Global expand state for all course cards
  const [allCardsExpanded, setAllCardsExpanded] = useState(true);

  // Broken image cleanup
  const [brokenImageCourses, setBrokenImageCourses] = useState<Course[]>([]);
  const [showBrokenCourses, setShowBrokenCourses] = useState(false);
  const [checkingBrokenImages, setCheckingBrokenImages] = useState(false);

  const [formData, setFormData] = useState<CourseFormData>(getInitialFormData());
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [instructorImageFile, setInstructorImageFile] = useState<File | null>(null);
  const [showLessonsEditor, setShowLessonsEditor] = useState(false);
  const [showQuizEditor, setShowQuizEditor] = useState(false);
  const [pendingLessonQueue, setPendingLessonQueue] = useState<PendingLessonUpload[]>([]);
  const [pendingChapters, setPendingChapters] = useState<string[]>([]);
  const [newChapterDraft, setNewChapterDraft] = useState('');
  const [queueChapterName, setQueueChapterName] = useState('');
  const [queueLessonTitle, setQueueLessonTitle] = useState('');
  const [queueVideoFile, setQueueVideoFile] = useState<File | null>(null);
  const [queueThumbnailFile, setQueueThumbnailFile] = useState<File | null>(null);
  const [draggedQueueLessonId, setDraggedQueueLessonId] = useState<string | null>(null);

  // B2 storage monitor state (always-visible in Admin Panel header)
  const [storageStats, setStorageStats] = useState<StorageData | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageError, setStorageError] = useState(false);

  const fetchStorageStats = useCallback(async () => {
    setStorageLoading(true);
    setStorageError(false);
    try {
      const response: any = await apiService.admin.getDashboardStats();
      const stats = response?.stats?.storage;
      if (stats) {
        setStorageStats(stats);
      }
    } catch (error) {
      console.warn('Could not load B2 storage stats:', error);
      setStorageError(true);
    } finally {
      setStorageLoading(false);
    }
  }, []);

  // Determine form mode
  const isEditMode = !!editingCourse;
  const showForm = showAddCourse || isEditMode;

  useEffect(() => {
    const fetchSpeakers = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
        const response = await fetch(`${API_BASE_URL}/instructors`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const normalized = Array.isArray(data) ? data : data.data || [];
        setSpeakers(normalized);
      } catch (error) {
        console.error('Failed to fetch speakers list:', error);
      }
    };

    fetchSpeakers();
  }, []);

  // Load B2 storage stats once on mount so the monitor widget is always up to date.
  useEffect(() => {
    fetchStorageStats();
  }, [fetchStorageStats]);

  // Form handlers using useCallback to prevent recreation
  const handleTitleChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, title: value }));
  }, []);

  const handleInstructorChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, instructor: value }));
  }, []);

  const handleDescriptionChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
  }, []);

  const handleInfoContentChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, infoContent: value }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setFormData(prev => {
      const currentTags = prev.tags || [];
      if (currentTags.includes(tag)) {
        return { ...prev, tags: currentTags.filter(t => t !== tag) };
      } else {
        return { ...prev, tags: [...currentTags, tag] };
      }
    });
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setFormData(prev => {
      const currentCategories = prev.selectedCategories || [];
      if (currentCategories.includes(categoryId)) {
        const newCategories = currentCategories.filter(c => c !== categoryId);
        return {
          ...prev,
          selectedCategories: newCategories,
          category: newCategories[0] || ''
        };
      } else {
        return {
          ...prev,
          selectedCategories: [...currentCategories, categoryId],
          category: categoryId
        };
      }
    });
  }, []);

  const togglePackageTier = useCallback((tier: string) => {
    setFormData(prev => {
      const currentTiers = prev.packageTiers || [];
      if (currentTiers.includes(tier)) {
        return { ...prev, packageTiers: currentTiers.filter(t => t !== tier) };
      } else {
        return { ...prev, packageTiers: [...currentTiers, tier] };
      }
    });
  }, []);

  const addLesson = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      lessonsData: [...prev.lessonsData, { title: '', startTime: '00:00', description: '' }]
    }));
  }, []);

  const updateLesson = useCallback((index: number, field: keyof Lesson, value: string) => {
    setFormData(prev => {
      const newLessons = [...prev.lessonsData];
      newLessons[index] = { ...newLessons[index], [field]: value };
      return { ...prev, lessonsData: newLessons };
    });
  }, []);

  const removeLesson = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      lessonsData: prev.lessonsData.filter((_, i) => i !== index)
    }));
  }, []);

  const addQuizQuestion = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      quizQuestions: [...prev.quizQuestions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]
    }));
  }, []);

  const updateQuizQuestion = useCallback((index: number, field: string, value: any) => {
    setFormData(prev => {
      const newQuestions = [...prev.quizQuestions];
      if (field === 'option') {
        newQuestions[index].options[value.optionIndex] = value.text;
      } else {
        (newQuestions[index] as any)[field] = value;
      }
      return { ...prev, quizQuestions: newQuestions };
    });
  }, []);

  const removeQuizQuestion = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      quizQuestions: prev.quizQuestions.filter((_, i) => i !== index)
    }));
  }, []);

  const groupedPendingLessons = useMemo(() => {
    return pendingLessonQueue.reduce((acc, lesson) => {
      if (!acc[lesson.chapterName]) {
        acc[lesson.chapterName] = [];
      }
      acc[lesson.chapterName].push(lesson);
      return acc;
    }, {} as Record<string, PendingLessonUpload[]>);
  }, [pendingLessonQueue]);

  const allQueueChapters = useMemo(() => {
    const fromLessons = pendingLessonQueue.map(item => item.chapterName);
    const merged = [...pendingChapters, ...fromLessons].map(name => name.trim()).filter(Boolean);
    return Array.from(new Set(merged));
  }, [pendingChapters, pendingLessonQueue]);

  const addPendingChapter = useCallback(() => {
    const chapter = newChapterDraft.trim();
    if (!chapter) {
      return;
    }

    setPendingChapters(prev => (prev.includes(chapter) ? prev : [...prev, chapter]));
    setQueueChapterName(chapter);
    setNewChapterDraft('');
  }, [newChapterDraft]);

  const addLessonToQueue = useCallback(() => {
    if (!queueChapterName.trim() || !queueLessonTitle.trim() || !queueVideoFile) {
      alert('Completeaza capitol, titlu lectie si selecteaza video.');
      return;
    }

    const queuedLesson: PendingLessonUpload = {
      id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chapterName: queueChapterName.trim(),
      lessonTitle: queueLessonTitle.trim(),
      videoFile: queueVideoFile,
      ...(queueThumbnailFile ? { thumbnailFile: queueThumbnailFile } : {})
    };

    setPendingLessonQueue(prev => [...prev, queuedLesson]);
    setPendingChapters(prev => (prev.includes(queueChapterName.trim()) ? prev : [...prev, queueChapterName.trim()]));
    setQueueChapterName('');
    setQueueLessonTitle('');
    setQueueVideoFile(null);
    setQueueThumbnailFile(null);
  }, [queueChapterName, queueLessonTitle, queueVideoFile, queueThumbnailFile]);

  const removeQueuedLesson = useCallback((queuedId: string) => {
    setPendingLessonQueue(prev => prev.filter(item => item.id !== queuedId));
  }, []);

  const reorderQueuedLessons = useCallback((sourceId: string, targetId: string) => {
    setPendingLessonQueue(prev => {
      const fromIndex = prev.findIndex(item => item.id === sourceId);
      const toIndex = prev.findIndex(item => item.id === targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev;
      }

      // Allow reorder only inside the same chapter for better control.
      if (prev[fromIndex].chapterName !== prev[toIndex].chapterName) {
        return prev;
      }

      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered;
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
    setVideoFile(null);
    setThumbnailFile(null);
    setInstructorImageFile(null);
    setShowLessonsEditor(false);
    setShowQuizEditor(false);
    setShowAddCourse(false);
    setEditingCourse(null);
    setPendingLessonQueue([]);
    setPendingChapters([]);
    setNewChapterDraft('');
    setQueueChapterName('');
    setQueueLessonTitle('');
    setQueueVideoFile(null);
    setQueueThumbnailFile(null);
  }, []);

  const timeToSeconds = (time: string): number => {
    const parts = time.split(':');
    return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
  };

  const secondsToTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} `;
  };

  // Helper to normalize course data from API to match frontend Course interface
  const normalizeCourse = (apiCourse: any): Course => {
    const objectId = apiCourse?._id?.toString?.() || apiCourse?._id;
    const fallbackId = apiCourse?.id?.toString?.() || apiCourse?.id;
    const resolvedId = isValidMongoId(objectId)
      ? String(objectId)
      : String(fallbackId || objectId || '');

    // If thumbnailImageId exists, use it to construct the proper media URL
    let thumbnailUrl = apiCourse.thumbnail;
    if (apiCourse.thumbnailImageId) {
      const thumbId = typeof apiCourse.thumbnailImageId === 'string'
        ? apiCourse.thumbnailImageId
        : apiCourse.thumbnailImageId?.toString?.() || apiCourse.thumbnailImageId;
      if (thumbId && /^[a-f0-9]{24}$/i.test(thumbId)) {
        thumbnailUrl = `${API_BASE_URL}/media/${thumbId}`;
      }
    }

    return {
      ...apiCourse,
      id: resolvedId,
      thumbnail: thumbnailUrl,
      // Ensure other fields are present
      lessons: apiCourse.lessons?.length || apiCourse.lessons || 0,
      students: apiCourse.students || 0,
      rating: apiCourse.rating || 0
    };
  };

  const handleAddCourse = async () => {
    if (!formData.title || !formData.instructor) {
      alert('Te rog completează titlul și speaker-ul');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('instructor', formData.instructor);
    formDataToSend.append('description', formData.description || '');
    formDataToSend.append('duration', formData.duration || '1h 0m');
    formDataToSend.append('category', formData.selectedCategories[0] || 'featured');
    formDataToSend.append('categories', JSON.stringify(formData.selectedCategories));
    formDataToSend.append('tags', JSON.stringify(formData.tags));
    formDataToSend.append('packageTiers', JSON.stringify(formData.packageTiers));

    const lessonsData = formData.lessonsData.map(lesson => ({
      title: lesson.title,
      startTime: timeToSeconds(lesson.startTime),
      description: lesson.description
    }));
    formDataToSend.append('lessons', JSON.stringify(lessonsData));
    formDataToSend.append('lessonsCount', String(lessonsData.length || 0));
    formDataToSend.append('quizQuestions', JSON.stringify(formData.quizQuestions));
    formDataToSend.append('infoContent', formData.infoContent);
    formDataToSend.append('emotionAffinity', JSON.stringify(formData.emotionAffinity));
    formDataToSend.append('energyLevel', formData.energyLevel);

    // VIDEO IS NOW OPTIONAL - UPLOAD LESSONS SEPARATELY
    // if (videoFile) formDataToSend.append('video', videoFile);
    if (thumbnailFile) formDataToSend.append('thumbnail', thumbnailFile);
    if (instructorImageFile) formDataToSend.append('instructorImage', instructorImageFile);

    try {
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/admin/courses`);

        const token = localStorage.getItem('authToken');
        console.log('🔐 Course upload token check:', {
          hasToken: !!token,
          tokenLength: token?.length,
          url: `${API_BASE_URL}/admin/courses`
        });

        if (!token) {
          reject(new Error('No auth token found - please login again'));
          return;
        }

        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              console.error('Upload failed with status', xhr.status, err);
              reject(new Error(err.message || err.error || `Error ${xhr.status}`));
            } catch {
              reject(new Error(`Error ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formDataToSend);
      });

      const normalizedResult = normalizeCourse(result);
      setCourses(prev => {
        const withoutDuplicate = prev.filter(c => c.id !== normalizedResult.id);
        return [normalizedResult, ...withoutDuplicate];
      });

      // ✅ Switch to EDIT MODE to add lessons
      setEditingCourse(normalizedResult);
      setFormData({
        title: normalizedResult.title,
        instructor: normalizedResult.instructor,
        thumbnail: normalizedResult.thumbnail,
        duration: normalizedResult.duration,
        category: normalizedResult.category,
        description: normalizedResult.description || '',
        rating: normalizedResult.rating || 5.0,
        lessonsData: [],
        selectedCategories: normalizedResult.categories || [],
        tags: normalizedResult.tags || [],
        quizQuestions: [],
        infoContent: '',
        emotionAffinity: {
          FERICIT: 0.5,
          MOTIVAT: 0.5,
          RELAXAT: 0.5,
          CURIOS: 0.5,
          PRODUCTIV: 0.5,
          CREATIV: 0.5
        },
        energyLevel: 'medium'
      });
      
      // Load existing lessons for this course
      await loadCourseLessons(normalizedResult.id);

      if (pendingLessonQueue.length > 0) {
        setVideoUploadProgress(`Se incarca ${pendingLessonQueue.length} lectii din queue...`);
        const failedUploads: string[] = [];
        const failedQueueItems: PendingLessonUpload[] = [];

        for (const queuedLesson of pendingLessonQueue) {
          try {
            await handleUploadLessonVideo(
              normalizedResult.id,
              queuedLesson.chapterName,
              queuedLesson.lessonTitle,
              queuedLesson.videoFile,
              queuedLesson.thumbnailFile,
              true
            );
          } catch {
            failedUploads.push(`${queuedLesson.chapterName} / ${queuedLesson.lessonTitle}`);
            failedQueueItems.push(queuedLesson);
          }
        }

        await loadCourseLessons(normalizedResult.id);
        setPendingLessonQueue(failedQueueItems);

        if (failedUploads.length > 0) {
          alert(`⚠️ Cursul a fost creat, dar ${failedUploads.length} lecții nu au fost încărcate:\n\n- ${failedUploads.join('\n- ')}`);
        }
      }
      
      // 🔥 IMPORTANT: Open the Chapters section automatically after saving new course
      setShowLessonsEditor(true);
      
      alert(`✅ Curs creat${pendingLessonQueue.length > 0 ? ' și lecțiile din queue au fost procesate' : ''}!`);
      setShowAddCourse(false); // Close add button, keep form open
    } catch (error) {
      alert('Eroare la upload: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title || editingCourse.title);
    formDataToSend.append('instructor', formData.instructor || editingCourse.instructor);
    formDataToSend.append('description', formData.description || editingCourse.description || '');
    formDataToSend.append('duration', formData.duration || editingCourse.duration);
    formDataToSend.append('category', formData.selectedCategories[0] || editingCourse.category);
    formDataToSend.append('categories', JSON.stringify(formData.selectedCategories));
    formDataToSend.append('tags', JSON.stringify(formData.tags || editingCourse.tags || []));
    formDataToSend.append('packageTiers', JSON.stringify(formData.packageTiers || editingCourse.packageTiers || []));

    const lessonsData = formData.lessonsData.map(lesson => ({
      title: lesson.title,
      startTime: timeToSeconds(lesson.startTime),
      description: lesson.description
    }));
    formDataToSend.append('lessons', JSON.stringify(lessonsData));
    formDataToSend.append('quizQuestions', JSON.stringify(formData.quizQuestions));
    formDataToSend.append('infoContent', formData.infoContent);
    formDataToSend.append('emotionAffinity', JSON.stringify(formData.emotionAffinity));
    formDataToSend.append('energyLevel', formData.energyLevel);

    if (videoFile) formDataToSend.append('video', videoFile);
    if (thumbnailFile) formDataToSend.append('thumbnail', thumbnailFile);
    if (instructorImageFile) formDataToSend.append('instructorImage', instructorImageFile);

    // Optimistic update immediately
    const optimisticUpdate: Course = {
      ...editingCourse,
      title: formData.title || editingCourse.title,
      instructor: formData.instructor || editingCourse.instructor,
      description: formData.description || editingCourse.description || '',
      duration: formData.duration || editingCourse.duration,
      category: formData.selectedCategories[0] || editingCourse.category,
      tags: formData.tags || editingCourse.tags || [],
      thumbnail: thumbnailFile ? URL.createObjectURL(thumbnailFile) : editingCourse.thumbnail,
    };
    setCourses(courses.map(c => c.id === editingCourse.id ? optimisticUpdate : c));
    const editId = editingCourse.id;
    resetForm();

    if (videoFile) setVideoUploadProgress('Se încarcă...');

    try {
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${API_BASE_URL}/admin/courses/${editId}`);

        const token = localStorage.getItem('authToken');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setVideoUploadProgress(`Se încarcă: ${pct}%`);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.message || err.error || `Error ${xhr.status}`));
            } catch {
              reject(new Error(`Error ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formDataToSend);
      });

      const normalizedResult = normalizeCourse(result);
      setCourses(courses.map(c => c.id === editId ? normalizedResult : c));
      setVideoUploadProgress(null);
    } catch (error) {
      setVideoUploadProgress(null);
      alert('Eroare la actualizare: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const openEditModal = async (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      instructor: course.instructor,
      thumbnail: course.thumbnail,
      duration: course.duration,
      category: course.category,
      description: course.description || '',
      rating: course.rating,
      students: course.students,
      videoUrl: course.videoUrl || '',
      progress: course.progress || 0,
      tags: course.tags || [],
      selectedCategories: (course as any).categories || [course.category],
      lessonsData: (course as any).lessonsData?.map((l: any) => ({
        title: l.title,
        startTime: secondsToTime(l.startTime),
        description: l.description
      })) || [],
      quizQuestions: (course as any).quizQuestions || [],
      infoContent: (course as any).infoContent || '',
      emotionAffinity: (course as any).emotionAffinity || {
        FERICIT: 0.5, MOTIVAT: 0.5, RELAXAT: 0.5,
        CURIOS: 0.5, PRODUCTIV: 0.5, CREATIV: 0.5
      },
      energyLevel: (course as any).energyLevel || 'medium'
    });
    setShowAddCourse(false);
    
    // Load lessons for this course - same as when creating new course
    await loadCourseLessons(course.id);
    
    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUploadCourseThumbnail = async (courseId: string, file: File) => {
    setUploadingCourseId(courseId);
    try {
      const result = await imageUploadManager.uploadCourseThumbnail(courseId, file);
      if (result.success && result.imageId) {
        const updatedCourses = courses.map(c =>
          c.id === courseId
            ? { ...c, thumbnailImageId: result.imageId, thumbnail: result.blobUrl || c.thumbnail }
            : c
        );
        setCourses(updatedCourses);
        alert('✓ Thumbnail încărcat cu succes!');
      } else {
        alert('❌ Eroare la upload: ' + result.error);
      }
    } catch (error) {
      alert('❌ Eroare: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploadingCourseId(null);
    }
  };

  const handleUploadReelThumbnail = async (reelId: string, file: File) => {
    setUploadingReelId(reelId);
    try {
      const result = await imageUploadManager.uploadReelThumbnail(reelId, file);
      if (result.success && result.imageId) {
        const updatedReels = reels.map(r =>
          r.id === reelId
            ? { ...r, thumbnailImageId: result.imageId, thumbnail: result.blobUrl || r.thumbnail }
            : r
        );
        setReels(updatedReels);
        alert('✓ Thumbnail încărcat cu succes!');
      } else {
        alert('❌ Eroare la upload: ' + result.error);
      }
    } catch (error) {
      alert('❌ Eroare: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploadingReelId(null);
    }
  };

  // Check for courses with broken/missing thumbnails
  const checkBrokenImages = async () => {
    setCheckingBrokenImages(true);
    try {
      const broken: Course[] = [];
      
      for (const course of courses) {
        // Check if thumbnail URL is missing or empty
        if (!course.thumbnail || course.thumbnail.trim() === '') {
          broken.push(course);
        } else {
          // Try to load the image to check if it's actually broken
          try {
            const response = await fetch(course.thumbnail, { method: 'HEAD' });
            if (!response.ok) {
              broken.push(course);
            }
          } catch (err) {
            broken.push(course);
          }
        }
      }
      
      setBrokenImageCourses(broken);
      setShowBrokenCourses(true);
      
      if (broken.length === 0) {
        alert('✓ Toate cursurile au imagini valide!');
      } else {
        alert(`⚠ Am găsit ${broken.length} cursuri cu imagini rupte`);
      }
    } catch (error) {
      alert('Eroare la verificare: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setCheckingBrokenImages(false);
    }
  };

  // Delete multiple broken courses
  const deleteAllBrokenCourses = async () => {
    if (brokenImageCourses.length === 0) return;
    
    if (!confirm(`Ești sigur că vrei să ștergi ${brokenImageCourses.length} cursuri cu imagini rupte?`)) {
      return;
    }

    try {
      let deleted = 0;
      for (const course of brokenImageCourses) {
        try {
          await apiService.admin.deleteCourse(course.id);
          deleted++;
        } catch (err) {
          console.error(`Failed to delete course ${course.id}:`, err);
        }
      }

      setCourses(prev => prev.filter(c => !brokenImageCourses.some(b => b.id === c.id && (b as any)._id === (c as any)._id)));
      setReels(prev => prev.filter(r => !brokenImageCourses.some(b => b.id === (r as any).courseId || b.id === (r as any).course)));
      
      setBrokenImageCourses([]);
      setShowBrokenCourses(false);
      alert(`✓ Șterse ${deleted}/${brokenImageCourses.length} cursuri`);
    } catch (error) {
      alert('Eroare la ștergere: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Ești sigur că vrei să ștergi acest curs? Toate reelurile asociate vor fi de asemenea șterse.')) {
      // Optimistic UI Update: find and remove items immediately to eliminate delay
      const courseToRestore = courses.find(c => c.id === courseId || (c as any)._id === courseId);
      const reelsToRestore = reels.filter(r => (r as any).courseId === courseId || (r as any).course === courseId);
      
      setCourses(prev => prev.filter(c => c.id !== courseId && (c as any)._id !== courseId));
      setReels(prev => prev.filter(r => (r as any).courseId !== courseId && (r as any).course !== courseId));
      
      try {
        await apiService.admin.deleteCourse(courseId);
        // Refresh B2 storage monitor to reflect freed space
        fetchStorageStats();
      } catch (error) {
        // Rollback on failure
        if (courseToRestore) setCourses(prev => [...prev, courseToRestore]);
        if (reelsToRestore.length > 0) setReels(prev => [...prev, ...reelsToRestore]);
        alert('Eroare la ștergere: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (confirm('Ești sigur că vrei să ștergi acest reel?')) {
      const reelToRestore = reels.find(r => r.id === reelId || (r as any)._id === reelId);
      setReels(prev => prev.filter(r => r.id !== reelId && (r as any)._id !== reelId));
      
      try {
        await apiService.admin.deleteReel(reelId);
        fetchStorageStats();
      } catch (error) {
        if (reelToRestore) setReels(prev => [...prev, reelToRestore]);
        alert('Eroare la ștergerea reel-ului: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleUploadLessonVideo = async (courseId: string, chapterName: string, lessonTitle: string, videoFile: File, thumbnailFile?: File, silent = false) => {
    try {
      if (!isValidMongoId(courseId)) {
        throw new Error('Course ID invalid. Save/reload the course, then upload lessons again.');
      }

      const normalizedChapterName = String(chapterName || '').trim();
      const normalizedLessonTitle = String(lessonTitle || '').trim();
      if (!normalizedChapterName || !normalizedLessonTitle) {
        throw new Error('Chapter name and lesson title are required.');
      }

      const existingLessons = lessonsPerCourse[courseId] || [];
      const nextOrder = existingLessons.length + 1;
      const chapterNames = Object.keys(chaptersData[courseId] || {});
      const normalizedChapterIndex = chapterNames.findIndex((name) => String(name || '').trim() === normalizedChapterName);
      const chapterOrder = normalizedChapterIndex >= 0
        ? normalizedChapterIndex + 1
        : chapterNames.length + 1;

      const formData = new FormData();
      formData.append('title', normalizedLessonTitle);
      formData.append('description', `${normalizedChapterName} - ${normalizedLessonTitle}`);
      formData.append('video', videoFile);
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }
      formData.append('chapter', JSON.stringify({ name: normalizedChapterName, order: chapterOrder }));
      formData.append('order', String(nextOrder));

      setVideoUploadProgress(`Se încarcă ${normalizedLessonTitle}...`);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/courses/admin/${courseId}/lessons`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload lesson video';
        try {
          const payload = await response.json();
          errorMessage = payload?.error || payload?.message || errorMessage;
        } catch {
          // Keep fallback message when response is not JSON
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setVideoUploadProgress(null);
      if (!silent) {
        alert(`✅ Lecția "${normalizedLessonTitle}" uploadată în capitolul "${normalizedChapterName}"!`);
      }
      
      // Refresh lessons for this course
      await loadCourseLessons(courseId);
      
      return result;
    } catch (error) {
      setVideoUploadProgress(null);
      if (!silent) {
        alert('❌ Eroare upload lecție: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
      throw error;
    }
  };

  const loadCourseLessons = async (courseId: string) => {
    try {
      if (!isValidMongoId(courseId)) {
        setChaptersData(prev => ({
          ...prev,
          [courseId]: {}
        }));
        return;
      }

      setLoadingLessons(prev => new Set([...prev, courseId]));
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/courses/admin/${courseId}/lessons`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) throw new Error('Failed to load lessons');
      
      const lessons = await response.json();
      const lessonsArray = Array.isArray(lessons) ? lessons : [];
      
      // Group lessons by chapter
      const groupedByChapter: { [key: string]: any[] } = {};
      lessonsArray.forEach((lesson: any) => {
        const chapterName = String(lesson?.chapter?.name || '').trim() || 'Lecții fără capitol';
        if (!groupedByChapter[chapterName]) {
          groupedByChapter[chapterName] = [];
        }
        groupedByChapter[chapterName].push(lesson);
      });

      Object.values(groupedByChapter).forEach((chapterLessons: any[]) => {
        chapterLessons.sort((a: any, b: any) => {
          const aOrder = Number.isFinite(a?.order) ? a.order : 9999;
          const bOrder = Number.isFinite(b?.order) ? b.order : 9999;
          return aOrder - bOrder;
        });
      });
      
      // Store grouped data
      setChaptersData(prev => ({
        ...prev,
        [courseId]: groupedByChapter
      }));
      
      // Also keep flat list for compatibility
      setLessonsPerCourse(prev => ({
        ...prev,
        [courseId]: lessonsArray
      }));
    } catch (error) {
      console.error('Error loading lessons:', error);
      setChaptersData(prev => ({
        ...prev,
        [courseId]: {}
      }));
    } finally {
      setLoadingLessons(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
    }
  };

  const handleUpdateReel = async (reel: Reel) => {
    try {
      // API_BASE_URL is already imported from config
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/admin/reels/${reel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: reel.title,
          startTime: reel.startTime,
          endTime: reel.endTime
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update reel');
      }

      const updatedReel = await response.json();

      // Update reels list
      setReels(reels.map(r => r.id === reel.id ? { ...r, ...updatedReel } : r));
      setEditingReel(null);
    } catch (error) {
      alert('Eroare la actualizare: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="px-4 md:px-8 lg:px-12 pt-24 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="mb-2">Admin Panel</h1>
          <p className="text-gray-400">Manage courses, reels, and content</p>
        </div>

        {/* B2 Storage Monitor — always visible above the tabs so you can
            see free GB left and estimated cost at a glance. */}
        {storageError ? null : (
          <div className="mb-8">
            <B2StorageMonitor
              storage={storageStats || undefined}
              loading={storageLoading}
              onRefresh={fetchStorageStats}
              compact
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'courses'
              ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Video className="w-5 h-5" />
            Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('reels')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'reels'
              ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Film className="w-5 h-5" />
            Reels ({reels.length})
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'videos'
              ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Upload className="w-5 h-5" />
            Videos
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'media'
              ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Image className="w-5 h-5" />
            Images
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'users'
              ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Users className="w-5 h-5" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'analytics'
              ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('speakers')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'speakers'
              ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Users className="w-5 h-5" />
            Speakers
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'packages'
              ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white shadow-lg'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            <Package className="w-5 h-5" />
            Packages
          </button>
        </div>

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <button
                onClick={() => { setShowAddCourse(!showAddCourse); setEditingCourse(null); setFormData(getInitialFormData()); }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Add New Course
              </button>

              <button
                onClick={checkBrokenImages}
                disabled={checkingBrokenImages}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF5530] to-[#B54236] text-white rounded-lg hover:from-[#B54236] hover:to-[#FF5530] transition-all shadow-lg hover:scale-105 disabled:opacity-50"
              >
                <AlertCircle className="w-5 h-5" />
                {checkingBrokenImages ? 'Verificare...' : 'Verifică imagini rupte'}
              </button>
            </div>

            {/* Course Form - Inline, not as separate component */}
            {showForm && (
              <div className="glass-effect rounded-2xl p-6 border border-white/10 card-shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h3>{isEditMode ? 'Edit Course' : 'New Course'}</h3>
                  <button onClick={resetForm}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Course Title *"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50"
                    />
                    <select
                      value={formData.instructor}
                      onChange={(e) => handleInstructorChange(e.target.value)}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 text-white"
                    >
                      <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Select Speaker *</option>
                      {speakers.map((speaker) => {
                        const speakerId = speaker._id || speaker.id || speaker.name;
                        return (
                          <option key={speakerId} value={speaker.name} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
                            {speaker.name}{speaker.title ? ` - ${speaker.title}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Thumbnail & Instructor Image Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Thumbnail</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg"
                      />
                      {thumbnailFile && <p className="text-xs text-[#FF5530] mt-1">✓ {thumbnailFile.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Speaker Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setInstructorImageFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg"
                      />
                      {instructorImageFile && <p className="text-xs text-[#FF5530] mt-1">✓ {instructorImageFile.name}</p>}
                    </div>
                  </div>

                  {/* Categories (Multi-select) */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-3">Categories (select multiple)</label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-4 py-2 rounded-full text-sm transition-all ${formData.selectedCategories?.includes(cat.id)
                            ? 'bg-[#B54236] text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Package Tiers */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-3">Required Package Tiers (Unlock Requirements)</label>
                    <div className="flex flex-wrap gap-2">
                      {['Starter', 'Growth', 'Enterprise'].map(tier => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => togglePackageTier(tier)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.packageTiers?.includes(tier)
                            ? 'bg-amber-500 text-black'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-3">Tags for ML Recommendations (click to select)</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white/5 rounded-lg">
                      {PREDEFINED_TAGS.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs transition-all ${formData.tags?.includes(tag)
                            ? 'bg-[#002147] text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {(formData.tags?.length || 0) > 0 && (
                      <p className="text-xs text-[#FF5530] mt-2">Selected: {formData.tags?.join(', ')}</p>
                    )}
                  </div>

                  {/* Emotion Affinity & Energy Level */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-3">🎭 Emotion Affinity (controls mood-based recommendations)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg">
                      {[
                        { key: 'FERICIT' as const, label: '😊 Happy' },
                        { key: 'MOTIVAT' as const, label: '💪 Motivated' },
                        { key: 'RELAXAT' as const, label: '😌 Relaxed' },
                        { key: 'CURIOS' as const, label: '🤔 Curious' },
                        { key: 'PRODUCTIV' as const, label: '⚡ Productive' },
                        { key: 'CREATIV' as const, label: '🎨 Creative' }
                      ].map(emotion => (
                        <div key={emotion.key} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-300">{emotion.label}</span>
                            <span className="text-xs text-gray-500 font-mono">{formData.emotionAffinity[emotion.key].toFixed(1)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={formData.emotionAffinity[emotion.key]}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              emotionAffinity: {
                                ...prev.emotionAffinity,
                                [emotion.key]: parseFloat(e.target.value)
                              }
                            }))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm text-gray-400 mb-2">⚡ Energy Level Required</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'high', label: '🚀 High', desc: 'Challenging content' },
                          { value: 'medium', label: '🌟 Medium', desc: 'Balanced' },
                          { value: 'low', label: '🌙 Low', desc: 'Relaxing' }
                        ].map(level => (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, energyLevel: level.value }))}
                            className={`flex-1 p-3 rounded-lg text-center transition-all border-2 ${formData.energyLevel === level.value
                                ? 'border-[#FF5530] bg-[#FF5530]/20 text-white'
                                : 'border-gray-600 bg-white/5 text-gray-400 hover:border-gray-500'
                              }`}
                          >
                            <div className="text-lg">{level.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{level.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea
                      placeholder="Course description..."
                      value={formData.description}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg min-h-[100px]"
                    />
                  </div>

                  {/* Chapters & Lessons Editor - Works in NEW or EDIT mode */}
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLessonsEditor(!showLessonsEditor);
                        // Load lessons if we're in edit mode and opening
                        if (!showLessonsEditor && editingCourse) {
                          loadCourseLessons(editingCourse.id);
                        }
                      }}
                      className="w-full px-4 py-3 bg-white/5 flex justify-between items-center hover:bg-white/10 transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        📖 Capitole cu Lectii ({editingCourse ? Object.values(chaptersData[editingCourse?.id] || {}).reduce((sum: number, arr: any[]) => sum + (arr?.length || 0), 0) : pendingLessonQueue.length} lecții)
                      </span>
                      {showLessonsEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showLessonsEditor && !editingCourse && (
                      <div className="p-4 space-y-4">
                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                          <h4 className="text-sm font-semibold text-purple-300 mb-3">📚 Creează capitole (poți adăuga mai multe):</h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Nume capitol (ex: Chapter 2 - Advanced)"
                              value={newChapterDraft}
                              onChange={(e) => setNewChapterDraft(e.target.value)}
                              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm"
                            />
                            <button
                              type="button"
                              onClick={addPendingChapter}
                              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium"
                            >
                              + Add Chapter
                            </button>
                          </div>
                          {allQueueChapters.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {allQueueChapters.map((chapter) => (
                                <button
                                  key={chapter}
                                  type="button"
                                  onClick={() => setQueueChapterName(chapter)}
                                  className={`px-2 py-1 rounded-full text-xs border transition ${queueChapterName === chapter ? 'bg-purple-600/50 border-purple-300 text-white' : 'bg-white/5 border-white/20 text-gray-300 hover:border-purple-300'}`}
                                >
                                  {chapter}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <h4 className="text-sm font-semibold text-blue-400 mb-3">➕ Adaugă Lecție în Queue (înainte de Save Course):</h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Capitol (ex: Capitol 1 - Fundamentals)"
                              value={queueChapterName}
                              onChange={(e) => setQueueChapterName(e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Titlu lecție (ex: Lecția 1.1)"
                              value={queueLessonTitle}
                              onChange={(e) => setQueueLessonTitle(e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-[#FF5530] hover:bg-green-700 cursor-pointer rounded-lg transition-all text-sm font-medium">
                                <Video className="w-4 h-4" />
                                📹 Select Video
                                <input
                                  type="file"
                                  accept="video/*"
                                  onChange={(e) => setQueueVideoFile(e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                              </label>

                              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-[#002147] hover:bg-[#003366] cursor-pointer rounded-lg transition-all text-sm font-medium">
                                <Image className="w-4 h-4" />
                                🎨 Select Thumbnail
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setQueueThumbnailFile(e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            <div className="text-xs text-gray-300 space-y-1">
                              <p>{queueVideoFile ? `✓ Video: ${queueVideoFile.name}` : '⚠ Niciun video selectat'}</p>
                              <p>{queueThumbnailFile ? `✓ Thumbnail: ${queueThumbnailFile.name}` : 'ℹ Thumbnail opțional'}</p>
                            </div>

                            <button
                              type="button"
                              onClick={addLessonToQueue}
                              className="w-full px-3 py-2 bg-[#003366] hover:bg-[#004d99] rounded text-sm font-medium transition-all"
                            >
                              ➕ Adaugă Lecția în Queue
                            </button>
                          </div>
                        </div>

                        {Object.keys(groupedPendingLessons).length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-400">Trage și plasează lecțiile pentru a seta ordinea înainte de upload.</p>
                            {Object.entries(groupedPendingLessons).map(([chapterName, lessons]) => (
                              <div key={chapterName} className="border border-white/10 rounded-lg bg-white/5 overflow-hidden">
                                <div className="w-full flex items-center justify-between p-3 bg-white/5">
                                  <span className="text-sm font-semibold">{chapterName}</span>
                                  <span className="text-xs bg-[#002147]/40 px-2 py-1 rounded">{lessons.length} lecții în queue</span>
                                </div>
                                <div className="border-t border-white/10 p-3 space-y-2">
                                  {lessons.map((lesson) => (
                                    <div
                                      key={lesson.id}
                                      draggable
                                      onDragStart={() => setDraggedQueueLessonId(lesson.id)}
                                      onDragEnd={() => setDraggedQueueLessonId(null)}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={() => {
                                        if (draggedQueueLessonId) {
                                          reorderQueuedLessons(draggedQueueLessonId, lesson.id);
                                          setDraggedQueueLessonId(null);
                                        }
                                      }}
                                      className={`text-xs p-2 rounded flex justify-between items-start gap-2 cursor-move transition-all ${draggedQueueLessonId === lesson.id ? 'bg-blue-500/20 border border-blue-400/40' : 'bg-white/5 border border-white/5 hover:border-blue-400/30'}`}
                                    >
                                      <div className="flex-1">
                                        <p className="text-white font-medium">{lesson.lessonTitle}</p>
                                        <div className="flex gap-3 mt-1 text-gray-400 text-xs">
                                          <span className="text-[#FF5530]">✓ Video</span>
                                          {lesson.thumbnailFile ? <span className="text-[#FF5530]">✓ Thumbnail</span> : <span className="text-yellow-400">⚠ No thumb</span>}
                                        </div>
                                      </div>
                                      <span className="text-gray-400 px-1 select-none" title="Drag to reorder">⋮⋮</span>
                                      <button
                                        type="button"
                                        onClick={() => removeQueuedLesson(lesson.id)}
                                        className="text-[#FF5530] hover:text-[#B54236] px-2 py-1 bg-[#FF5530]/20 rounded whitespace-nowrap"
                                      >
                                        Scoate
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-xs py-4">
                            📭 Queue gol. Adaugă lecții, apoi apasă Save Course.
                          </div>
                        )}
                      </div>
                    )}

                    {showLessonsEditor && editingCourse && (
                      <div className="p-4 space-y-4">
                        {/* Add New Lesson */}
                        <div className="p-3 bg-[#FF5530]/10 border border-[#FF5530]/20 rounded-lg">
                          <h4 className="text-sm font-semibold text-[#FF5530] mb-3">➕ Adaugă Lecție cu Video & Thumbnail:</h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Capitol (ex: Capitol 1 - Fundamentals)"
                              id={`form-chapter-name-${editingCourse.id}`}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Titlu lecție (ex: Lecția 1.1)"
                              id={`form-lesson-title-${editingCourse.id}`}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm"
                            />
                            
                            {/* Video Upload */}
                            <label className="flex items-center justify-center gap-2 px-3 py-2 bg-[#FF5530] hover:bg-green-700 cursor-pointer rounded-lg transition-all text-sm font-medium">
                              <Video className="w-4 h-4" />
                              📹 Upload Video
                              <input
                                type="file"
                                accept="video/*"
                                id={`form-lesson-video-${editingCourse.id}`}
                                className="hidden"
                              />
                            </label>

                            {/* Thumbnail Upload */}
                            <label className="flex items-center justify-center gap-2 px-3 py-2 bg-[#002147] hover:bg-[#003366] cursor-pointer rounded-lg transition-all text-sm font-medium">
                              <Image className="w-4 h-4" />
                              🎨 Upload Thumbnail
                              <input
                                type="file"
                                accept="image/*"
                                id={`form-lesson-thumbnail-${editingCourse.id}`}
                                className="hidden"
                              />
                            </label>

                            {/* Submit Button */}
                            <button
                              type="button"
                              onClick={async () => {
                                const videoInput = document.getElementById(`form-lesson-video-${editingCourse.id}`) as HTMLInputElement;
                                const thumbnailInput = document.getElementById(`form-lesson-thumbnail-${editingCourse.id}`) as HTMLInputElement;
                                const chapterInput = document.getElementById(`form-chapter-name-${editingCourse.id}`) as HTMLInputElement;
                                const titleInput = document.getElementById(`form-lesson-title-${editingCourse.id}`) as HTMLInputElement;
                                
                                const videoFile = videoInput?.files?.[0];
                                const thumbnailFile = thumbnailInput?.files?.[0];
                                
                                if (!videoFile || !chapterInput?.value.trim() || !titleInput?.value.trim()) {
                                  alert('Completează: Capitol, Titlu, și selectează video!');
                                  return;
                                }

                                try {
                                  await handleUploadLessonVideo(
                                    editingCourse.id,
                                    chapterInput.value,
                                    titleInput.value,
                                    videoFile,
                                    thumbnailFile
                                  );
                                  chapterInput.value = '';
                                  titleInput.value = '';
                                  videoInput.value = '';
                                  thumbnailInput.value = '';
                                } catch (err) {
                                  console.error('Upload fail:', err);
                                }
                              }}
                              className="w-full px-3 py-2 bg-[#FF5530] hover:bg-[#FF5530] rounded text-sm font-medium transition-all"
                            >
                              ✅ Salvează Lecția
                            </button>
                          </div>
                        </div>

                        {/* Chapters Display */}
                        {chaptersData[editingCourse.id] && Object.keys(chaptersData[editingCourse.id]).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(chaptersData[editingCourse.id]).map(([chapterName, lessons]: [string, any]) => {
                              const expandKey = `form-${editingCourse.id}-${chapterName}`;
                              const isExpanded = expandedChapters.has(expandKey);
                              return (
                                <div key={chapterName} className="border border-white/10 rounded-lg bg-white/5 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newExp = new Set(expandedChapters);
                                      if (isExpanded) newExp.delete(expandKey);
                                      else newExp.add(expandKey);
                                      setExpandedChapters(newExp);
                                    }}
                                    className="w-full flex items-center justify-between p-3 hover:bg-white/5"
                                  >
                                    <span className="text-sm font-semibold">{chapterName}</span>
                                    <span className="text-xs bg-[#002147]/40 px-2 py-1 rounded">{lessons?.length || 0} lecții</span>
                                  </button>
                                  
                                  {isExpanded && (
                                    <div className="border-t border-white/10 p-3 space-y-2 bg-white/5">
                                      {lessons?.map((lesson: any, idx: number) => (
                                        <div key={lesson._id || lesson.id || idx} className="text-xs p-2 bg-white/5 rounded flex justify-between items-start gap-2">
                                          <div className="flex-1">
                                            <p className="text-white font-medium">{lesson.title}</p>
                                            <div className="flex gap-3 mt-1 text-gray-400 text-xs">
                                              {lesson.video?.url ? <span className="text-[#FF5530]">✓ Video</span> : <span className="text-yellow-400">⚠ No video</span>}
                                              {lesson.thumbnail?.url ? <span className="text-[#FF5530]">✓ Thumbnail</span> : <span className="text-yellow-400">⚠ No thumb</span>}
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (confirm('Șterge "' + lesson.title + '"?')) {
                                                try {
                                                  const token = localStorage.getItem('authToken');
                                                  await fetch(
                                                    `${API_BASE_URL}/courses/admin/${editingCourse.id}/lessons/${lesson._id || lesson.id}`,
                                                    { method: 'DELETE', headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } }
                                                  );
                                                  await loadCourseLessons(editingCourse.id);
                                                  alert('✅ Șters!');
                                                } catch (err) {
                                                  alert('❌ Eroare');
                                                }
                                              }
                                            }}
                                            className="text-[#FF5530] hover:text-[#B54236] px-2 py-1 bg-[#FF5530]/20 rounded whitespace-nowrap"
                                          >
                                            Șterge
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-xs py-4">
                            📭 Fără capitole. Adaugă lecție mai sus!
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quiz Editor */}
                  <div className="border border-white/10 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowQuizEditor(!showQuizEditor)}
                      className="w-full px-4 py-3 bg-white/5 flex justify-between items-center hover:bg-white/10 transition-all"
                    >
                      <span>Quiz Questions ({formData.quizQuestions?.length || 0})</span>
                      {showQuizEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showQuizEditor && (
                      <div className="p-4 space-y-4">
                        {(formData.quizQuestions || []).map((q, qIdx) => (
                          <div key={qIdx} className="bg-white/5 p-4 rounded-lg space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Question {qIdx + 1}</span>
                              <button onClick={() => removeQuizQuestion(qIdx)} className="text-[#FF5530]">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Question text"
                              value={q.question}
                              onChange={(e) => updateQuizQuestion(qIdx, 'question', e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct-${qIdx}`}
                                    checked={q.correctAnswer === optIdx}
                                    onChange={() => updateQuizQuestion(qIdx, 'correctAnswer', optIdx)}
                                    className="accent-green-500"
                                  />
                                  <input
                                    type="text"
                                    placeholder={`Option ${optIdx + 1}`}
                                    value={opt}
                                    onChange={(e) => updateQuizQuestion(qIdx, 'option', { optionIndex: optIdx, text: e.target.value })}
                                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addQuizQuestion}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30"
                        >
                          <Plus className="w-4 h-4" /> Add Question
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info Content */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Additional Info Content</label>
                    <textarea
                      placeholder="Extra information to show in the Info tab..."
                      value={formData.infoContent}
                      onChange={(e) => handleInfoContentChange(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg min-h-[80px]"
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-4 items-center">
                    <button
                      onClick={isEditMode ? handleUpdateCourse : handleAddCourse}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
                    >
                      <Save className="w-5 h-5" />
                      {isEditMode ? 'Update Course' : 'Save Course'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-6 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    {videoUploadProgress && (
                      <span className="text-yellow-400 text-sm font-medium animate-pulse">{videoUploadProgress}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Broken Images Section */}
            {showBrokenCourses && brokenImageCourses.length > 0 && (
                              <div className="bg-[#FF5530]/20 border border-[#FF5530]/50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-[#FF5530]" />
                    <div>
                      <h3 className="text-lg font-semibold text-[#FF5530]">⚠ Cursuri cu imagini rupte</h3>
                      <p className="text-sm text-[#FF5530]/80">{brokenImageCourses.length} cursuri detectate</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBrokenCourses(false)}
                    className="text-[#FF5530] hover:text-[#B54236]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {brokenImageCourses.map((course) => (
                    <div key={course.id} className="bg-[#FF5530]/10 p-3 rounded flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{course.title}</p>
                        <p className="text-xs text-[#FF5530]/80">
                          {course.thumbnail ? '❌ Imagine inaccesibilă' : '❌ Fără imagine'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="px-3 py-1 bg-[#B54236] hover:bg-[#B54236] text-white text-sm rounded transition-all"
                      >
                        Șterge
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={deleteAllBrokenCourses}
                    className="flex-1 px-4 py-2 bg-[#B54236] hover:bg-[#B54236] text-white rounded-lg transition-all font-medium"
                  >
                    🗑️ Șterge toate ({brokenImageCourses.length})
                  </button>
                  <button
                    onClick={() => setShowBrokenCourses(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            )}

            {/* Course List - 3 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <AdminCourseCard
                  key={course.id}
                  course={course}
                  onEdit={openEditModal}
                  onCreateReel={onCreateReel}
                  onDelete={handleDeleteCourse}
                  isExpanded={allCardsExpanded}
                  onToggleExpand={() => setAllCardsExpanded(!allCardsExpanded)}
                />
              ))}
            </div>

            {/* CHAPTERS & LESSONS MANAGEMENT SECTION */}
            <div className="mt-12 border-t border-white/10 pt-8">
              <h2 className="text-2xl mb-2">📖 Capitole și Lecții cu Videouri</h2>
              <p className="text-gray-400 mb-6">Organizează și încarcă videouri pentru fiecare lecție pe capitole</p>

              <div className="grid grid-cols-1 gap-6">
                {courses.map((course) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-6 border border-white/10"
                  >
                    {/* Course Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold">{course.title}</h3>
                        <p className="text-sm text-gray-400">Instructor: {course.instructor}</p>
                      </div>
                      <button
                        onClick={() => {
                          loadCourseLessons(course.id);
                        }}
                        disabled={loadingLessons.has(course.id)}
                        className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all disabled:opacity-50"
                      >
                        {loadingLessons.has(course.id) ? 'Se încarcă...' : '🔄 Reîncarcă'}
                      </button>
                    </div>

                    {/* Add New Lesson (with chapter selection) */}
                    <div className="mb-6 p-4 bg-[#FF5530]/10 border border-[#FF5530]/20 rounded-lg">
                      <label className="block text-sm text-gray-300 mb-3 font-semibold">➕ Adaugă Lecție Nouă:</label>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Capitol (ex: Capitol 1 - Fundamentals)"
                          id={`chapter-name-${course.id}`}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Titlu lecție (ex: Lecția 1.1 - Introducere)"
                          id={`lesson-title-${course.id}`}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FF5530]/50 text-sm"
                        />
                        <label className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FF5530] hover:bg-green-700 cursor-pointer rounded-lg transition-all text-sm font-medium">
                          <Video className="w-4 h-4" />
                          Upload Video pentru Lecție
                          <input
                            type="file"
                            accept="video/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              const chapterInput = document.getElementById(`chapter-name-${course.id}`) as HTMLInputElement;
                              const titleInput = document.getElementById(`lesson-title-${course.id}`) as HTMLInputElement;
                              const chapterName = chapterInput?.value.trim();
                              const lessonTitle = titleInput?.value.trim();
                              
                              if (!file) {
                                alert('Te rog selectează un video');
                                return;
                              }
                              if (!chapterName) {
                                alert('Te rog specifică un capitol');
                                return;
                              }
                              if (!lessonTitle) {
                                alert('Te rog dal un titlu lecției');
                                return;
                              }
                              
                              try {
                                await handleUploadLessonVideo(course.id, chapterName, lessonTitle, file);
                                chapterInput.value = '';
                                titleInput.value = '';
                                e.target.value = '';
                              } catch (err) {
                                console.error('Lesson upload failed:', err);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Chapters with Lessons */}
                    {chaptersData[course.id] && Object.keys(chaptersData[course.id]).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(chaptersData[course.id]).map(([chapterName, lessons]: [string, any]) => {
                          const isExpanded = expandedChapters.has(`${course.id}-${chapterName}`);
                          return (
                            <motion.div
                              key={chapterName}
                              className="border border-white/10 rounded-lg overflow-hidden bg-white/5"
                            >
                              {/* Chapter Header */}
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedChapters);
                                  if (isExpanded) {
                                    newExpanded.delete(`${course.id}-${chapterName}`);
                                  } else {
                                    newExpanded.add(`${course.id}-${chapterName}`);
                                  }
                                  setExpandedChapters(newExpanded);
                                }}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                  <span className="font-semibold text-white">{chapterName}</span>
                                  <span className="text-xs bg-[#002147]/40 px-2 py-1 rounded">{lessons?.length || 0} lecții</span>
                                </div>
                              </button>

                              {/* Chapter Content */}
                              {isExpanded && (
                                <div className="border-t border-white/10 p-4 space-y-3">
                                  {lessons && lessons.length > 0 ? (
                                    lessons.map((lesson: any, idx: number) => (
                                      <motion.div
                                        key={lesson._id || lesson.id || idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-3 bg-white/5 rounded-lg flex items-start justify-between"
                                      >
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-white">{lesson.title}</p>
                                          <div className="flex gap-4 text-xs text-gray-400 mt-2">
                                            {lesson.video?.url && (
                                              <span className="text-[#FF5530] flex items-center gap-1">
                                                <Video className="w-3 h-3" /> Video OK
                                              </span>
                                            )}
                                            {lesson.thumbnail?.url && (
                                              <span className="text-blue-400 flex items-center gap-1">
                                                <Image className="w-3 h-3" /> Thumbnail OK
                                              </span>
                                            )}
                                            {!lesson.video?.url && (
                                              <span className="text-yellow-400">⚠ Fără video</span>
                                            )}
                                          </div>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            if (confirm('Ești sigur că vrei să ștergi "' + lesson.title + '"?')) {
                                              try {
                                                const token = localStorage.getItem('authToken');
                                                await fetch(
                                                  `${API_BASE_URL}/courses/admin/${course.id}/lessons/${lesson._id || lesson.id}`,
                                                  {
                                                    method: 'DELETE',
                                                    headers: {
                                                      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                                                    }
                                                  }
                                                );
                                                await loadCourseLessons(course.id);
                                                alert('✅ Lecția ștearsă!');
                                              } catch (err) {
                                                alert('❌ Eroare la ștergere');
                                              }
                                            }
                                          }}
                                          className="text-[#FF5530] hover:text-[#B54236] text-xs px-2 py-1 bg-[#FF5530]/20 hover:bg-[#FF5530]/40 rounded transition-all"
                                        >
                                          Șterge
                                        </button>
                                      </motion.div>
                                    ))
                                  ) : (
                                    <div className="text-center text-gray-400 text-sm py-4">
                                      Nu sunt lecții în acest capitol
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-400 text-sm bg-white/5 rounded-lg border border-white/10">
                        <p>📭 Nu sunt capitole pentru acest curs.</p>
                        <p className="mt-2 text-xs">Adaugă o lecție mai sus și o vei vedea organizată în capitole!</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reels Tab */}
        {activeTab === 'reels' && (
          <div className="space-y-6">
            <div className="glass-effect rounded-xl p-6 border border-white/10">
              <p className="text-gray-400">
                Pentru a crea un reel, mergi la tab-ul Courses și apasă pe "Reel" pentru cursul dorit.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {reels.map((reel) => (
                <motion.div
                  key={reel.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group"
                >
                  <div className="relative aspect-[9/16] rounded-xl overflow-hidden card-shadow">
                    <img src={reel.thumbnail} alt={reel.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-sm mb-1 line-clamp-2">{reel.title}</p>
                      <p className="text-xs text-gray-400">{reel.creator}</p>
                    </div>
                    {/* Edit Button */}
                    <button
                      onClick={() => setEditingReel(reel)}
                      className="absolute top-2 right-12 w-8 h-8 bg-[#002147] hover:bg-[#003366] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteReel(reel.id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-[#B54236] hover:bg-[#B54236] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Media Management Tab */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            <div className="mb-8">
              <h2 className="text-xl mb-2">Image Management</h2>
              <p className="text-gray-400">Upload thumbnails stored in MongoDB Atlas</p>
            </div>

            <div>
              <h3 className="text-lg mb-4">Course Thumbnails</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-4 border border-white/10"
                  >
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full aspect-video object-cover rounded-lg mb-3"
                    />
                    <h4 className="text-sm font-semibold line-clamp-1 mb-2">{course.title}</h4>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#002147] hover:bg-[#003366] rounded-lg transition-all cursor-pointer text-sm justify-center">
                      <Image className="w-4 h-4" />
                      {uploadingCourseId === course.id ? 'Uploading...' : 'Upload Image'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadCourseThumbnail(course.id, file);
                        }}
                        disabled={uploadingCourseId === course.id}
                        className="hidden"
                      />
                    </label>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg mb-4">Reel Thumbnails</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {reels.map((reel) => (
                  <motion.div
                    key={reel.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-3 border border-white/10"
                  >
                    <img
                      src={reel.thumbnail}
                      alt={reel.title}
                      className="w-full aspect-[9/16] object-cover rounded-lg mb-2"
                    />
                    <p className="text-xs line-clamp-1 mb-2">{reel.title}</p>
                    <label className="flex items-center justify-center gap-1 px-2 py-1 bg-[#002147] hover:bg-[#003366] rounded text-xs cursor-pointer transition-all">
                      <Image className="w-3 h-3" />
                      {uploadingReelId === reel.id ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadReelThumbnail(reel.id, file);
                        }}
                        disabled={uploadingReelId === reel.id}
                        className="hidden"
                      />
                    </label>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )
        }

        {/* Videos Tab */}
        {activeTab === 'videos' && <AdminVideoManagement />}

        {/* Users Tab */}
        {activeTab === 'users' && <AdminUserManagement />}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && <AdminAnalyticsDashboard />}

        {/* Speakers Tab */}
        {activeTab === 'speakers' && <AdminSpeakersManager />}

        {/* Packages Tab */}
        {activeTab === 'packages' && <AdminPackagesManager courses={courses} setCourses={setCourses} />}
      </motion.div >

      {/* Reel Editor Modal */}
      {editingReel && (() => {
        const reelCourse = courses.find(c => c.id === editingReel.courseId);
        if (!reelCourse) {
          // Create a dummy course with the reel's video URL for editing
          const dummyCourse: Course = {
            id: editingReel.courseId || editingReel.id,
            title: editingReel.title,
            instructor: editingReel.creator,
            thumbnail: editingReel.thumbnail,
            videoUrl: editingReel.videoUrl || '',
            category: '',
            duration: '',
            rating: 0,
            students: 0,
            description: '',
            tags: editingReel.tags || [],
            lessons: 0,
            enrolled: false,
            progress: 0
          };
          return (
            <ReelCreator
              course={dummyCourse}
              editReel={editingReel}
              onClose={() => setEditingReel(null)}
              onSave={() => { }}
              onUpdate={handleUpdateReel}
            />
          );
        }
        return (
          <ReelCreator
            course={reelCourse}
            editReel={editingReel}
            onClose={() => setEditingReel(null)}
            onSave={() => { }}
            onUpdate={handleUpdateReel}
          />
        );
      })()}
    </div >
  );
}