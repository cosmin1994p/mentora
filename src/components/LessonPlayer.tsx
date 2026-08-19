import { X, Play, Pause, Volume2, VolumeX, Maximize, Settings, Minimize, RotateCw, RotateCcw, Maximize2, Download, Loader, Lock, Check } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useDragControls } from 'motion/react';
import Hls from 'hls.js';
import { QuizModal } from './QuizModal';
import { toast } from 'sonner';
import { BASE_URL } from '../config';

interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  hlsUrl?: string;
  duration?: number;
  order?: number;
  completed?: boolean;
  quiz?: any;
}

interface LessonPlayerProps {
  lesson: Lesson;
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  onProgressUpdate?: (lessonId: string, progress: number) => void;
  isLocked?: boolean;
  userPackage?: string;
}

export function LessonPlayer({
  lesson,
  courseId,
  courseTitle,
  onClose,
  onProgressUpdate,
  isLocked = false,
  userPackage = 'Free'
}: LessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [availableQualities, setAvailableQualities] = useState<{ label: string; index: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [showMentoraIntro, setShowMentoraIntro] = useState(true);
  const [introPhase, setIntroPhase] = useState<'initial' | 'fading'>('initial');

  // Intro screen timeout
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIntroPhase('fading');
    }, 2000);

    const removeTimer = setTimeout(() => {
      setShowMentoraIntro(false);
      if (videoRef.current && !isMuted) {
        videoRef.current.play().catch(e => console.error("Autoplay failed:", e));
      }
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [isMuted]);

  const dragControls = useDragControls();

  const toAbsoluteUrl = (url?: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${BASE_URL}${url}`;
  };

  const inferCdnBaseFromVideoUrl = (url?: string | null) => {
    if (!url) return null;
    const match = url.match(/^(https?:\/\/[^/]+\/file\/[^/]+)/i);
    return match ? match[1] : null;
  };

  // Determine which URL to use: HLS preferred, fallback to MP4
  const videoUrl = toAbsoluteUrl(lesson.videoUrl);
  const cdnBase = inferCdnBaseFromVideoUrl(videoUrl);
  const inferredB2HlsUrl = cdnBase ? `${cdnBase}/hls/${courseId}/master.m3u8` : null;

  const rawHls = lesson.hlsUrl || '';
  const isLegacyApiHls = rawHls.startsWith('/api/hls/');
  const hlsUrl = isLegacyApiHls
    ? (inferredB2HlsUrl || toAbsoluteUrl(rawHls))
    : (toAbsoluteUrl(rawHls) || inferredB2HlsUrl);

  // If lesson is locked, show lock message
  if (isLocked) {
    return (
      <motion.div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="bg-[#002147] rounded-lg p-12 text-center max-w-md">
          <Lock className="w-16 h-16 mx-auto mb-4 text-[#FF5530]" />
          <h2 className="text-2xl font-bold mb-2">Lesson Locked</h2>
          <p className="text-gray-300 mb-6">
            This lesson requires a higher tier package to access. Your current package: <span className="font-semibold text-[#FF5530]">{userPackage}</span>
          </p>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#B54236] hover:bg-[#B54236] rounded transition-colors"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Initialize HLS or fallback to MP4
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let isMounted = true;

    const initVideo = async () => {
      // Setup HLS if available
      if (hlsUrl && Hls.isSupported()) {
        hls = new Hls({
          startLevel: 0,
          capLevelToPlayerSize: false,
          maxBufferLength: 30,
          maxMaxBufferLength: 120,
          maxBufferSize: 120 * 1024 * 1024,
          abrBandWidthFactor: 0.95,
          abrBandWidthUpFactor: 0.7,
          abrEwmaDefaultEstimate: 5000000,
          startFragPrefetch: true,
        });

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (!isMounted) return;
          const qualities = data.levels.map((level, idx) => ({
            label: `${level.height}p`,
            index: idx,
          }));
          qualities.unshift({ label: 'Auto', index: -1 });
          setAvailableQualities(qualities);
          setCurrentQuality('Auto');
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          if (!isMounted) return;
          const level = hls?.levels[data.level];
          if (level) {
            setCurrentQuality(hls?.autoLevelEnabled ? `Auto (${level.height}p)` : `${level.height}p`);
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!isMounted) return;
          if (data.fatal) {
            hls?.destroy();
            hlsRef.current = null;
          }
        });

        hlsRef.current = hls;
      } else if (videoUrl) {
        // Fallback to MP4
        video.src = videoUrl;
      }
    };

    initVideo();

    return () => {
      isMounted = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, videoUrl]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const handleQualityChange = (index: number) => {
    if (hlsRef.current) {
      if (index === -1) {
        hlsRef.current.currentLevel = -1; // Auto
      } else {
        hlsRef.current.currentLevel = index;
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * duration;
    }
  };

  return (
    <motion.div
      ref={containerRef}
      className={`fixed z-50 ${isMinimized ? 'bottom-4 right-4 w-96' : 'inset-0'} bg-black`}
      drag={isMinimized}
      dragControls={dragControls}
      dragMomentum={true}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Video Container */}
      <div className={`w-full ${isMinimized ? 'aspect-video' : 'h-full'} bg-black relative group overflow-hidden rounded-lg`}>
        <video
          ref={videoRef}
          className={`w-full h-full transition-opacity duration-500 ${showMentoraIntro ? 'opacity-0' : 'opacity-100'}`}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              if (onProgressUpdate) {
                onProgressUpdate(lesson.id, (videoRef.current.currentTime / (videoRef.current.duration || 1)) * 100);
              }
            }
          }}
          onDurationChange={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
            }
          }}
          onMouseMove={() => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            if (isPlaying) {
              controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
            }
          }}
        />

        {showMentoraIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: introPhase === 'fading' ? 0 : 1 }}
            transition={{ duration: introPhase === 'fading' ? 0.2 : 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[#002147] overflow-hidden"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative w-24 h-24 mb-10">
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
                <img src="/logo-header.jpg" alt="Mentora" className="h-10 w-auto object-contain" />
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="text-gray-400 text-sm tracking-wider">
                Loading lesson...
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Controls */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent flex flex-col justify-between"
          animate={{ opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Top Controls */}
          <div className="p-4 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">{lesson.title}</h3>
              <p className="text-sm text-gray-300">{courseTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Center - Play Button */}
          <div className="flex justify-center">
            <button
              onClick={handlePlayPause}
              className="w-16 h-16 bg-white/30 backdrop-blur-sm hover:bg-white/50 rounded-full flex items-center justify-center transition-all"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="space-y-3 p-4">
            {/* Progress Bar */}
            <div
              className="h-2 bg-gray-600 rounded cursor-pointer hover:h-3 transition-all"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-[#B54236] rounded transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Time */}
            <div className="flex justify-between text-sm text-gray-200">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Control Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 accent-red-600"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors relative"
                >
                  <Settings className="w-5 h-5" />
                  {showSettings && (
                    <div className="absolute bottom-12 right-0 bg-[#002147] rounded-lg p-2 space-y-2 min-w-48">
                      <div>
                        <p className="text-sm text-gray-300 px-2 py-1">Speed</p>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => {
                              handlePlaybackRateChange(rate);
                              setShowSettings(false);
                            }}
                            className={`block w-full text-left px-2 py-1 text-sm ${playbackRate === rate ? 'text-[#FF5530] font-bold' : 'text-gray-300 hover:bg-white/10'} rounded transition-colors`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm text-gray-300 px-2 py-1">Quality</p>
                        {availableQualities.map((q) => (
                          <button
                            key={q.label}
                            onClick={() => {
                              handleQualityChange(q.index);
                              setShowSettings(false);
                            }}
                            className={`block w-full text-left px-2 py-1 text-sm ${currentQuality === q.label ? 'text-[#FF5530] font-bold' : 'text-gray-300 hover:bg-white/10'} rounded transition-colors`}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </button>

                {lesson.quiz && (
                  <button
                    onClick={() => setShowQuiz(true)}
                    className="px-3 py-1 bg-[#B54236] hover:bg-[#B54236] rounded text-sm font-semibold transition-colors"
                  >
                    Take Quiz
                  </button>
                )}

                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quiz Modal */}
      {showQuiz && lesson.quiz && (
        <QuizModal
          quiz={lesson.quiz}
          onClose={() => setShowQuiz(false)}
          onComplete={(passed) => {
            toast.success(passed ? 'Quiz Passed! 🎉' : 'Quiz Completed');
            setShowQuiz(false);
          }}
        />
      )}
    </motion.div>
  );
}
