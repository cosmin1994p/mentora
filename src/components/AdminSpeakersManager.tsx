import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Plus, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { API_BASE_URL, rewriteUrl } from '../config';

interface Speaker {
  _id?: string;
  id?: string;
  name: string;
  title: string;
  bio: string;
  profileImage?: { url: string };
  rating?: number;
  reviewCount?: number;
  students?: number;
  courses?: any[];
}

interface SpeakerUsers {
  courseId: string;
  courseTitle: string;
  users: any[];
}

export function AdminSpeakersManager() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [expandedSpeaker, setExpandedSpeaker] = useState<string | null>(null);
  const [speakerCourses, setSpeakerCourses] = useState<SpeakerUsers[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    bio: ''
  });

  const authToken = localStorage.getItem('authToken') || localStorage.getItem('token') || '';

  useEffect(() => {
    fetchSpeakers();
  }, []);

  useEffect(() => {
    if (!showForm) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showForm]);

  const fetchSpeakers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/instructors`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSpeakers(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch speakers:', error);
      toast.error('Failed to load speakers');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('title', formData.title);
      payload.append('bio', formData.bio);
      if (selectedImageFile) {
        payload.append('profileImage', selectedImageFile);
      }

      if (editingId) {
        // Update speaker
        await fetch(`${API_BASE_URL}/instructors/${editingId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: payload
        });
        toast.success('Speaker updated successfully');
      } else {
        // Create new speaker
        await fetch(`${API_BASE_URL}/instructors`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: payload
        });
        toast.success('Speaker created successfully');
      }
      
      setShowForm(false);
      setEditingId(null);
      setSelectedImageFile(null);
      setImagePreviewUrl('');
      setFormData({ name: '', title: '', bio: '' });
      fetchSpeakers();
    } catch (error) {
      console.error('Failed to save speaker:', error);
      toast.error('Failed to save speaker');
    }
  };

  const handleEdit = (speaker: Speaker) => {
    setFormData({
      name: speaker.name,
      title: speaker.title,
      bio: speaker.bio
    });
    setSelectedImageFile(null);
    setImagePreviewUrl(speaker.profileImage?.url ? rewriteUrl(speaker.profileImage.url) : '');
    setEditingId(speaker._id || speaker.id || null);
    setShowForm(true);
  };

  const handleDelete = async (speakerId: string) => {
    if (!window.confirm('Are you sure you want to delete this speaker?')) return;
    
    try {
      await fetch(`${API_BASE_URL}/instructors/${speakerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      toast.success('Speaker deleted successfully');
      fetchSpeakers();
    } catch (error) {
      console.error('Failed to delete speaker:', error);
      toast.error('Failed to delete speaker');
    }
  };

  const handleExpandDetails = async (speaker: Speaker) => {
    const speakerId = speaker._id || speaker.id;
    if (expandedSpeaker === speakerId) {
      setExpandedSpeaker(null);
    } else {
      setExpandedSpeaker(speakerId);
      // Fetch courses and users for this speaker
      try {
        const response = await fetch(`${API_BASE_URL}/instructors/${speakerId}/courses-users`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setSpeakerCourses(Array.isArray(data) ? data : data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch speaker courses:', error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading speakers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">Speakers</h2>
          <p className="text-gray-400">Manage instructors and speakers</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setSelectedImageFile(null);
            setImagePreviewUrl('');
            setFormData({ name: '', title: '', bio: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF5530] hover:bg-green-700 rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Speaker
        </button>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <motion.div
              className="bg-[#122b58] rounded-2xl p-6 md:p-7 max-w-xl w-full shadow-[0_20px_60px_rgba(0,0,0,0.45)] border border-white/20"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white tracking-tight">{editingId ? 'Edit Speaker' : 'Add New Speaker'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-300 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <label className="block text-xs uppercase tracking-wide text-white/70">Name</label>
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="w-full px-3 py-2.5 bg-[#0d234a] rounded-lg border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5530]/50"
              />

              <label className="block text-xs uppercase tracking-wide text-white/70">Bio</label>
              <textarea
                placeholder="Bio"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={3}
                className="w-full px-3 py-2.5 bg-[#0d234a] rounded-lg border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5530]/50"
              />

              {imagePreviewUrl && (
                <div className="flex justify-center mb-2">
                  <div className="rounded-lg border border-white/20 p-2 bg-[#0f2550] inline-block shadow-inner">
                    <img 
                      src={imagePreviewUrl} 
                      alt="Preview" 
                      style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                      className="rounded-md" 
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-2">Profile Image</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedImageFile(file);
                    if (file) {
                      setImagePreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-[#0d234a] rounded-lg border border-white/20 text-white file:mr-3 file:rounded file:border-0 file:bg-[#FF5530] file:px-3 file:py-1 file:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#FF5530] hover:bg-[#ff6d4d] text-white rounded-lg font-semibold transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speakers List */}
      <div className="space-y-3">
        {speakers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No speakers found. Create one to get started!
          </div>
        ) : (
          speakers.map((speaker) => (
            <motion.div
              key={speaker._id || speaker.id}
              className="bg-[#1b2f5f] rounded-lg border border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-all"
              layout
            >
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#23407d]" onClick={() => handleExpandDetails(speaker)}>
                <div className="flex items-center gap-4 flex-1">
                  {speaker.profileImage?.url ? (
                    <img 
                      src={rewriteUrl(speaker.profileImage.url)} 
                      alt={speaker.name} 
                      className="rounded-full object-cover border-2 border-blue-500"
                      style={{ width: '56px', height: '56px' }}
                    />
                  ) : (
                    <div className="rounded-full bg-gradient-to-br from-[#002147] to-[#FF5530] flex items-center justify-center text-white font-bold text-lg" style={{ width: '56px', height: '56px' }}>
                      {speaker.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white">{speaker.name}</h3>
                    {speaker.title && <p className="text-gray-300 text-sm">{speaker.title}</p>}
                    {speaker.bio && <p className="text-gray-400 text-xs mt-1 line-clamp-1">{speaker.bio}</p>}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-sm font-semibold text-blue-300">{speaker.students || 0}</span>
                    <span className="text-xs text-gray-400">students</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="block text-sm font-semibold text-yellow-300">⭐ {(speaker.rating || 5.0).toFixed(1)}</span>
                    <span className="text-xs text-gray-400">{speaker.reviewCount || 0} reviews</span>
                  </div>

                  <div className="text-right">
                    <span className="block text-sm font-semibold text-green-300">{speaker.courses?.length || 0}</span>
                    <span className="text-xs text-gray-400">courses</span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(speaker);
                    }}
                    className="p-2 hover:bg-[#003366] rounded transition-colors text-gray-200"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(speaker._id || speaker.id || '');
                    }}
                    className="p-2 hover:bg-[#B54236] rounded transition-colors text-gray-200"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-300 transition-transform ${expandedSpeaker === (speaker._id || speaker.id) ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {expandedSpeaker === (speaker._id || speaker.id) && (
                <motion.div className="border-t border-white/10 p-6 bg-[#14264d]" initial={{ height: 0 }} animate={{ height: 'auto' }}>
                  {speaker.bio && (
                    <div className="mb-6 pb-6 border-b border-white/10">
                      <h4 className="font-semibold text-gray-200 mb-2">Bio</h4>
                      <p className="text-gray-300 text-sm">{speaker.bio}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-bold text-white mb-4 text-lg">📚 Courses & Enrolled Users</h4>
                    {speakerCourses.length > 0 ? (
                      <div className="space-y-3">
                        {speakerCourses.map((courseData) => (
                          <div key={courseData.courseId} className="bg-[#1b2f5f] p-4 rounded-lg border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-semibold text-white">{courseData.courseTitle}</h5>
                              <span className="bg-[#002147]/30 text-[#FF5530] px-3 py-1 rounded-full text-sm font-semibold">
                                {courseData.users.length} enrolled
                              </span>
                            </div>
                            {courseData.users.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {courseData.users.map((user, idx) => (
                                  <div key={idx} className="bg-[#132445] p-2 rounded text-sm">
                                    <p className="font-medium text-white">👤 {user.username}</p>
                                    <p className="text-gray-300 text-xs truncate">{user.email}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-300 italic">No users enrolled yet</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-300">No courses found</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
