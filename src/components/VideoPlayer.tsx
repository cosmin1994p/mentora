import { X, Play, Pause, Volume2, VolumeX, Maximize, Settings, Minimize, RotateCw, RotateCcw, Maximize2, Download, Loader } from 'lucide-react';
import { Course } from '../App';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useDragControls } from 'motion/react';
import Hls from 'hls.js';

import { BASE_URL } from '../config';

interface VideoPlayerProps {
  course: Course;
  onClose: () => void;
  onProgressUpdate: (courseId: string, progress: number) => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

export function VideoPlayer({ course, onClose, onProgressUpdate, isMinimized: externalMinimized = false, onMinimize }: VideoPlayerProps) {
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
  const [showMentoraIntro, setShowMentoraIntro] = useState(true);
  const [introPhase, setIntroPhase] = useState<'visible' | 'fading'>('visible');
  const introStartedAtRef = useRef<number>(Date.now());
  const introDelayTimeoutRef = useRef<number | null>(null);
  const introFadeTimeoutRef = useRef<number | null>(null);
  const introVisibleRef = useRef(true);
  const introPhaseRef = useRef<'visible' | 'fading'>('visible');
  const [logoLoaded, setLogoLoaded] = useState(false);

  const dragControls = useDragControls();
  const isMinimized = externalMinimized;

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
  const videoUrl = toAbsoluteUrl(course.videoUrl) || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  const cdnBase = inferCdnBaseFromVideoUrl(videoUrl);
  const inferredB2HlsUrl = cdnBase ? `${cdnBase}/hls/${course.id}/master.m3u8` : null;

  const rawHls = course.hlsUrl || '';
  const isLegacyApiHls = rawHls.startsWith('/api/hls/');
  const hlsUrl = isLegacyApiHls
    ? (inferredB2HlsUrl || toAbsoluteUrl(rawHls))
    : (toAbsoluteUrl(rawHls) || inferredB2HlsUrl);

  useEffect(() => {
    introVisibleRef.current = showMentoraIntro;
  }, [showMentoraIntro]);

  useEffect(() => {
    introPhaseRef.current = introPhase;
  }, [introPhase]);

  const startIntroFade = useCallback((isMounted: boolean) => {
    const minIntroMs = 700;
    const fadeOutMs = 50;
    const elapsed = Date.now() - introStartedAtRef.current;
    const remaining = Math.max(0, minIntroMs - elapsed);

    if (introDelayTimeoutRef.current) {
      window.clearTimeout(introDelayTimeoutRef.current);
      introDelayTimeoutRef.current = null;
    }

    if (introFadeTimeoutRef.current) {
      window.clearTimeout(introFadeTimeoutRef.current);
      introFadeTimeoutRef.current = null;
    }

    introDelayTimeoutRef.current = window.setTimeout(() => {
      if (!isMounted || !introVisibleRef.current || introPhaseRef.current === 'fading') return;
      setIntroPhase('fading');
      introFadeTimeoutRef.current = window.setTimeout(() => {
        if (!isMounted) return;
        setShowMentoraIntro(false);
        introFadeTimeoutRef.current = null;
      }, fadeOutMs);
    }, remaining);
  }, []);

  // Initialize HLS or fallback to MP4
  // Effect 1: Handle Video Source Loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let isMounted = true;

    const initVideo = async () => {
      introStartedAtRef.current = Date.now();
      setShowMentoraIntro(true);
      setIntroPhase('visible');
      if (introDelayTimeoutRef.current) {
        window.clearTimeout(introDelayTimeoutRef.current);
        introDelayTimeoutRef.current = null;
      }
      if (introFadeTimeoutRef.current) {
        window.clearTimeout(introFadeTimeoutRef.current);
        introFadeTimeoutRef.current = null;
      }

      // Setup HLS if available
      if (hlsUrl && Hls.isSupported()) {
        hls = new Hls({
          startLevel: 0,              // Start at lowest quality for instant playback
          capLevelToPlayerSize: false, // Allow loading up to 4K regardless of player CSS size
          maxBufferLength: 30,        // Buffer 30s ahead
          maxMaxBufferLength: 120,    // Allow up to 2 minutes buffer for higher quality
          maxBufferSize: 120 * 1024 * 1024, // 120MB buffer for 4K segments
          abrBandWidthFactor: 0.95,   // Use 95% of measured bandwidth for quality selection
          abrBandWidthUpFactor: 0.7,  // Aggressively upgrade quality when bandwidth allows
          abrEwmaDefaultEstimate: 5000000, // Default 5Mbps estimate (start upgrading quickly)
          startFragPrefetch: true,    // Start downloading the first fragment immediately
        });

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (!isMounted) return;
          // Extract available quality levels
          const qualities = data.levels.map((level, idx) => ({
            label: `${level.height}p`,
            index: idx,
          }));
          qualities.unshift({ label: 'Auto', index: -1 });
          setAvailableQualities(qualities);
          setCurrentQuality('Auto');

          // Auto-play
          video.play()
            .then(() => isMounted && setIsPlaying(true))
            .catch((e) => {
              console.warn('Auto-play blocked or interrupted:', e);
              if (isMounted) setIsPlaying(false);
            });
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
            console.error('[HLS] Fatal error:', data.type, data.details);
            // Fallback to direct MP4
            hls?.destroy();
            video.src = videoUrl;
            video.play()
              .then(() => isMounted && setIsPlaying(true))
              .catch(() => isMounted && setIsPlaying(false));
          }
        });

        hlsRef.current = hls;

      } else if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari: native HLS support
        video.src = hlsUrl;
        video.addEventListener('canplay', () => {
          if (isMounted) {
            video.play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          }
        }, { once: true });

      } else {
        // Fallback: raw MP4
        video.src = videoUrl;
        video.addEventListener('canplay', () => {
          if (isMounted) {
            video.play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          }
        }, { once: true });
      }
    };

    const handleCanPlay = () => {
      if (!isMounted) return;
      startIntroFade(isMounted);
    };

    const handlePlaying = () => {
      if (!isMounted) return;
      startIntroFade(isMounted);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);

    initVideo();

    return () => {
      isMounted = false;
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      if (introDelayTimeoutRef.current) {
        window.clearTimeout(introDelayTimeoutRef.current);
        introDelayTimeoutRef.current = null;
      }
      if (introFadeTimeoutRef.current) {
        window.clearTimeout(introFadeTimeoutRef.current);
        introFadeTimeoutRef.current = null;
      }
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, videoUrl, startIntroFade]); // Only re-run if URL changes

  // Effect 2: Handle Event Listeners (Time Updates, etc.)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const progress = (video.currentTime / video.duration) * 100;
      if (Math.floor(video.currentTime) % 5 === 0) {
        onProgressUpdate(course.id, Math.floor(progress));
      }
    };

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onProgressUpdate(course.id, 100);
    };
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [course.id, onProgressUpdate]); // Re-bind if callback changes (but callback should be stable now)

  const handleMouseMove = () => {
    if (!isMinimized) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
          setShowSettings(false);
        }, 3000);
      }
    }
  };

  const togglePlay = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await videoRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.warn('Play request interrupted:', error);
          // Don't set isPlaying to true if it failed
          setIsPlaying(false);
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.warn('Fullscreen request failed:', err);
        });
      } else {
        document.exitFullscreen().catch(err => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    } catch (err) {
      console.warn('Fullscreen not supported:', err);
    }
  };

  const toggleMinimize = () => {
    console.log('Toggle minimize clicked!');
    if (onMinimize) {
      onMinimize();
    }
    setShowControls(true);
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSettings(false);
    }
  };

  // Change HLS quality level
  const changeQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex; // -1 = auto
      if (levelIndex === -1) {
        hlsRef.current.currentLevel = -1;
        setCurrentQuality('Auto');
      }
    }
    setShowSettings(false);
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const progressPercentage = Math.floor(progress);

  // Mini Player (Zoom-like draggable window)
  if (isMinimized) {
    console.log('Rendering MINI PLAYER - isMinimized:', isMinimized);
    return (
      <motion.div
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{
          top: 0,
          left: 0,
          right: window.innerWidth - 360,
          bottom: window.innerHeight - 220
        }}
        initial={{ x: window.innerWidth - 380, y: window.innerHeight - 240 }}
        className="fixed z-[9999] w-[360px] bg-[#002147] rounded-xl overflow-hidden shadow-2xl border border-white/20"
        style={{
          cursor: 'move',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Mini Player Header - Draggable Area */}
        <div
          className="bg-gradient-to-r from-[#002147] to-[#000000] px-3 py-2 flex items-center justify-between cursor-move border-b border-white/10"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-[#FF5530] animate-pulse" title="Live" />
            <h4 className="text-xs font-medium truncate text-white/90">{course.title}</h4>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}
              className="w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all"
              title="Maximize"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-7 h-7 hover:bg-[#FF5530]/80 rounded-lg flex items-center justify-center transition-all"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mini Video */}
        <div className="relative aspect-video bg-[#002147]">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            onClick={togglePlay}
            preload="metadata"
          />

          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-[#000000]/20 hover:bg-[#000000]/40 transition-all"
            >
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-black fill-current ml-0.5" />
              </div>
            </button>
          )}
        </div>

        {/* Mini Controls */}
        <div className="bg-[#000000] px-3 py-2">
          <div className="mb-2">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mini-progress-bar"
              style={{
                background: `linear-gradient(to right, #FF5530 0%, #FF5530 ${progress}%, #002147 ${progress}%, #002147 100%)`
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="hover:scale-110 transition-transform">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <button onClick={toggleMute} className="hover:scale-110 transition-transform">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <span className="text-xs text-gray-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <span className="text-xs text-gray-400">{progressPercentage}%</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Full Player
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#002147] z-50 flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Top Bar */}
      <div
        className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-[#002147]/90 to-transparent p-6 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
          }`}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-[#000000]/80 hover:bg-[#000000] rounded-full flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-right">
            <h2 className="text-lg md:text-xl font-semibold">{course.title}</h2>
            <p className="text-sm text-gray-400">Progres: {progressPercentage}%</p>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          className={`w-full h-full object-contain transition-opacity duration-500 ${showMentoraIntro ? 'opacity-0' : 'opacity-100'}`}
          onClick={togglePlay}
          preload="metadata"
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
                Loading video...
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Center Play Button */}
        {!isPlaying && showControls && (
          <button
            onClick={togglePlay}
            className="absolute w-20 h-20 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full flex items-center justify-center transition-all netflix-shadow-lg"
          >
            <Play className="w-10 h-10 fill-current ml-1" />
          </button>
        )}
      </div>

      {/* Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#000000] via-[#000000]/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
          }`}
      >
        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer progress-bar"
            style={{
              background: `linear-gradient(to right, #FF5530 0%, #FF5530 ${progress}%, #002147 ${progress}%, #002147 100%)`
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-6 pb-6 pt-3">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="hover:scale-110 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 fill-current" />
              )}
            </button>

            <button
              onClick={() => skip(-5)}
              className="hover:scale-110 transition-transform flex items-center gap-1"
              title="Back 5 secunde"
            >
              <RotateCcw className="w-6 h-6" />
              <span className="text-xs">5</span>
            </button>

            <button
              onClick={() => skip(5)}
              className="hover:scale-110 transition-transform flex items-center gap-1"
              title="Înainte 5 secunde"
            >
              <RotateCw className="w-6 h-6" />
              <span className="text-xs">5</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="hover:scale-110 transition-transform"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-7 h-7" />
                ) : (
                  <Volume2 className="w-7 h-7" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer volume-bar"
                style={{
                  background: `linear-gradient(to right, white 0%, white ${volume * 100}%, #002147 ${volume * 100}%, #002147 100%)`
                }}
              />
            </div>

            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="hover:scale-110 transition-transform"
              >
                <Settings className="w-6 h-6" />
              </button>

              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-[#000000]/95 backdrop-blur-sm rounded-lg p-2 min-w-[200px] netflix-shadow-lg">
                  <div className="text-sm">
                    <p className="text-gray-400 px-3 py-2">Viteză redare</p>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`w-full text-left px-3 py-2 hover:bg-white/10 rounded transition-colors ${playbackRate === rate ? 'text-white' : 'text-gray-400'
                          }`}
                      >
                        {rate === 1 ? 'Normal' : `${rate}x`}
                        {playbackRate === rate && (
                          <span className="ml-2">✓</span>
                        )}
                      </button>
                    ))}

                    {availableQualities.length > 0 && (
                      <>
                        <div className="border-t border-white/10 my-2" />
                        <p className="text-gray-400 px-3 py-2">Calitate</p>
                        <p className="text-xs text-gray-500 px-3 pb-1">{currentQuality}</p>
                        {availableQualities.map((q) => (
                          <button
                            key={q.index}
                            onClick={() => changeQuality(q.index)}
                            className={`w-full text-left px-3 py-2 hover:bg-white/10 rounded transition-colors ${currentQuality.includes(q.label) ? 'text-white' : 'text-gray-400'}`}
                          >
                            {q.label}
                            {currentQuality.includes(q.label) && <span className="ml-2">✓</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              className="hover:scale-110 transition-transform"
            >
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .progress-bar::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #FF5530;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .progress-bar:hover::-webkit-slider-thumb {
          opacity: 1;
        }

        .progress-bar::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #FF5530;
          cursor: pointer;
          border: none;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .progress-bar:hover::-moz-range-thumb {
          opacity: 1;
        }

        .volume-bar::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }

        .volume-bar::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }

        .mini-progress-bar::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #FF5530;
          cursor: pointer;
        }

        .mini-progress-bar::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #FF5530;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}