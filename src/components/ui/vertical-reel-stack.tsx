"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, type PanInfo } from "motion/react"
import { Reel, Course } from '../../App'
import { Heart, MessageCircle, Share2, PlayCircle, Play, Pause, Clock, Volume2, VolumeX } from 'lucide-react'
import { API_BASE_URL } from '../../config'

const FALLBACK_REEL_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4'

interface VerticalReelStackProps {
  reels: Reel[];
  courses: Course[];
  initialReelId?: string;
  onViewCourse: (courseId: string) => void;
}

export function VerticalReelStack({ reels, courses, initialReelId, onViewCourse }: VerticalReelStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const lastNavigationTime = useRef(0)
  const navigationCooldown = 400 // ms between navigations
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  // New state for enhanced features
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set())
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [reelComments, setReelComments] = useState<Record<string, any[]>>({})
  const [videoSourceOverrides, setVideoSourceOverrides] = useState<Record<string, string>>({})

  const [showMentoraIntro, setShowMentoraIntro] = useState(true);
  const [introPhase, setIntroPhase] = useState<'initial' | 'fading'>('initial');
  const [allowPreloadAdjacent, setAllowPreloadAdjacent] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setAllowPreloadAdjacent(false);
    const timer = setTimeout(() => {
      setAllowPreloadAdjacent(true);
    }, 1200); // Give active video 1.2s exclusive bandwidth
    return () => clearTimeout(timer);
  }, [currentIndex]);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIntroPhase('fading');
    }, 150);

    const removeTimer = setTimeout(() => {
      setShowMentoraIntro(false);
    }, 200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Auto-unmute on first user interaction (click or touch only — not mousemove to avoid premature trigger)
  useEffect(() => {
    const handleInteraction = () => {
      const video = videoRefs.current[currentIndex]
      if (video && video.muted) {
        video.muted = false
        video.volume = 1.0
        setIsMuted(false)
      }
    }
    document.addEventListener('click', handleInteraction, { once: true })
    document.addEventListener('touchstart', handleInteraction, { once: true })
    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, [currentIndex])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get effective start and end times for a reel (with defaults for old reels)
  const getReelTimes = (reel: Reel) => {
    const startTime = reel.startTime ?? 0
    // If endTime is set, use it. Otherwise, use 30 seconds as default max duration
    const endTime = reel.endTime ?? Math.min(30, videoDuration || 30)
    return { startTime, endTime }
  }

  // Get remaining time for current reel
  const getCurrentReel = () => reels[currentIndex]
  const getCourseVideoFallback = useCallback((reel: Reel) => {
    const relatedCourse = reel.courseId ? courses.find((course) => course.id === reel.courseId) : null
    return relatedCourse?.videoUrl || FALLBACK_REEL_VIDEO
  }, [courses])

  const getReelVideoSrc = useCallback((reel: Reel) => {
    return videoSourceOverrides[reel.id] || reel.videoUrl || getCourseVideoFallback(reel)
  }, [videoSourceOverrides, getCourseVideoFallback])

  const handleVideoError = useCallback((reel: Reel) => {
    const fallback = getCourseVideoFallback(reel)
    setVideoSourceOverrides((prev) => {
      // Avoid infinite loops if fallback itself fails.
      if (prev[reel.id] === fallback) {
        return prev
      }
      return {
        ...prev,
        [reel.id]: fallback
      }
    })
  }, [getCourseVideoFallback])
  const getReelDuration = (reel: Reel) => {
    const { startTime, endTime } = getReelTimes(reel)
    return endTime - startTime
  }
  const getRemainingTime = () => {
    const reel = getCurrentReel()
    if (!reel) return 0
    const { startTime, endTime } = getReelTimes(reel)
    const duration = endTime - startTime
    const elapsed = currentTime - startTime
    return Math.max(0, duration - elapsed)
  }

  // Find initial index
  useEffect(() => {
    if (initialReelId) {
      const initialIndex = reels.findIndex(r => r.id === initialReelId);
      if (initialIndex !== -1) {
        setCurrentIndex(initialIndex);
      }
    }
  }, [initialReelId, reels]);

  useEffect(() => {
    // Reset overrides whenever the reel set changes.
    setVideoSourceOverrides({})
  }, [reels]);

  // Load liked status from API on mount (batch request to avoid N sequential calls)
  useEffect(() => {
    const loadLikedStatus = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const likedSet = new Set<string>();

      // Check like status in parallel (not sequentially) for faster loading
      const promises = reels.map(async (reel) => {
        try {
          const response = await fetch(`${API_BASE_URL}/reels/${reel.id}/like/status`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.liked) {
              return reel.id;
            }
          }
        } catch (error) {
          // Silently skip failed requests
        }
        return null;
      });

      const results = await Promise.all(promises);
      results.forEach(id => { if (id) likedSet.add(id); });

      if (likedSet.size > 0) {
        setLikedReels(likedSet);
      }
    };

    if (reels.length > 0) {
      loadLikedStatus();
    }
  }, [reels]);

  // Auto-play current video with trimming support + preload adjacent reels
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex]
    const currentReel = reels[currentIndex]

    // Attempt to play with sound first; fall back to muted only if blocked by browser
    const handleCanPlay = () => {
      if (!isPaused && currentVideo) {
        currentVideo.muted = false
        currentVideo.volume = 1.0
        currentVideo.play().then(() => {
          setIsMuted(false)
        }).catch(() => {
          // Browser blocked unmuted play — fall back to muted
          currentVideo.muted = true
          setIsMuted(true)
          currentVideo.play().catch(() => {})
        })
      }
    }

    // Loop: when video reaches its natural end, restart from reel startTime
    const handleEnded = () => {
      if (currentVideo && currentReel) {
        const { startTime } = getReelTimes(currentReel)
        currentVideo.currentTime = startTime
        if (!isPaused) {
          currentVideo.muted = isMuted
          currentVideo.volume = 1.0
          currentVideo.play().catch(() => { })
        }
      }
    }

    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          const reel = reels[index]
          const { startTime } = getReelTimes(reel)
          // Set start time for trimming (always apply, even for old reels)
          if (video.currentTime < startTime) {
            video.currentTime = startTime
          }
          // Eagerly load current reel for instant playback
          video.preload = 'auto'
          
          video.muted = isMuted
          video.volume = 1.0

          // Try unmuted first for instant sound; muted fallback if browser blocks
          if (!isPaused) {
            video.muted = false
            video.volume = 1.0
            video.play().then(() => {
              setIsMuted(false)
            }).catch(() => {
              video.muted = true
              setIsMuted(true)
              video.play().catch(() => {})
            })
          }
          // Auto-play when data is ready + loop when ended
          video.addEventListener('canplay', handleCanPlay, { once: true })
          video.addEventListener('ended', handleEnded)
        } else {
          video.pause()
          // Reset to start time when not current
          const reel = reels[index]
          const { startTime } = getReelTimes(reel)
          video.currentTime = startTime
          // Preload adjacent reels for instant switching ONLY when allowed to avoid competing bandwidth
          const diff = Math.abs(index - currentIndex)
          const wrappedDiff = Math.min(diff, reels.length - diff)
          if (allowPreloadAdjacent) {
            if (wrappedDiff <= 1) {
              // Adjacent reels: fully preload for instant start
              video.preload = 'auto'
            } else if (wrappedDiff <= 2) {
              // 2 away: preload metadata for quick switching
              video.preload = 'metadata'
            } else {
              video.preload = 'none'
            }
          } else {
            video.preload = 'none'
          }
        }
      }
    })
    const reel = reels[currentIndex]
    if (reel) {
      const { startTime } = getReelTimes(reel)
      setCurrentTime(startTime)
    }

    return () => {
      if (currentVideo) {
        currentVideo.removeEventListener('canplay', handleCanPlay)
        currentVideo.removeEventListener('ended', handleEnded)
      }
    }
  }, [currentIndex, reels, allowPreloadAdjacent])

  // Handle video loaded metadata to get actual duration
  const handleLoadedMetadata = (index: number) => {
    const video = videoRefs.current[index]
    if (video && index === currentIndex) {
      setVideoDuration(video.duration)
    }
  }

  // Handle video time update for trimming and timer
  const handleTimeUpdate = (index: number) => {
    const video = videoRefs.current[index]
    const reel = reels[index]
    if (!video || !reel) return

    setCurrentTime(video.currentTime)

    // Get effective end time (applies to ALL reels, including old ones)
    const { startTime, endTime } = getReelTimes(reel)

    // Check if we've reached the end time (trimming)
    if (video.currentTime >= endTime) {
      // Loop back to start time
      video.currentTime = startTime
    }
  }

  // Toggle play/pause on click (or unmute if currently muted by autoplay policy)
  const handleVideoClick = () => {
    const video = videoRefs.current[currentIndex]
    if (!video) return

    if (video.muted) {
      video.muted = false
      video.volume = 1.0
      setIsMuted(false)
      if (video.paused) {
        video.play().catch(() => {})
        setIsPaused(false)
      }
    } else {
      if (video.paused) {
        video.play().catch(() => { })
        setIsPaused(false)
      } else {
        video.pause()
        setIsPaused(true)
      }
    }
  }

  // Toggle like with API call for persistence
  const handleLike = async (reelId: string) => {
    const token = localStorage.getItem('authToken')

    // Optimistic update
    setLikedReels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reelId)) {
        newSet.delete(reelId)
      } else {
        newSet.add(reelId)
      }
      return newSet
    })

    // Call API if user is authenticated
    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/reels/${reelId}/like/toggle`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          // Revert on failure
          setLikedReels(prev => {
            const newSet = new Set(prev)
            if (newSet.has(reelId)) {
              newSet.delete(reelId)
            } else {
              newSet.add(reelId)
            }
            return newSet
          })
        }
      } catch (error) {
        console.error('Failed to toggle like:', error)
      }
    }
  }

  // Add comment with API call
  const handleAddComment = async (reelId: string) => {
    if (!commentText.trim()) return

    const token = localStorage.getItem('authToken')
    if (!token) {
      alert('Te rog să te autentifici pentru a lăsa un comentariu')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reels/${reelId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: commentText })
      })

      if (response.ok) {
        const data = await response.json()
        // Update local comments count
        setReelComments(prev => ({
          ...prev,
          [reelId]: [...(prev[reelId] || []), data.comment]
        }))
        setCommentText('')
        setShowCommentInput(false)
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const navigate = useCallback((newDirection: number) => {
    const now = Date.now()
    if (now - lastNavigationTime.current < navigationCooldown) return
    lastNavigationTime.current = now

    setCurrentIndex((prev) => {
      if (newDirection > 0) {
        return prev === reels.length - 1 ? 0 : prev + 1
      }
      return prev === 0 ? reels.length - 1 : prev - 1
    })
  }, [reels.length])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    if (info.offset.y < -threshold) {
      navigate(1)
    } else if (info.offset.y > threshold) {
      navigate(-1)
    }
  }

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 30) {
        if (e.deltaY > 0) {
          navigate(1)
        } else {
          navigate(-1)
        }
      }
    },
    [navigate],
  )

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: true })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  const getCardStyle = (index: number) => {
    const total = reels.length
    let diff = index - currentIndex
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total

    if (diff === 0) {
      return { y: 0, scale: 1, opacity: 1, zIndex: 5, rotateX: 0 }
    } else if (diff === -1) {
      return { y: -160, scale: 0.82, opacity: 0.6, zIndex: 4, rotateX: 8 }
    } else if (diff === -2) {
      return { y: -280, scale: 0.7, opacity: 0.3, zIndex: 3, rotateX: 15 }
    } else if (diff === 1) {
      return { y: 160, scale: 0.82, opacity: 0.6, zIndex: 4, rotateX: -8 }
    } else if (diff === 2) {
      return { y: 280, scale: 0.7, opacity: 0.3, zIndex: 3, rotateX: -15 }
    } else {
      return { y: diff > 0 ? 400 : -400, scale: 0.6, opacity: 0, zIndex: 0, rotateX: diff > 0 ? -20 : 20 }
    }
  }

  const isVisible = (index: number) => {
    const total = reels.length
    let diff = index - currentIndex
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total
    return Math.abs(diff) <= 2
  }

  const currentReel = reels[currentIndex];
  const relatedCourse = currentReel?.courseId ? courses.find(c => c.id === currentReel.courseId) : null;

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#002147]">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      {/* Card Stack */}
      <div className="relative flex h-[500px] w-[320px] items-center justify-center" style={{ perspective: "1200px" }}>
        {reels.map((reel, index) => {
          if (!isVisible(index)) return null
          const style = getCardStyle(index)
          const isCurrent = index === currentIndex

          return (
            <motion.div
              key={reel.id}
              className="absolute cursor-grab active:cursor-grabbing"
              animate={{
                y: style.y,
                scale: style.scale,
                opacity: style.opacity,
                rotateX: style.rotateX,
                zIndex: style.zIndex,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 1,
              }}
              drag={isCurrent ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              style={{
                transformStyle: "preserve-3d",
                zIndex: style.zIndex,
              }}
            >
              <div
                className="relative h-[520px] w-[600px] overflow-hidden rounded-3xl bg-[#002147] ring-1 ring-white/10"
                style={{
                  boxShadow: isCurrent
                    ? "0 25px 50px -12px rgba(255, 255, 255, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)"
                    : "0 10px 30px -10px rgba(255, 255, 255, 0.1)",
                }}
              >
                {/* Video */}
                <video
                  ref={(el) => {
                    if (el) videoRefs.current[index] = el;
                    return undefined;
                  }}
                  className={`absolute inset-0 w-full h-full object-cover cursor-pointer transition-opacity duration-500 ${isCurrent && showMentoraIntro ? 'opacity-0' : 'opacity-100'}`}
                  playsInline
                  muted={isMuted}
                  preload={isCurrent ? "metadata" : "none"}
                  src={(() => {
                    const diff = Math.abs(index - currentIndex)
                    const wrappedDiff = Math.min(diff, reels.length - diff)
                    if (index === currentIndex) {
                      return getReelVideoSrc(reel);
                    }
                    if (allowPreloadAdjacent && wrappedDiff <= 1) {
                      return getReelVideoSrc(reel);
                    }
                    return undefined;
                  })()}
                  onError={() => handleVideoError(reel)}
                  onClick={isCurrent ? handleVideoClick : undefined}
                  onTimeUpdate={isCurrent ? () => handleTimeUpdate(index) : undefined}
                  onLoadedMetadata={() => handleLoadedMetadata(index)}
                />

                {/* Dark Overlay for non-current (inactive) Reels */}
                {!isCurrent && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] z-30 pointer-events-none transition-all duration-500 rounded-3xl" />
                )}

                {isCurrent && showMentoraIntro && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: introPhase === 'fading' ? 0 : 1 }}
                    transition={{ duration: introPhase === 'fading' ? 0.2 : 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-[#002147] overflow-hidden rounded-3xl"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="relative w-20 h-20 mb-8">
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{ border: '2px solid rgba(255, 85, 48, 0.2)' }}
                          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{ border: '2px solid transparent', borderTopColor: '#FF5530', borderRightColor: '#FF5530' }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        />
                        <motion.div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#FF5530]"
                          animate={{ scale: [1, 1.5, 1], boxShadow: ['0 0 10px rgba(255,85,48,0.5)', '0 0 30px rgba(255,85,48,0.8)', '0 0 10px rgba(255,85,48,0.5)'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative overflow-hidden mb-4 flex items-center justify-center">
                        <img src="/logo-header.jpg" alt="Mentora" className="h-8 w-auto object-contain" />
                      </motion.div>
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="text-gray-400 text-xs tracking-wider">
                        Loading reel...
                      </motion.p>
                    </div>
                  </motion.div>
                )}

                {/* Pause Overlay Icon */}
                {isCurrent && isPaused && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-[#002147]/30 cursor-pointer"
                    onClick={handleVideoClick}
                  >
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-10 h-10 text-white ml-1" fill="white" />
                    </div>
                  </div>
                )}

                {/* Mute/Unmute Overlay - Top Left */}
                {isCurrent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const video = videoRefs.current[currentIndex]
                      if (video) {
                        const nextMuted = !video.muted
                        video.muted = nextMuted
                        setIsMuted(nextMuted)
                      }
                    }}
                    className="absolute top-4 left-4 z-40 w-10 h-10 bg-[#002147]/60 backdrop-blur-sm hover:bg-[#002147]/80 rounded-full flex items-center justify-center transition-all border border-white/10"
                    title={isMuted ? "Pornește sunetul" : "Oprește sunetul"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                )}



                {/* Time Remaining Display - Top Right */}
                {isCurrent && (
                  <div className="absolute top-4 right-4 bg-[#002147]/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-sm text-white font-medium">{formatTime(getRemainingTime())}</span>
                  </div>
                )}

                {/* Card inner glow */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />

                {/* Overlay Info - Only show on current card */}
                {isCurrent && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#002147] via-[#002147]/80 to-transparent p-5 pb-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      {/* Title and Creator */}
                      <h2 className="text-xl mb-2 leading-tight text-shadow-netflix line-clamp-2" style={{ fontWeight: 700 }}>
                        {reel.title}
                      </h2>
                      <p className="text-sm text-gray-300 mb-3">{reel.creator}</p>

                      {/* Course Card - White Background */}
                      {relatedCourse && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          onClick={() => relatedCourse && onViewCourse(relatedCourse.id)}
                          className="bg-white rounded-xl p-3 mb-3 cursor-pointer hover:scale-[1.02] transition-transform"
                        >
                          <div className="flex items-center gap-3">
                            {/* Course Thumbnail */}
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={relatedCourse.thumbnail}
                                alt={relatedCourse.title}
                                className="w-full h-full object-cover"
                              />
                              {/* Play Icon Overlay */}
                              <div className="absolute inset-0 bg-[#002147]/20 flex items-center justify-center">
                                <PlayCircle className="w-8 h-8 text-white fill-white/20" />
                              </div>
                            </div>

                            {/* Course Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <PlayCircle className="w-4 h-4 text-black flex-shrink-0" />
                                <span className="text-black font-semibold text-xs">Vezi Cursul</span>
                              </div>
                              <h4 className="text-black text-sm mb-0.5 line-clamp-1 leading-tight" style={{ fontWeight: 600 }}>
                                {relatedCourse.title}
                              </h4>
                              <p className="text-gray-600 text-xs">
                                {relatedCourse.lessons} lecții • {relatedCourse.duration}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {reel.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 bg-[#002147] backdrop-blur-sm rounded-full text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Bottom gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#002147]/60 to-transparent pointer-events-none" />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Navigation dots */}
      <div className="absolute right-8 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        {reels.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentIndex) {
                setCurrentIndex(index)
              }
            }}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${index === currentIndex ? "h-6 bg-[#FF5530]" : "bg-white/30 hover:bg-white/50"
              }`}
            aria-label={`Go to reel ${index + 1}`}
          />
        ))}
      </div>

      {/* Instruction hint */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12l7-7 7 7" />
            </svg>
          </motion.div>
          <span className="text-xs font-medium tracking-widest uppercase">Scroll sau Drag</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </motion.div>

      {/* Counter */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-light text-white tabular-nums">
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
          <div className="my-2 h-px w-8 bg-white/20" />
          <span className="text-sm text-gray-400 tabular-nums">{String(reels.length).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  )
}
