import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Star, Users, BookOpen, ExternalLink, Linkedin, Twitter, Globe, UserCircle, Mail } from 'lucide-react';
import { API_BASE_URL, rewriteUrl } from '../config';

// Sub-component to handle isolated loading of detailed course & user data when expanded
const SpeakerDetailedData = ({ speakerId, onCourseClick, courses }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/instructors/${speakerId}/courses-users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        });
        if (res.ok) {
          const payload = await res.json();
          if (isMounted) setData(payload);
        }
      } catch (err) {
        console.error('Failed to load detailed speaker view:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [speakerId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-2">
        <div className="w-6 h-6 border-2 border-[#FF5530] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-white/40">Loading enrolled portfolio...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-xs text-white/30 italic bg-white/5 rounded-lg p-3 text-center border border-dashed border-white/10">
        No active courses detected with enrolled users.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((course) => (
        <div
          key={course.courseId}
          className="bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-[#FF5530]/50 hover:bg-white/10 transition-all group/course"
          onClick={() => {
            if (onCourseClick && courses) {
              // Find the full course object from the courses prop by _id or id
              const fullCourse = courses.find((c: any) => c.id === course.courseId || c._id === course.courseId);
              if (fullCourse) onCourseClick(fullCourse);
            }
          }}
        >
          {/* Course Header Banner */}
          <div className="bg-gradient-to-r from-[#002147] to-transparent p-3 flex items-center gap-3 border-b border-white/5">
            {course.thumbnail?.url ? (
              <img src={rewriteUrl(course.thumbnail.url)} alt="" className="w-10 h-10 rounded object-cover border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center"><BookOpen className="w-4 h-4 text-white/40" /></div>
            )}
            <div className="flex-1 min-w-0">
              <h5 className="text-white font-bold text-sm truncate group-hover/course:text-[#FF5530] transition-colors">{course.courseTitle}</h5>
              <p className="text-[#FF5530] text-[10px] font-bold uppercase tracking-wider">{course.enrollmentCount} Students Enrolled</p>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover/course:text-[#FF5530] transition-colors flex-shrink-0" />
          </div>

          {/* Scrollable User List inside each course */}
          <div className="max-h-40 overflow-y-auto p-2 bg-black/20 space-y-1 custom-scrollbar">
            {course.users && course.users.length > 0 ? (
              course.users.map((user, uIdx) => (
                <div key={uIdx} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#003366] to-[#FF5530]/40 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                    {user.profile?.firstName ? user.profile.firstName[0] : (user.username ? user.username[0].toUpperCase() : '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}` : user.username}</p>
                    <p className="text-white/40 text-[10px] truncate flex items-center gap-1"><Mail className="w-2.5 h-2.5"/> {user.email}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-3 text-[10px] text-white/30 italic">No active enrollments yet.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const SpeakersTab = ({ userPackage, onCourseClick, courses }: { userPackage: string; onCourseClick?: (course: any) => void; courses?: any[] }) => {
  const [speakers, setSpeakers] = useState([]);
  const [expandedSpeakerId, setExpandedSpeakerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const fetchSpeakers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/instructors`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const normalized = Array.isArray(data) ? data : data.data || [];
        setSpeakers(normalized);
      } else {
        setError(`Failed to load speakers (${response.status})`);
      }
    } catch (err) {
      setError('Failed to load speakers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeaker = (speakerId) => {
    setExpandedSpeakerId(expandedSpeakerId === speakerId ? null : speakerId);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#FF5530] animate-spin" />
        </div>
        <p className="text-white/60 text-sm tracking-wider">Loading mentors...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-10 px-4 md:px-8 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white tracking-tight">Meet Our Mentors</h1>
        <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto leading-relaxed text-base md:text-lg">
          Learn from industry experts and successful entrepreneurs who are passionate about sharing their knowledge and experience.
        </p>

        {error && (
          <div className="mb-8 rounded-2xl border border-[#FF5530]/30 bg-[#FF5530]/10 px-6 py-4 text-red-200 text-sm flex items-center gap-3">
            <span className="text-lg">⚠️</span> {error}
          </div>
        )}

        {!error && speakers.length === 0 && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md px-8 py-12 text-center">
            <p className="text-white/80 font-medium text-lg">No mentors available yet.</p>
            <p className="text-white/50 text-sm mt-2 max-w-md mx-auto">Create speakers in the Admin Panel and they will appear here automatically.</p>
          </div>
        )}

        {/* Speakers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start mb-12">
          {speakers.map((speaker) => {
            const isExpanded = expandedSpeakerId === (speaker._id || speaker.id);
            
            return (
              <motion.div
                key={speaker._id || speaker.id}
                layout
                className={`group rounded-2xl border ${isExpanded ? 'border-[#FF5530] bg-[#002147]/80 shadow-[0_10px_30px_rgba(255,85,48,0.15)]' : 'border-white/10 bg-white/[0.02] hover:border-[#FF5530]/50'} backdrop-blur-md overflow-hidden transition-colors duration-300 flex flex-col relative h-auto`}
              >
                {/* Speaker Info Summary - Clickable Area */}
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleSpeaker(speaker._id || speaker.id)}
                >
                  {/* Speaker Image */}
                  <div 
                    className="bg-gradient-to-br from-[#002147] to-[#001733] flex items-center justify-center overflow-hidden relative"
                    style={{ height: '208px', width: '100%' }}
                  >
                    {speaker.profileImage?.url ? (
                      <img
                        src={rewriteUrl(speaker.profileImage.url)}
                        alt={speaker.name}
                        className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                        style={{ height: '208px', width: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#002147] via-[#102a57] to-[#FF5530]/10 flex items-center justify-center relative overflow-hidden" style={{ height: '208px', width: '100%' }}>
                        <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]" />
                        <span className="text-6xl opacity-80 relative z-10 select-none">👤</span>
                      </div>
                    )}
                    
                    <div className="absolute bottom-4 right-4 bg-[#FF5530] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" /> {speaker.rating || 5.0}
                    </div>
                  </div>

                  {/* Essential Info Block */}
                  <div className="p-6 pb-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1 tracking-tight group-hover:text-[#FF5530] transition-colors duration-200">{speaker.name}</h3>
                        <p className="text-[#FF7A59] font-semibold text-sm tracking-wide uppercase">{speaker.title}</p>
                      </div>
                      <div className="p-2 rounded-full bg-white/5 group-hover:bg-[#FF5530]/20 transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-[#FF5530]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-white/50" />
                        )}
                      </div>
                    </div>

                    {/* Mini Stats */}
                    <div className="flex items-center gap-4 mt-4 text-xs text-white/60 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#FF5530]" /> {speaker.students || 0} students
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" /> {speaker.courses?.length || 0} courses
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanding Panel for Details (Exactly like Admin Panel dropdown) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden border-t border-white/10 bg-black/20"
                    >
                      <div className="p-6 space-y-6">
                        {/* Expanded Bio */}
                        <div>
                          <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-2">Biography</h4>
                          <p className="text-white/80 text-sm leading-relaxed">
                            {speaker.bio || 'No extended biography provided yet. Enthusiastic educator committed to empowering students with actionable industry insights and deep practical expertise.'}
                          </p>
                        </div>

                        {/* Socials if present */}
                        {speaker.socialLinks && (speaker.socialLinks.linkedin || speaker.socialLinks.twitter || speaker.socialLinks.website) && (
                          <div>
                            <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">Contact & Links</h4>
                            <div className="flex flex-wrap gap-2">
                              {speaker.socialLinks.linkedin && (
                                <a href={speaker.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A66C2]/20 border border-[#0A66C2]/40 text-[#7abdfa] hover:bg-[#0A66C2] hover:text-white rounded-lg text-xs font-bold transition-all">
                                  <Linkedin className="w-3 h-3" /> LinkedIn
                                </a>
                              )}
                              {speaker.socialLinks.twitter && (
                                <a href={speaker.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black rounded-lg text-xs font-bold transition-all">
                                  <Twitter className="w-3 h-3" /> X
                                </a>
                              )}
                              {speaker.socialLinks.website && (
                                <a href={speaker.socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5530]/20 border border-[#FF5530]/40 text-[#ff9d85] hover:bg-[#FF5530] hover:text-white rounded-lg text-xs font-bold transition-all">
                                  <Globe className="w-3 h-3" /> Website
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Advanced Details - Courses & User Registries */}
                        <div>
                          <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">Detailed Analytics & Enrolled Students</h4>
                          <SpeakerDetailedData speakerId={speaker._id || speaker.id} onCourseClick={onCourseClick} courses={courses} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { SpeakersTab };

