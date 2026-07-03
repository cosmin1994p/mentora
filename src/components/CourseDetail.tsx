import { X, Play, Plus, ThumbsUp, ThumbsDown, Volume2, VolumeX, Check } from 'lucide-react';
import { Course } from '../App';
import { motion } from 'motion/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { QuizModal } from './QuizModal';
import { toast } from 'sonner';
import Hls from 'hls.js';
import { apiService } from '../utils/api';

import { BASE_URL } from '../config';

interface CourseDetailProps {
  course: Course;
  onClose: () => void;
  onPlay: (course: Course) => void;
  onEnroll: (courseId: string) => void;
  onLikeCourse?: (courseId: string) => void;
  onDislikeCourse?: (courseId: string) => void;
  onQuizComplete?: (courseId: string, passed: boolean) => void;
}

export function CourseDetail({ course, onClose, onPlay, onEnroll, onLikeCourse, onDislikeCourse, onQuizComplete }: CourseDetailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeTab, setActiveTab] = useState<'episodes' | 'info' | 'quiz'>('episodes');
  const [showQuiz, setShowQuiz] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const bestLessonCountRef = useRef(0);

  const isValidMongoId = (value: unknown) => /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());

  const toAbsoluteUrl = (url?: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${BASE_URL}${url}`;
  };

  const courseLessons = lessons.length > 0
    ? lessons
    : ((course as any).lessonsArray || (course as any).lessonsData || []);

  const firstLesson = courseLessons[0];
  const previewHlsUrl =
    toAbsoluteUrl(firstLesson?.video?.hlsUrl || firstLesson?.hlsUrl) ||
    toAbsoluteUrl((course as any).hlsUrl);
  const previewVideoUrl =
    toAbsoluteUrl(firstLesson?.video?.url || firstLesson?.videoUrl) ||
    (course.videoUrl || null);

  // Helper: try to play, if blocked (mobile), retry muted
  const tryAutoplay = (video: HTMLVideoElement) => {
    video.play().catch(() => {
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => { });
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (previewHlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        startLevel: 0, // Start at lowest quality for instant preview
        capLevelToPlayerSize: true,
      });
      hls.loadSource(previewHlsUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        tryAutoplay(video);
        setShowVideo(true);
      });

      // Handle HLS errors - fallback to MP4
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('[CourseDetail HLS] Fatal error, falling back to MP4:', data.type);
          hls.destroy();
          hlsRef.current = null;
          // Fall back to video URL
          if (previewVideoUrl) {
            video.src = previewVideoUrl;
            tryAutoplay(video);
            setShowVideo(true);
          }
        }
      });
    } else if (previewHlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari
      video.src = previewHlsUrl;
      video.addEventListener('canplay', () => {
        tryAutoplay(video);
        setShowVideo(true);
      }, { once: true });
      video.addEventListener('error', () => {
        // HLS failed on Safari - try fallback
        if (previewVideoUrl) {
          video.src = previewVideoUrl;
          tryAutoplay(video);
          setShowVideo(true);
        }
      }, { once: true });
    } else if (previewVideoUrl) {
      // Fallback
      video.src = previewVideoUrl;
      tryAutoplay(video);
      setShowVideo(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [course.id, previewHlsUrl, previewVideoUrl]);

  // Fetch lessons from API
  useEffect(() => {
    let isDisposed = false;

    const fetchLessons = async (showLoading = true) => {
      if (!isValidMongoId(course.id)) {
        setLessons((course as any).lessonsArray || (course as any).lessonsData || []);
        if (showLoading) {
          setLessonsLoading(false);
        }
        return;
      }

      try {
        if (showLoading) {
          setLessonsLoading(true);
        }
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
          fetch(`${BASE_URL}/api/courses/v2/${course.id}/lessons`, { headers }),
          fetch(`${BASE_URL}/api/courses/v2/${course.id}`, { headers }),
          fetch(`${BASE_URL}/api/courses/admin/${course.id}/lessons`, { headers })
        ]);

        const sourceLists: any[][] = [];

        const sortLessons = (items: any[]) => {
          return [...items].sort((a: any, b: any) => {
            const aChapter = Number.isFinite(a?.chapter?.order) ? a.chapter.order : 9999;
            const bChapter = Number.isFinite(b?.chapter?.order) ? b.chapter.order : 9999;
            if (aChapter !== bChapter) return aChapter - bChapter;

            const aOrder = Number.isFinite(a?.order) ? a.order : 9999;
            const bOrder = Number.isFinite(b?.order) ? b.order : 9999;
            return aOrder - bOrder;
          });
        };

        const mergeByStableKey = (lists: any[][]) => {
          const merged = new Map<string, any>();

          lists.forEach((list, sourceIdx) => {
            list.forEach((lesson: any, idx: number) => {
              const rawId = lesson?._id || lesson?.id;
              const stableId = rawId ? String(rawId) : '';
              const syntheticId = `src-${sourceIdx}-idx-${idx}-${lesson?.title || 'untitled'}-${lesson?.order || 'na'}`;
              const key = stableId || syntheticId;
              
              const existing = merged.get(key);
              if (existing) {
                merged.set(key, {
                  ...existing,
                  ...lesson,
                  chapter: lesson?.chapter || existing?.chapter,
                  thumbnail: lesson?.thumbnail || existing?.thumbnail
                });
              } else {
                merged.set(key, lesson);
              }
            });
          });

          return Array.from(merged.values());
        };

        if (lessonsRes.ok) {
          const payload = await lessonsRes.json();
          sourceLists.push(normalizeList(payload));
        }

        if (detailRes.ok) {
          const payload = await detailRes.json();
          sourceLists.push(normalizeList(payload));
        }

        if (adminLessonsRes.ok) {
          const payload = await adminLessonsRes.json();
          sourceLists.push(normalizeList(payload));
        }

        const mergedLessons = mergeByStableKey(sourceLists);
        const maxSourceLen = sourceLists.reduce((max, list) => Math.max(max, list.length), 0);

        // Safety net: if dedupe ever undercounts, prefer the largest source list.
        const finalLessons = mergedLessons.length >= maxSourceLen
          ? mergedLessons
          : sourceLists.find((list) => list.length === maxSourceLen) || mergedLessons;

        const allLessons = sortLessons(finalLessons);

        if (allLessons.length === 0) {
          throw new Error('No lessons returned from APIs');
        }

        if (!isDisposed) {
          if (allLessons.length >= bestLessonCountRef.current) {
            bestLessonCountRef.current = allLessons.length;
            setLessons(allLessons);
          } else {
            console.warn('Ignoring smaller lessons snapshot:', allLessons.length, 'current best:', bestLessonCountRef.current);
          }
        }
        console.log('✓ Loaded merged lessons:', allLessons.length);
      } catch (error) {
        console.warn('Failed to fetch lessons, using course data:', error);
        // Fall back to lessonsArray/lessonsData from course object
        if (!isDisposed) {
          setLessons((course as any).lessonsArray || (course as any).lessonsData || []);
        }
      } finally {
        if (showLoading && !isDisposed) {
          setLessonsLoading(false);
        }
      }
    };

    bestLessonCountRef.current = 0;
    setLessons([]);

    let pollingTimer: ReturnType<typeof setInterval> | null = null;
    let pollingStopTimer: ReturnType<typeof setTimeout> | null = null;

    if (course.id) {
      fetchLessons(true);

      // Lessons can be uploaded right after course creation; poll briefly to catch late arrivals.
      pollingTimer = setInterval(() => {
        fetchLessons(false);
      }, 2500);

      pollingStopTimer = setTimeout(() => {
        if (pollingTimer) {
          clearInterval(pollingTimer);
          pollingTimer = null;
        }
      }, 30000);
    }

    return () => {
      isDisposed = true;
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
      if (pollingStopTimer) {
        clearTimeout(pollingStopTimer);
      }
    };
  }, [course.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || (!previewVideoUrl && !previewHlsUrl)) return;

    const handleCanPlay = () => {
      video.muted = isMuted;
      video.volume = 1;
      video.play().catch(() => {
        // Mobile blocked unmuted autoplay — retry muted
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => { });
      });
    };

    // If already ready, play immediately
    if (video.readyState >= 3) {
      handleCanPlay();
    } else {
      video.addEventListener('canplay', handleCanPlay, { once: true });
    }

    // Cleanup fade interval on unmount
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, [previewVideoUrl, previewHlsUrl, isMuted]);

  // Update video muted state when isMuted changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, course.videoUrl]);

  // Handle video time update - fade volume at 12 seconds, pause at 15 seconds
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    const currentTime = videoRef.current.currentTime;

    // Start volume fade at 12 seconds (3 seconds before end)
    if (currentTime >= 12 && currentTime < 15 && !fadeIntervalRef.current && !isMuted) {
      setIsTransitioning(true);
      const startVolume = videoRef.current.volume;
      const fadeSteps = 30; // 30 steps over 3 seconds = 100ms per step
      let step = 0;

      fadeIntervalRef.current = setInterval(() => {
        step++;
        const newVolume = Math.max(0, startVolume * (1 - step / fadeSteps));
        if (videoRef.current) {
          videoRef.current.volume = newVolume;
        }
        if (step >= fadeSteps && fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      }, 100);
    }

    // Pause video at 15 seconds
    if (currentTime >= 15) {
      videoRef.current.pause();
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }
  };

  // Calculate like percentage
  const likes = (course as any).likesCount || 0;
  const dislikes = (course as any).dislikesCount || 0;
  const totalVotes = likes + dislikes;
  const likePercentage = totalVotes > 0 ? Math.round((likes / totalVotes) * 100) : 0;

  // Determine color based on percentage
  const getPercentageColor = () => {
    if (likePercentage > 50) return 'text-[#FF5530]';
    if (likePercentage >= 30) return 'text-[#FF5530]';
    return 'text-[#B54236]';
  };

  const handleEnrollAndPlay = () => {
    if (!course.enrolled) {
      onEnroll(course.id);
      toast.success('Curs adăugat în lista ta!', {
        description: course.title,
        duration: 3000,
      });
    }

    const playbackCourse: Course = {
      ...course,
      videoUrl: previewVideoUrl || course.videoUrl,
      hlsUrl: previewHlsUrl || (course as any).hlsUrl
    };

    onPlay(playbackCourse);

    if (!isValidMongoId(course.id)) {
      setLessons((course as any).lessonsArray || (course as any).lessonsData || []);
      return;
    }

    onClose();
  };

  const handleEnrollOnly = () => {
    onEnroll(course.id);
    toast.success('Added to My List!', {
      description: `${course.title} has been added to your courses`,
      duration: 3000,
    });
  };

  const handleLike = () => {
    if (hasDisliked) {
      setHasDisliked(false);
    }
    setHasLiked(!hasLiked);
    if (!hasLiked) {
      onLikeCourse?.(course.id);
      toast.success('Added to Liked Courses!', {
        description: `${course.title} has been added to your liked courses`,
        duration: 3000,
      });
    }
  };

  const handleDislike = () => {
    if (hasLiked) {
      setHasLiked(false);
    }
    setHasDisliked(!hasDisliked);
    if (!hasDisliked) {
      onDislikeCourse?.(course.id);
    }
  };

  const getLessonPlayable = (lesson: any) => {
    const lessonHls = toAbsoluteUrl(lesson?.video?.hlsUrl || lesson?.hlsUrl);
    const lessonMp4 = toAbsoluteUrl(lesson?.video?.url || lesson?.videoUrl);
    return { lessonHls, lessonMp4 };
  };

  const handlePlayLesson = (lesson: any) => {
    const { lessonHls, lessonMp4 } = getLessonPlayable(lesson);
    const playableUrl = lessonMp4 || previewVideoUrl;
    const playableHls = lessonHls || previewHlsUrl;

    const playbackCourse: Course = {
      ...course,
      videoUrl: playableUrl || undefined,
      hlsUrl: playableHls || undefined,
      forceDirectPlayback: true,
      title: lesson?.title ? `${course.title} - ${lesson.title}` : course.title
    };

    if (!course.enrolled) {
      onEnroll(course.id);
    }

    onPlay(playbackCourse);
    onClose();
  };

  // Get lessons data - use fetched lessons first, then fall back to course data
  const lessonsData = lessons.length > 0
    ? lessons
    : ((course as any).lessonsArray || (course as any).lessonsData || []);
  const hasManualLessons = lessonsData.length > 0;

  const chapterGroups = useMemo(() => {
    const groups = new Map<string, { chapterName: string; chapterOrder: number; lessons: any[] }>();

    lessonsData.forEach((lesson: any, idx: number) => {
      const chapterName = String(lesson?.chapter?.name || '').trim() || 'Capitol 1';
      const chapterOrder = Number.isFinite(lesson?.chapter?.order) ? lesson.chapter.order : 1;

      if (!groups.has(chapterName)) {
        groups.set(chapterName, { chapterName, chapterOrder, lessons: [] });
      }

      groups.get(chapterName)?.lessons.push({
        ...lesson,
        __fallbackOrder: idx + 1
      });
    });

    const sortedGroups = Array.from(groups.values())
      .sort((a, b) => a.chapterOrder - b.chapterOrder)
      .map(group => ({
        ...group,
        lessons: group.lessons.sort((a, b) => {
          const aOrder = Number.isFinite(a?.order) ? a.order : a.__fallbackOrder;
          const bOrder = Number.isFinite(b?.order) ? b.order : b.__fallbackOrder;
          return aOrder - bOrder;
        })
      }));

    return sortedGroups;
  }, [lessonsData]);
  const chapterCount = chapterGroups.length;

  return (
    <div className="fixed inset-0 bg-[#002147] z-50 overflow-y-auto animate-fadeIn">
      <div className="relative">
        {/* Hero Section with Video Preview */}
        <div className="relative h-[100vh]">
          <div className="absolute inset-0">
            {/* Background Image (fallback) */}
            <img
              src={course.thumbnail}
              alt={course.title}
              className={`w-full h-full object-cover transition-opacity duration-500 ${showVideo && course.videoUrl ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Video Preview - Auto-plays first 10 seconds */}
            {(previewVideoUrl || previewHlsUrl) && (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onError={() => setShowVideo(false)}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#002147] via-[#002147]/50 to-transparent"></div>

            {/* Netflix-style transition overlay - appears when preview is ending */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-[#002147] via-[#002147]/80 to-[#002147]/40 transition-opacity duration-1000 ${isTransitioning ? 'opacity-100' : 'opacity-0'
                }`}
              style={{
                boxShadow: isTransitioning ? 'inset 0 0 100px 50px rgba(0,0,0,0.8)' : 'none',
              }}
            />
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 w-9 h-9 bg-[#000000] hover:bg-[#000000]/80 rounded-full flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-32 left-0 right-0 px-4 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="mb-6 text-shadow-netflix max-w-2xl">{course.title}</h1>

              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleEnrollAndPlay}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded hover:bg-white/90 transition-all text-xl font-semibold"
                >
                  <Play className="w-7 h-7 fill-current" />
                  {course.enrolled ? 'Play' : 'Start Course'}
                </button>
                {!course.enrolled ? (
                  <button
                    onClick={handleEnrollOnly}
                    className="flex items-center justify-center px-6 py-3 bg-[#002147]/60 hover:bg-[#002147] rounded transition-all border-2 border-gray-500 text-lg font-semibold"
                  >
                    <Plus className="w-7 h-7 mr-2" />
                    Add to My List
                  </button>
                ) : (
                  <button className="flex items-center justify-center px-6 py-3 bg-[#002147]/60 border-2 border-[#FF5530] rounded transition-all text-lg font-semibold">
                    <Check className="w-7 h-7 mr-2 text-[#FF5530]" />
                    In My List
                  </button>
                )}

                {/* Like Button */}
                <button
                  onClick={handleLike}
                  className={`flex items-center justify-center w-12 h-12 rounded-full transition-all border-2 ${hasLiked
                    ? 'bg-[#FF5530] border-[#FF5530]'
                    : 'bg-[#002147]/60 hover:bg-[#002147] border-gray-500'
                    }`}
                >
                  <ThumbsUp className={`w-6 h-6 ${hasLiked ? 'fill-current' : ''}`} />
                </button>

                {/* Dislike Button */}
                <button
                  onClick={handleDislike}
                  className={`flex items-center justify-center w-12 h-12 rounded-full transition-all border-2 ${hasDisliked
                    ? 'bg-[#B54236] border-[#FF5530]'
                    : 'bg-[#002147]/60 hover:bg-[#002147] border-gray-500'
                    }`}
                >
                  <ThumbsDown className={`w-6 h-6 ${hasDisliked ? 'fill-current' : ''}`} />
                </button>

                {/* Like Percentage Display */}
                {totalVotes > 0 && (
                  <div className={`flex items-center justify-center px-4 py-2 bg-[#002147]/60 rounded-full ${getPercentageColor()} font-bold text-lg`}>
                    {likePercentage}% liked
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm md:text-base mb-4">
                <span className="text-[#FF5530] font-semibold">{(course.rating * 20).toFixed(0)}% Match</span>
                <span>{new Date().getFullYear()}</span>
                <span className="border border-gray-400 px-2 py-0.5 text-xs">HD</span>
                <span>{chapterCount} Chapters</span>
                <span>{lessonsData.length} Lessons</span>
              </div>

              <p className="max-w-2xl text-gray-300 mb-6 line-clamp-3">{course.title}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {course.tags?.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-white/10 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-32 right-8 w-10 h-10 bg-[#002147]/60 hover:bg-[#002147] rounded-full flex items-center justify-center transition-all border border-gray-500"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Content Section */}
        <div className="px-4 md:px-12 py-8 bg-[#002147]">
          {/* Tabs */}
          <div className="flex gap-8 border-b border-gray-700 mb-8">
            <button
              onClick={() => setActiveTab('episodes')}
              className={`pb-4 text-lg font-semibold transition-all ${activeTab === 'episodes'
                ? 'text-white border-b-4 border-[#FF5530]'
                : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              Chapters
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-4 text-lg font-semibold transition-all ${activeTab === 'info'
                ? 'text-white border-b-4 border-[#FF5530]'
                : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              Info
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`pb-4 text-lg font-semibold transition-all ${activeTab === 'quiz'
                ? 'text-white border-b-4 border-[#FF5530]'
                : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              Quiz
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'episodes' && (
            <div className="space-y-3 max-w-4xl">
              {/* Only show lessons if manually added */}
              {hasManualLessons ? (
                chapterGroups.map((group) => (
                  <div key={group.chapterName} className="space-y-2 bg-white/[0.03] rounded-lg p-3 border border-white/10">
                    <div className="px-2 py-1 text-sm font-semibold text-blue-300 border-b border-white/10">
                      Chapter: {group.chapterName} ({group.lessons.length} lecții)
                    </div>
                    {group.lessons.map((lesson: any, i: number) => (
                      <motion.div
                        key={lesson._id || lesson.id || `${group.chapterName}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex gap-4 p-4 bg-[#002147] hover:bg-[#002147] rounded transition-all cursor-pointer group"
                        onClick={() => handlePlayLesson(lesson)}
                      >
                        <div className="relative flex-shrink-0 w-32 aspect-video rounded overflow-hidden">
                          <img src={lesson?.thumbnail?.url || course.thumbnail} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-[#002147]/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <Play className="w-6 h-6 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg font-semibold">{Number.isFinite(lesson?.order) ? lesson.order : i + 1}</span>
                              <h3 className="text-base">{lesson.title || `Lesson ${i + 1}`}</h3>
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {lesson.description || ''}
                            </p>
                          </div>
                          <span className="text-gray-400 text-sm">
                            {lesson.startTime ? `${Math.floor(lesson.startTime / 60)}:${(lesson.startTime % 60).toString().padStart(2, '0')}` : ''}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">Nu există chapters/lecții adăugate pentru acest curs.</p>
                  <p className="text-gray-500 text-sm mt-2">Chapter-ele și lecțiile vor fi adăugate de administrator.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="max-w-4xl space-y-8">
              <div>
                <h2 className="mb-4">Despre {course.title}</h2>
                <p className="text-gray-300 leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Custom Info Content */}
              {(course as any).infoContent && (
                <div className="bg-[#002147] p-6 rounded-lg">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {(course as any).infoContent}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="mb-4">Instructor</h3>
                  <div className="flex items-center gap-4">
                    {(course as any).instructorImage ? (
                      <img
                        src={(course as any).instructorImage}
                        alt={course.instructor}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-[#FF5530] to-[#B54236] rounded-full flex items-center justify-center text-2xl">
                        {course.instructor?.charAt(0) || 'I'}
                      </div>
                    )}
                    <div>
                      <h4>{course.instructor}</h4>
                      <p className="text-gray-400">Expert {course.category}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4">Detalii</h3>
                  <div className="space-y-2 text-gray-300">
                    <p><span className="text-gray-500">Categorie:</span> {course.category}</p>
                    <p><span className="text-gray-500">Durată:</span> {course.duration}</p>
                    <p><span className="text-gray-500">Lessons:</span> {hasManualLessons ? lessonsData.length : 'Nicio lecție adăugată'}</p>
                    <p><span className="text-gray-500">Cursanți:</span> {course.students.toLocaleString()}</p>
                    {totalVotes > 0 && (
                      <p>
                        <span className="text-gray-500">Rating comunitate:</span>{' '}
                        <span className={getPercentageColor()}>{likePercentage}% liked</span>
                        <span className="text-gray-500 text-sm ml-2">({totalVotes} voturi)</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {course.tags?.map((tag) => (
                    <span key={tag} className="px-4 py-2 bg-white/10 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center py-12 glass-effect rounded-xl p-8">
                <h2 className="mb-4">Quiz Final</h2>
                <p className="text-gray-400 mb-6">
                  Testează-ți cunoștințele dobândite în acest curs!
                </p>
                {course.enrolled && course.progress && course.progress >= 90 ? (
                  <button
                    onClick={() => setShowQuiz(true)}
                    className="px-8 py-3 bg-[#FF5530] hover:bg-[#B54236] text-white rounded transition-all font-semibold"
                  >
                    Începe Quiz-ul
                  </button>
                ) : !course.enrolled ? (
                  <div className="space-y-4">
                    <p className="text-yellow-500">
                      Trebuie să te înscrii la curs pentru a accesa quiz-ul.
                    </p>
                    <button
                      onClick={() => {
                        onEnroll(course.id);
                        setActiveTab('episodes');
                      }}
                      className="px-8 py-3 bg-[#FF5530] hover:bg-[#FF5530] text-white rounded transition-all font-semibold"
                    >
                      Înscrie-te la Curs
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-yellow-500">
                      Trebuie să completezi cel puțin 90% din curs pentru a debloca quiz-ul.
                    </p>
                    <div className="max-w-md mx-auto">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progres actual</span>
                        <span>{course.progress || 0}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF5530]"
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showQuiz && (
        <QuizModal
          course={course}
          onClose={() => setShowQuiz(false)}
          onQuizComplete={(passed) => {
            if (onQuizComplete) {
              onQuizComplete(course.id, passed);
            }
            setShowQuiz(false);
          }}
        />
      )}
    </div>
  );
}