import { X, Scissors, Save, Play, Edit } from 'lucide-react';
import { Course, Reel } from '../App';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL, rewriteUrl } from '../config';

interface ReelCreatorProps {
  course: Course;
  onClose: () => void;
  onSave: (reel: Reel) => void;
  editReel?: Reel; // Optional - if provided, we're in edit mode
  onUpdate?: (reel: Reel) => void; // Called when updating existing reel
}

export function ReelCreator({ course, onClose, onSave, editReel, onUpdate }: ReelCreatorProps) {
  const isEditMode = !!editReel;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceMode, setSourceMode] = useState<'lesson' | 'upload'>('lesson');
  const [sourceLessons, setSourceLessons] = useState<any[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [uploadVideoFile, setUploadVideoFile] = useState<File | null>(null);
  const [uploadThumbnailFile, setUploadThumbnailFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState(editReel?.startTime || 0);
  const [endTime, setEndTime] = useState(editReel?.endTime || 30);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState(editReel?.title || '');
  const [currentTime, setCurrentTime] = useState(0);

  const chapterOptions = Array.from(new Set(sourceLessons.map((lesson: any) => lesson?.chapter?.name || 'Capitol 1')));
  const lessonsInChapter = sourceLessons.filter((lesson: any) => (lesson?.chapter?.name || 'Capitol 1') === selectedChapter);
  const selectedLesson = lessonsInChapter.find((lesson: any) => (lesson._id || lesson.id) === selectedLessonId);

  const selectedLessonVideoUrl = rewriteUrl(selectedLesson?.video?.url || selectedLesson?.videoUrl || '');
  const selectedLessonThumbnailUrl = rewriteUrl(selectedLesson?.thumbnail?.url || '');
  const uploadedVideoPreviewUrl = useMemo(() => {
    return uploadVideoFile ? URL.createObjectURL(uploadVideoFile) : '';
  }, [uploadVideoFile]);

  const previewSource = sourceMode === 'upload'
    ? (uploadedVideoPreviewUrl || rewriteUrl(course.videoUrl || '') || '')
    : (selectedLessonVideoUrl || rewriteUrl(course.videoUrl || '') || '');

  useEffect(() => {
    return () => {
      if (uploadedVideoPreviewUrl) {
        URL.revokeObjectURL(uploadedVideoPreviewUrl);
      }
    };
  }, [uploadedVideoPreviewUrl]);

  useEffect(() => {
    const loadLessons = async () => {
      if (!course?.id || isEditMode) return;
      try {
        setLessonsLoading(true);
        setLessonsError('');
        const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
        const response = await fetch(`${API_BASE_URL}/courses/v2/${course.id}/lessons`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (!response.ok) {
          const errorMsg = `Failed to load lessons: ${response.status} ${response.statusText}`;
          console.error(errorMsg);
          setLessonsError(errorMsg);
          return;
        }
        const payload = await response.json();
        const list = Array.isArray(payload) ? payload : payload.lessons || payload.data || [];
        console.log(`[ReelCreator] Loaded ${list.length} lessons for course ${course?.id}`);
        setSourceLessons(list);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error loading lessons';
        console.error('[ReelCreator] Error loading lessons:', error);
        setLessonsError(errorMsg);
      } finally {
        setLessonsLoading(false);
      }
    };

    loadLessons();
  }, [course?.id, isEditMode]);

  useEffect(() => {
    if (!chapterOptions.length) return;
    if (!selectedChapter || !chapterOptions.includes(selectedChapter)) {
      setSelectedChapter(chapterOptions[0]);
    }
  }, [chapterOptions, selectedChapter]);

  useEffect(() => {
    if (!lessonsInChapter.length) {
      setSelectedLessonId('');
      return;
    }
    if (!selectedLessonId || !lessonsInChapter.some((lesson: any) => (lesson._id || lesson.id) === selectedLessonId)) {
      setSelectedLessonId(lessonsInChapter[0]._id || lessonsInChapter[0].id);
    }
  }, [lessonsInChapter, selectedLessonId]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (sourceMode === 'upload') {
        setStartTime(0);
        setEndTime(videoRef.current.duration || 30);
      } else {
        setEndTime(Math.min(30, videoRef.current.duration));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);

      // Loop within selected range
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const handleSeekStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setStartTime(time);
    if (time >= endTime) {
      setEndTime(Math.min(time + 10, duration));
    }
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSeekEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setEndTime(time);
    if (time <= startTime) {
      setStartTime(Math.max(0, time - 10));
    }
    // Seek video to end position to preview
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please add a title for the reel!');
      return;
    }

    if (!isEditMode && sourceMode === 'upload' && !uploadVideoFile) {
      alert('Te rog încarcă un fișier video pentru reel.');
      return;
    }

    if (!isEditMode && sourceMode === 'lesson') {
      if (sourceLessons.length === 0) {
        alert('Nu sunt lecții disponibile pentru acest curs. Te rog adaugă lecții înainte de a crea reel-uri prin clipping.');
        return;
      }
      if (!selectedLesson) {
        alert('Te rog selectează un chapter și o lecție pentru decupare.');
        return;
      }
      if (!previewSource) {
        alert('Lecția selectată nu are video disponibil. Alege altă lecție sau folosește Upload Ready Reel.');
        return;
      }
    }

    if (isEditMode && editReel && onUpdate) {
      // Update existing reel - preserve existing data, update only changed fields
      const updatedReel: Reel = {
        ...editReel,
        title: title.trim(),
        startTime: startTime,
        endTime: endTime
      };
      onUpdate(updatedReel);
    } else {
      // Create new reel
      const newReel: Reel = {
        id: `reel-${Date.now()}`,
        title: title.trim(),
        creator: course.instructor,
        thumbnail: uploadThumbnailFile ? URL.createObjectURL(uploadThumbnailFile) : (selectedLessonThumbnailUrl || course.thumbnail),
        views: '0',
        likes: '0',
        videoUrl: previewSource,
        courseId: course.id,
        tags: course.tags || [],
        startTime: startTime,
        endTime: endTime
      };
      (newReel as any).sourceMode = sourceMode;
      (newReel as any).sourceLessonId = selectedLesson?._id || selectedLesson?.id;
      (newReel as any).sourceChapterName = selectedChapter;
      (newReel as any).videoFile = uploadVideoFile || undefined;
      (newReel as any).thumbnailFile = uploadThumbnailFile || undefined;
      onSave(newReel);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const clipDuration = endTime - startTime;
  const isUploadMode = !isEditMode && sourceMode === 'upload';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.classList.add('reel-modal-open');
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.classList.remove('reel-modal-open');
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const modalContent = (
    <div
      className="fixed inset-0 z-[2147483647] flex items-start justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: '#002147' }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close reel creator"
        className="absolute top-4 right-4 z-[10001] text-gray-200 hover:text-white transition-all hover:scale-110 p-2 hover:bg-[#1b3f77] rounded-lg"
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="relative w-full max-w-3xl rounded-2xl p-5 overflow-hidden opacity-100"
        style={{
          isolation: 'isolate',
          marginTop: 'max(1rem, 4vh)',
          marginBottom: 'max(1rem, 4vh)',
          maxHeight: 'calc(100vh - 2rem)',
          backgroundColor: '#0e2954',
          border: '1px solid #2e4b7b',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.7)',
          overflowY: 'auto'
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 pr-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${isEditMode ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700'} rounded-full flex items-center justify-center`}>
              {isEditMode ? <Edit className="w-5 h-5" /> : <Scissors className="w-5 h-5" />}
            </div>
            <div>
              <h2>{isEditMode ? 'Edit Reel' : 'Create Reel'}</h2>
              <p className="text-sm text-gray-300">from {course.title}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-start">
          {/* Video Preview */}
          <div>
            <div className="h-[260px] md:h-[300px] bg-[#091b3c] rounded-xl overflow-hidden card-shadow mb-3 border border-white/10">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                controls
                loop
                src={previewSource || "https://www.w3schools.com/html/mov_bbb.mp4"}
              />
            </div>
            <div className="bg-[#132f61] rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Clip Duration:</span>
                <span className="text-[#FF5530] font-semibold">{formatTime(clipDuration)}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: 'calc(60vh - 200px)' }}>
            {/* Title Input */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Reel Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Quick Tip: Lighting Setup"
                className="w-full px-4 py-3 bg-[#132f61] border border-white/15 rounded-lg focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            {!isEditMode && (
              <>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Reel Source</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#17386f] border border-[#36578f] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSourceMode('lesson')}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${sourceMode === 'lesson'
                        ? 'bg-[#FF5530] text-white'
                        : 'text-gray-300 hover:bg-[#214a8b]'
                        }`}
                    >
                      Clip From Lesson
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceMode('upload')}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${sourceMode === 'upload'
                        ? 'bg-[#FF5530] text-white'
                        : 'text-gray-300 hover:bg-[#214a8b]'
                        }`}
                    >
                      Upload Ready Reel
                    </button>
                  </div>
                  <p className="text-xs text-gray-300 mt-2">
                    Choose Clip From Lesson to trim a segment, or Upload Ready Reel to publish an already cut video.
                  </p>
                </div>

                {sourceMode === 'lesson' && (
                  <div className="space-y-3 border border-white/10 bg-white/5 rounded-lg p-4">
                    <div className="text-xs text-gray-400">
                      {lessonsLoading ? 'Loading lessons...' : `Available lessons: ${sourceLessons.length}`}
                    </div>
                    {lessonsError && (
                      <div className="text-xs bg-[#FF5530]/20 border border-[#FF5530]/50 rounded p-2 text-red-300">
                        {lessonsError}
                      </div>
                    )}
                    {sourceLessons.length === 0 && !lessonsLoading && !lessonsError && (
                      <div className="text-xs bg-yellow-500/20 border border-yellow-500/50 rounded p-2 text-yellow-300">
                        No lessons available. Add lessons to this course first.
                      </div>
                    )}
                    
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Chapter:</label>
                      <select
                        value={selectedChapter}
                        onChange={(e) => setSelectedChapter(e.target.value)}
                        className="w-full px-4 py-3 bg-[#132f61] border border-white/15 rounded-lg focus:outline-none focus:border-[#FF5530]/50"
                        disabled={sourceLessons.length === 0}
                      >
                        {chapterOptions.map((chapter) => (
                          <option key={chapter} value={chapter}>{chapter}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Lesson:</label>
                      <select
                        value={selectedLessonId}
                        onChange={(e) => setSelectedLessonId(e.target.value)}
                        className="w-full px-4 py-3 bg-[#132f61] border border-white/15 rounded-lg focus:outline-none focus:border-[#FF5530]/50"
                        disabled={lessonsInChapter.length === 0}
                      >
                        {lessonsInChapter.map((lesson: any) => {
                          const id = lesson._id || lesson.id;
                          return (
                            <option key={id} value={id}>
                              {lesson.title}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {sourceMode === 'upload' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Video Reel *</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setUploadVideoFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 bg-[#132f61] border border-white/15 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Thumbnail Reel (opțional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadThumbnailFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 bg-[#132f61] border border-white/15 rounded-lg"
                  />
                </div>
              </>
            )}

            {!isUploadMode && (
              <>
            {/* Timeline Visualization */}
            <div className="bg-[#132f61] rounded-lg p-4 border border-white/10">
              <label className="text-sm text-gray-400 mb-3 block">Clip Timeline</label>
              <div className="relative h-12 bg-gray-800 rounded-lg overflow-hidden mb-2">
                <div
                  className="absolute h-full bg-gradient-to-r from-red-600 to-red-500 opacity-30"
                  style={{
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`
                  }}
                ></div>
                <div
                  className="absolute w-1 h-full bg-white shadow-lg"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                ></div>
                <div
                  className="absolute w-1 h-full bg-[#FF5530]"
                  style={{ left: `${(startTime / duration) * 100}%` }}
                ></div>
                <div
                  className="absolute w-1 h-full bg-[#FF5530]"
                  style={{ left: `${(endTime / duration) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0:00</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Start Time */}
            <div>
              <label className="text-sm text-gray-400 mb-2 flex items-center justify-between">
                <span>Clip Start</span>
                <span className="text-[#FF5530]">{formatTime(startTime)}</span>
              </label>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={startTime}
                onChange={handleSeekStart}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-green"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="text-sm text-gray-400 mb-2 flex items-center justify-between">
                <span>Clip End</span>
                <span className="text-[#FF5530]">{formatTime(endTime)}</span>
              </label>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={endTime}
                onChange={handleSeekEnd}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-red"
              />
            </div>

            {/* Quick Duration Presets */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Quick Presets</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStartTime(0);
                    setEndTime(Math.min(15, duration));
                  }}
                  className="flex-1 px-3 py-2 bg-[#17386f] hover:bg-[#214a8b] rounded-lg transition-all text-sm border border-[#36578f]"
                >
                  15s
                </button>
                <button
                  onClick={() => {
                    setStartTime(0);
                    setEndTime(Math.min(30, duration));
                  }}
                  className="flex-1 px-3 py-2 bg-[#17386f] hover:bg-[#214a8b] rounded-lg transition-all text-sm border border-[#36578f]"
                >
                  30s
                </button>
                <button
                  onClick={() => {
                    setStartTime(0);
                    setEndTime(Math.min(60, duration));
                  }}
                  className="flex-1 px-3 py-2 bg-[#17386f] hover:bg-[#214a8b] rounded-lg transition-all text-sm border border-[#36578f]"
                >
                  60s
                </button>
              </div>
            </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={!isEditMode && sourceMode === 'lesson' && (lessonsLoading || sourceLessons.length === 0)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all shadow-lg ${ 
                  !isEditMode && sourceMode === 'lesson' && (lessonsLoading || sourceLessons.length === 0)
                    ? 'from-gray-600 to-gray-700 text-gray-400 bg-gradient-to-r cursor-not-allowed opacity-50'
                    : isEditMode 
                    ? 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white bg-gradient-to-r hover:shadow-xl' 
                    : 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white bg-gradient-to-r hover:shadow-xl'
                }`}
              >
                <Save className="w-5 h-5" />
                {isEditMode ? 'Actualizează Reel' : 'Save Reel'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-[#17386f] text-white rounded-lg hover:bg-[#214a8b] transition-all border border-[#36578f]"
              >
                Cancel
              </button>
            </div>

            {/* Info */}
            <div className="bg-[#102a57] rounded-lg p-4 border border-blue-500/30">
              <p className="text-xs text-blue-300">
                💡 Select a short segment (15-60 seconds) from the course video to create a captivating reel.
                Reels are perfect for highlights and key moments from lessons.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        body.reel-modal-open #root {
          visibility: hidden;
        }

        .slider-green::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5);
        }

        .slider-green::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5);
        }

        .slider-red::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
        }

        .slider-red::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
        }
      `}</style>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
}