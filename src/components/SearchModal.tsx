import { X, Search, Play, Clock, TrendingUp } from 'lucide-react';
import { Course } from '../App';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchModalProps {
  courses: Course[];
  onClose: () => void;
  onCourseSelect: (courseId: string) => void;
}

export function SearchModal({ courses, onClose, onCourseSelect }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Leadership',
    'Productivity',
    'Mindfulness'
  ]);
  const [trendingSearches] = useState<string[]>([
    'Public Speaking',
    'Time Management',
    'Emotional Intelligence',
    'Negotiation'
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on input when modal opens
    inputRef.current?.focus();

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      
      // Normalize function to remove diacritics
      const normalize = (str: string) => {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
      };
      
      const normalizedQuery = normalize(query);
      
      const results = courses.filter(course => {
        const normalizedTitle = normalize(course.title);
        const normalizedInstructor = normalize(course.instructor);
        const normalizedDescription = normalize(course.description);
        const normalizedCategory = normalize(course.category);
        
        return (
          normalizedTitle.includes(normalizedQuery) ||
          normalizedInstructor.includes(normalizedQuery) ||
          normalizedDescription.includes(normalizedQuery) ||
          normalizedCategory.includes(normalizedQuery) ||
          course.tags.some(tag => normalize(tag).includes(normalizedQuery))
        );
      });
      setFilteredCourses(results);
    } else {
      setFilteredCourses([]);
    }
  }, [searchQuery, courses]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleCourseClick = (courseId: string) => {
    onCourseSelect(courseId);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#002147]/95 backdrop-blur-sm z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-screen px-4 py-12">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="search cursuri, instructori, categorii..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-[#002147] border-2 border-gray-700 focus:border-white rounded-lg pl-16 pr-6 py-5 text-xl outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 bg-[#000000] hover:bg-[#002147] rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Results */}
          <AnimatePresence mode="wait">
            {searchQuery.trim() ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h3 className="text-sm text-gray-400 mb-4">
                  {filteredCourses.length} results găsite
                </h3>
                
                {filteredCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCourses.map((course) => (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleCourseClick(course.id)}
                        className="bg-[#002147] rounded-lg overflow-hidden cursor-pointer group hover:bg-[#002147] transition-all"
                      >
                        <div className="flex gap-4 p-4">
                          <div className="w-32 h-20 rounded overflow-hidden flex-shrink-0 relative">
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-[#002147]/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                              <Play className="w-8 h-8 text-white fill-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold mb-1 line-clamp-1">{course.title}</h4>
                            <p className="text-sm text-gray-400 mb-2">{course.instructor}</p>
                            <div className="flex flex-wrap gap-2">
                              {course.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-white/10 rounded text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nu am găsit cursuri care să corespundă căutării tale</p>
                    <p className="text-sm text-gray-500 mt-2">Încearcă alte cuvinte cheie</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="suggestions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <h3 className="text-sm text-gray-400">Căutări Recente</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {recentSearches.map((search, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSearchQuery(search)}
                          className="px-4 py-2 bg-[#002147] hover:bg-[#002147] rounded-full text-sm transition-all"
                        >
                          {search}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Searches */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[#FF5530]" />
                    <h3 className="text-sm text-gray-400">Trending Acum</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {trendingSearches.map((search, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSearchQuery(search)}
                        className="px-4 py-2 bg-[#002147] hover:bg-[#FF5530] rounded-full text-sm transition-all"
                      >
                        {search}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Popular Courses */}
                <div>
                  <h3 className="text-sm text-gray-400 mb-4">Courses Populare</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {courses.slice(0, 4).map((course, index) => (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleCourseClick(course.id)}
                        className="cursor-pointer group"
                      >
                        <div className="relative rounded overflow-hidden mb-2">
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full aspect-video object-cover"
                          />
                          <div className="absolute inset-0 bg-[#002147]/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <Play className="w-10 h-10 text-white fill-white" />
                          </div>
                        </div>
                        <h4 className="text-sm font-semibold line-clamp-2 mb-1">
                          {course.title}
                        </h4>
                        <p className="text-xs text-gray-400">{course.instructor}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}