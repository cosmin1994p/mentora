import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminCourseEditor = ({ courseId }) => {
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Chapters state
  const [chapters, setChapters] = useState([]);
  const [newChapterName, setNewChapterName] = useState('');
  const [showNewChapterForm, setShowNewChapterForm] = useState(false);
  
  // New lesson state (with chapter and thumbnail)
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    duration: 0,
    chapter: null,
    order: 1
  });
  
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchSpeakers();
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  useEffect(() => {
    // Extract unique chapters from lessons
    const uniqueChapters = [];
    const chapterMap = {};
    
    lessons.forEach(lesson => {
      if (lesson.chapter && lesson.chapter.name && !chapterMap[lesson.chapter.name]) {
        chapterMap[lesson.chapter.name] = {
          name: lesson.chapter.name,
          order: lesson.chapter.order || Object.keys(chapterMap).length + 1
        };
        uniqueChapters.push(chapterMap[lesson.chapter.name]);
      }
    });
    
    setChapters(uniqueChapters.sort((a, b) => (a.order || 0) - (b.order || 0)));
  }, [lessons]);

  const fetchSpeakers = async () => {
    try {
      const response = await axios.get('/api/instructors');
      setSpeakers(response.data);
    } catch (error) {
      console.error('Failed to load speakers:', error);
    }
  };

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/courses/v2/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCourse(response.data);
      // Fetch lessons separately if lessonsArray is not populated
      if (response.data.lessonsArray && Array.isArray(response.data.lessonsArray)) {
        setLessons(response.data.lessonsArray);
      } else {
        // Fallback: fetch lessons from the lessons endpoint
        const lessonsRes = await axios.get(`/api/courses/v2/${courseId}/lessons`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setLessons(lessonsRes.data || []);
      }
      setSelectedSpeakers(response.data.instructors?.map(i => i._id) || []);
    } catch (error) {
      console.error('Failed to load course:', error);
      // Try legacy endpoint as fallback
      try {
        const legacyRes = await axios.get(`/api/courses/${courseId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setCourse(legacyRes.data.course || legacyRes.data);
        setLessons(legacyRes.data.course?.lessonsArray || []);
      } catch (e) {
        console.error('Failed to load course from legacy endpoint:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!newChapterName.trim()) return;
    
    const newChapter = {
      name: newChapterName,
      order: chapters.length + 1
    };
    
    setChapters([...chapters, newChapter]);
    setNewChapterName('');
    setShowNewChapterForm(false);
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('title', newLesson.title);
      formData.append('description', newLesson.description);
      formData.append('order', newLesson.order);
      formData.append('duration', newLesson.duration);

      // Add chapter data if selected
      if (newLesson.chapter) {
        formData.append('chapter', JSON.stringify(newLesson.chapter));
      }

      if (videoFile) {
        formData.append('video', videoFile);
      }
      
      // Add thumbnail if selected
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      const response = await axios.post(
        `/api/courses/admin/${courseId}/lessons`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        }
      );

      setLessons([...lessons, response.data.lesson]);
      setNewLesson({
        title: '',
        description: '',
        duration: 0,
        chapter: null,
        order: lessons.length + 2
      });
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Failed to add lesson:', error);
      alert(error.response?.data?.error || 'Failed to add lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Ești sigur că vrei să ștergi această lecție?')) return;

    try {
      await axios.delete(`/api/courses/admin/${courseId}/lessons/${lessonId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setLessons(lessons.filter(l => l._id !== lessonId));
    } catch (error) {
      console.error('Failed to delete lesson:', error);
      alert(error.response?.data?.error || 'Failed to delete lesson');
    }
  };

  const handleUpdateCourseBasics = async () => {
    if (!course) return;

    setSaving(true);
    try {
      const response = await axios.put(
        `/api/courses/admin/${courseId}`,
        {
          title: course.title,
          description: course.description,
          instructors: selectedSpeakers,
          level: course.level,
          packageTiers: course.packageTiers,
          isFree: course.isFree,
          expirationDate: course.expirationDate,
          previewDuration: course.previewDuration
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setCourse(response.data);
      alert('Course updated successfully');
    } catch (error) {
      console.error('Failed to update course:', error);
      alert(error.response?.data?.error || 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading course...</div>;
  }

  if (!courseId && !course) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Create New Course</h2>
        <form className="bg-white rounded-lg p-6 shadow-md space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Course Title</label>
            <input
              type="text"
              value={course?.title || ''}
              onChange={(e) =>
                setCourse({ ...course, title: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Creative Leadership Masterclass"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              value={course?.description || ''}
              onChange={(e) =>
                setCourse({ ...course, description: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>

          <button
            onClick={handleUpdateCourseBasics}
            className="bg-[#002147] text-white px-6 py-2 rounded-lg hover:bg-[#003366]"
          >
            Create Course
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📚 Course: {course?.title}</h1>

      {/* Course Basics */}
      <div className="bg-white rounded-lg p-6 shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4">Course Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Title</label>
            <input
              type="text"
              value={course?.title || ''}
              onChange={(e) =>
                setCourse({ ...course, title: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Level</label>
            <select
              value={course?.level || 'Beginner'}
              onChange={(e) =>
                setCourse({ ...course, level: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Speakers</label>
            <select
              multiple
              value={selectedSpeakers}
              onChange={(e) => {
                const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedSpeakers(selectedValues);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              size={Math.min(speakers.length || 1, 5)}
            >
              {speakers.map((speaker) => (
                <option key={speaker._id} value={speaker._id}>
                  {speaker.name} - {speaker.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              💡 Hold Ctrl (or Cmd) to select multiple speakers
            </p>
            {selectedSpeakers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedSpeakers.map(speakerId => {
                  const speaker = speakers.find(s => s._id === speakerId);
                  return speaker ? (
                    <span key={speakerId} className="bg-[#002147]/10 text-[#003366] px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                      {speaker.name}
                      <button
                        type="button"
                        onClick={() => setSelectedSpeakers(selectedSpeakers.filter(id => id !== speakerId))}
                        className="text-[#002147] hover:text-[#003366] font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Package Tiers</label>
            <div className="space-y-2">
              {['Free', 'Starter', 'Growth', 'Enterprise', 'Elite'].map((tier) => (
                <label key={tier} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={course?.packageTiers?.includes(tier) || false}
                    onChange={(e) => {
                      const tiers = course?.packageTiers || [];
                      if (e.target.checked) {
                        setCourse({ ...course, packageTiers: [...tiers, tier] });
                      } else {
                        setCourse({
                          ...course,
                          packageTiers: tiers.filter(t => t !== tier)
                        });
                      }
                    }}
                  />
                  <span className="text-sm">{tier}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            value={course?.description || ''}
            onChange={(e) =>
              setCourse({ ...course, description: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
            rows={4}
          />
        </div>

        <button
          onClick={handleUpdateCourseBasics}
          disabled={saving}
          className="mt-4 bg-[#002147] text-white px-6 py-2 rounded-lg hover:bg-[#003366] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Course Details'}
        </button>
      </div>

      {/* Chapters & Lessons Structure */}
      <div className="bg-white rounded-lg p-6 shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4">📚 Capitole cu Lecții ({chapters.length} Capitole, {lessons.length} Lecții)</h2>

        {chapters.length === 0 && lessons.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Nicio lecție încă. Adaugă un capitol și lecții mai jos!</p>
        ) : (
          <div className="space-y-4">
            {/* Display chapters with their lessons */}
            {chapters.map((chapter, chapterIdx) => {
              const chapterLessons = lessons.filter(l => l.chapter?.name === chapter.name).sort((a, b) => a.order - b.order);
              return (
                <div key={chapterIdx} className="border-2 border-blue-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-100 px-4 py-3 border-b-2 border-blue-200">
                    <h3 className="font-bold text-lg text-[#002147]">
                      📖 {chapter.name}
                      <span className="ml-2 text-sm font-normal text-[#003366]">{chapterLessons.length} lecții)</span>
                    </h3>
                  </div>
                  
                  {chapterLessons.length === 0 ? (
                    <div className="px-4 py-3 text-gray-500 text-sm italic">
                      Nicio lecție în acest capitol. Adaugă lecții folosind formularul de mai jos.
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      {chapterLessons.map((lesson) => (
                        <div key={lesson._id} className="bg-gradient-to-r from-gray-50 to-white p-3 rounded border border-gray-200 hover:border-blue-300 transition">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-[#002147] text-white px-2 py-1 rounded text-xs font-bold">
                                  L{lesson.order}
                                </span>
                                <h4 className="font-semibold text-gray-800">{lesson.title}</h4>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{lesson.description}</p>
                              <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                                <span>⏱️ {lesson.duration ? Math.round(lesson.duration / 60) : 0} min</span>
                                {lesson.thumbnail ? (
                                  <span className="text-[#FF5530] flex items-center gap-1">
                                    🖼️ Thumbnail
                                  </span>
                                ) : (
                                  <span className="text-gray-400">No thumbnail</span>
                                )}
                                {lesson.hlsReady ? (
                                  <span className="text-[#FF5530]">✅ HLS Ready</span>
                                ) : lesson.video ? (
                                  <span className="text-yellow-600">⏳ Processing...</span>
                                ) : (
                                  <span className="text-gray-400">📹 No video</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteLesson(lesson._id)}
                              className="text-[#FF5530] hover:text-[#B54236] text-sm font-semibold ml-2"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Display uncategorized lessons (without a chapter) */}
            {lessons.some(l => !l.chapter?.name) && (
              <div className="border-2 border-[#FF5530]/30 rounded-lg overflow-hidden bg-[#FF5530]/5">
                <div className="bg-[#FF5530]/10 px-4 py-3 border-b-2 border-[#FF5530]/30">
                  <h3 className="font-bold text-lg text-[#B54236]">
                    ⚠️ Lecții Fără Capitol
                    <span className="ml-2 text-sm font-normal text-[#FF5530]/80">({lessons.filter(l => !l.chapter?.name).length})</span>
                  </h3>
                </div>
                <div className="space-y-2 p-4">
                  {lessons
                    .filter(l => !l.chapter?.name)
                    .sort((a, b) => a.order - b.order)
                    .map((lesson) => (
                    <div key={lesson._id} className="bg-white p-3 rounded border border-[#FF5530]/20">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-[#FF5530] text-white px-2 py-1 rounded text-xs font-bold">
                              L{lesson.order}
                            </span>
                            <h4 className="font-semibold text-gray-800">{lesson.title}</h4>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{lesson.description}</p>
                          <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                            <span>⏱️ {lesson.duration ? Math.round(lesson.duration / 60) : 0} min</span>
                            {lesson.thumbnail ? (
                              <span className="text-[#FF5530]">🖼️ Thumbnail</span>
                            ) : (
                              <span className="text-gray-400">No thumbnail</span>
                            )}
                            {lesson.hlsReady ? (
                              <span className="text-[#FF5530]">✅ HLS Ready</span>
                            ) : lesson.video ? (
                              <span className="text-yellow-600">⏳ Processing...</span>
                            ) : (
                              <span className="text-gray-400">📹 No video</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteLesson(lesson._id)}
                          className="text-[#FF5530] hover:text-[#B54236] text-sm font-semibold ml-2"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Lesson Form */}
        <div className="border-t pt-6 mt-6">
          <h3 className="font-semibold text-lg mb-4">➕ Add New Lesson</h3>
          <form onSubmit={handleAddLesson} className="space-y-4">
            {/* Chapter Selection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-3">📚 Select Chapter</h4>
              
              {chapters.length === 0 ? (
                <p className="text-sm text-gray-600 mb-3">No chapters yet. Create one first:</p>
              ) : (
                <div className="mb-3 space-y-2">
                  {chapters.map((chapter, idx) => (
                    <label key={idx} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="chapter"
                        checked={newLesson.chapter?.name === chapter.name}
                        onChange={() => setNewLesson({ 
                          ...newLesson, 
                          chapter: { name: chapter.name, order: chapter.order }
                        })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{chapter.name}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {showNewChapterForm ? (
                <form onSubmit={handleAddChapter} className="flex gap-2">
                  <input
                    type="text"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    placeholder="e.g., Capitol 1 - Fundamentals"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#002147] text-white rounded-lg text-sm font-semibold hover:bg-[#003366]"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewChapterForm(false);
                      setNewChapterName('');
                    }}
                    className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewChapterForm(true)}
                  className="text-sm text-[#002147] hover:text-[#003366] font-semibold"
                >
                  + Create New Chapter
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Lesson Title *</label>
                <input
                  type="text"
                  required
                  value={newLesson.title}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Lesson 1 - Introduction"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  value={newLesson.duration}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, duration: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="1200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  = {Math.round(newLesson.duration / 60)} minutes
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea
                value={newLesson.description}
                onChange={(e) =>
                  setNewLesson({ ...newLesson, description: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="Lesson description..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Video File * (MP4, WebM, etc.)</label>
              <input
                type="file"
                accept="video/*"
                required
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {videoFile && (
                <p className="text-xs text-[#FF5530] mt-1">
                  ✅ {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Thumbnail (Optional - JPG, PNG, WebP)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {thumbnailFile && (
                <p className="text-xs text-[#FF5530] mt-1">
                  ✅ {thumbnailFile.name} ({(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold">Upload Progress</span>
                  <span className="text-xs font-semibold">{uploadProgress}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#FF5530] h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !newLesson.title || !videoFile || !newLesson.chapter}
              className="w-full bg-[#FF5530] text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold transition"
            >
              {saving ? `Uploading... ${uploadProgress}%` : '➕ Add Lesson'}
            </button>
          </form>
        </div>
      </div>

      {/* Course Structure Preview */}
      <div className="bg-gradient-to-r from-[#002147]/5 to-[#FF5530]/5 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold mb-4">📊 Course Structure Preview</h2>
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">{course?.title}</h3>
            <span className="bg-[#002147]/10 text-[#003366] px-3 py-1 rounded-full text-sm font-semibold">
              {lessons.length} lessons
            </span>
          </div>
          <div className="space-y-2">
            {lessons.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Add lessons above to see course structure</p>
            ) : (
              lessons
                .sort((a, b) => a.order - b.order)
                .map((lesson) => (
                  <div key={lesson._id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                    <span className="bg-[#FF5530] text-white px-2 py-1 rounded text-xs font-bold">
                      {lesson.order}
                    </span>
                    <span className="flex-1">{lesson.title}</span>
                    <span className="text-gray-500 text-sm">⏱️ {Math.round((lesson.duration || 0) / 60)} min</span>
                  </div>
                ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              <strong>Total Duration:</strong> {Math.round(
                lessons.reduce((sum, l) => sum + (l.duration || 0), 0) / 60
              )} minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCourseEditor;
