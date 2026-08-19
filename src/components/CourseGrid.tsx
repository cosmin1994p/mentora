import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Course } from '../App';
import { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AnimatedFolder } from './ui/3d-folder';
import { useLazyImage } from '../hooks/useMediaLoading';
import { BASE_URL } from '../config';
import { apiService } from '../utils/api';
import { toast } from 'sonner';

interface CourseGridProps {
  title: string;
  category: string;
  onCourseClick: (course: Course) => void;
  onPlay: (course: Course) => void;
  onEnroll: (courseId: string) => void;
  showProgress?: boolean;
  courses: Course[];
}

// Default courses with tags
const defaultCourses: Course[] = [
  {
    id: '1',
    title: 'Culinary Fundamentals',
    instructor: 'Gordon Ramsay',
    thumbnail: 'https://images.unsplash.com/photo-1681270543584-8e541a1bb056?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVmJTIwY29va2luZ3xlbnwxfHx8fDE3NjU2OTcxMTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '4h 12m',
    lessons: 20,
    category: 'culinary',
    description: 'Stăpânește tehnicile esențiale de gătit care vor ridica preparatele tale la nivel de restaurant.',
    rating: 4.8,
    students: 98200,
    progress: 0,
    tags: ['cooking', 'culinary', 'chef', 'food', 'practical'],
    enrolled: false
  },
  {
    id: '2',
    title: 'Photography Masterclass',
    instructor: 'Annie Leibovitz',
    thumbnail: 'https://images.unsplash.com/photo-1622319977720-9949ac28adc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoeSUyMGNhbWVyYXxlbnwxfHx8fDE3NjU2NzYzOTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '3h 45m',
    lessons: 18,
    category: 'creative',
    description: 'Învață să capturezi imagini puternice care spun povești captivante.',
    rating: 4.9,
    students: 145000,
    progress: 35,
    tags: ['photography', 'creative', 'artistic', 'visual', 'inspiring'],
    enrolled: true
  },
  {
    id: '3',
    title: 'Producție Muzicală',
    instructor: 'Deadmau5',
    thumbnail: 'https://images.unsplash.com/photo-1727831140213-18650ae7ef36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpY2lhbiUyMHBlcmZvcm1pbmd8ZW58MXx8fHwxNzY1NzQ5OTY0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '5h 30m',
    lessons: 23,
    category: 'creative',
    description: 'Creează muzică electronică profesională din propriul studio de acasă.',
    rating: 4.7,
    students: 87500,
    progress: 60,
    tags: ['music', 'creative', 'production', 'tech', 'intensive'],
    enrolled: true
  },
  {
    id: '4',
    title: 'Scriere Creativă',
    instructor: 'Margaret Atwood',
    thumbnail: 'https://images.unsplash.com/photo-1582812532891-7968f272fc9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3cml0ZXIlMjBkZXNrfGVufDF8fHx8MTc2NTc0OTk2NHww&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '3h 15m',
    lessons: 16,
    category: 'creative',
    description: 'Dezvoltă-ți vocea unică și învață arta povestirii.',
    rating: 4.9,
    students: 112000,
    progress: 15,
    tags: ['writing', 'creative', 'storytelling', 'relaxing', 'inspiring'],
    enrolled: true
  },
  {
    id: '5',
    title: 'Fundamentele Filmării',
    instructor: 'Martin Scorsese',
    thumbnail: 'https://images.unsplash.com/photo-1577190651915-bf62d54d5b36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWxtJTIwZGlyZWN0b3J8ZW58MXx8fHwxNzY1NzAyNzY4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '4h 20m',
    lessons: 25,
    category: 'creative',
    description: 'Învață arta și meșteșugul cinematografiei de la un regizor legendar.',
    rating: 5.0,
    students: 156000,
    progress: 0,
    tags: ['film', 'creative', 'directing', 'artistic', 'advanced'],
    enrolled: false
  },
  {
    id: '6',
    title: 'Strategie Business',
    instructor: 'Bob Iger',
    thumbnail: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjU3MzQ5MTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '2h 50m',
    lessons: 15,
    category: 'business',
    description: 'Lessons de leadership de la fostul CEO al Disney.',
    rating: 4.8,
    students: 95000,
    progress: 0,
    tags: ['business', 'leadership', 'strategy', 'motivational', 'success'],
    enrolled: false
  },
  {
    id: '7',
    title: 'Design Interior',
    instructor: 'Kelly Wearstler',
    thumbnail: 'https://images.unsplash.com/photo-1716703435551-4326ab111ae2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ24lMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzY1Njk3NDE1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '3h 40m',
    lessons: 19,
    category: 'creative',
    description: 'Creează spații uimitoare cu încredere și stil.',
    rating: 4.8,
    students: 67000,
    progress: 0,
    tags: ['design', 'creative', 'interior', 'artistic', 'practical'],
    enrolled: false
  },
  {
    id: '8',
    title: 'Design Fashion',
    instructor: 'Marc Jacobs',
    thumbnail: 'https://images.unsplash.com/photo-1557777586-f6682739fcf3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwZGVzaWdufGVufDF8fHx8MTc2NTY4NjY5MHww&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '4h 15m',
    lessons: 22,
    category: 'creative',
    description: 'De la concept la podium: procesul complet de design.',
    rating: 4.9,
    students: 89000,
    progress: 0,
    tags: ['fashion', 'design', 'creative', 'artistic', 'inspiring'],
    enrolled: false
  },
  {
    id: '9',
    title: 'Development Web',
    instructor: 'John Doe',
    thumbnail: 'https://images.unsplash.com/photo-1595623654300-b27329804025?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwY29kZXxlbnwxfHx8fDE3NjU3NTQ4MjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '6h 0m',
    lessons: 35,
    category: 'tech',
    description: 'Construiește aplicații web moderne de la zero.',
    rating: 4.7,
    students: 102000,
    progress: 0,
    tags: ['tech', 'programming', 'web', 'innovation', 'challenging'],
    enrolled: false
  },
  {
    id: '10',
    title: 'Fitness & Nutriție',
    instructor: 'Serena Williams',
    thumbnail: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjB0cmFpbmluZ3xlbnwxfHx8fDE3NjU3MTE2NTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '3h 20m',
    lessons: 18,
    category: 'trending',
    description: 'Antrenează-te ca un campion și optimizează-ți nutriția.',
    rating: 4.9,
    students: 134000,
    progress: 0,
    tags: ['fitness', 'health', 'workout', 'motivational', 'intensive'],
    enrolled: false
  }
];

export function CourseGrid({ title, category, onCourseClick, onPlay, onEnroll, showProgress, courses: providedCourses }: CourseGridProps) {
  // Call all hooks FIRST before any conditional logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Use ONLY courses provided from API - no hardcoded fallbacks
  const allCourses = providedCourses;
  const courses = category === 'recommended'
    ? allCourses
    : category === 'featured'
      ? allCourses.slice(0, 10)
      : allCourses.filter(c => c.category === category || c.category.includes(category.split('&')[0].trim().toLowerCase()));

  const checkScrollability = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const isScrollable = scrollWidth > clientWidth;

    setCanScrollLeft(isScrollable && scrollLeft > 0);
    setCanScrollRight(isScrollable && scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === 'left' ? -1000 : 1000;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleScroll = () => {
    checkScrollability();
  };

  // Check scrollability on mount and resize - HOOK CALL FIRST
  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollability();
    }, 100);

    const handleResize = () => {
      checkScrollability();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [courses]);

  // NOW check for conditional rendering AFTER all hooks
  if (courses.length === 0) return null;

  // Check if this is the completed courses section
  const isCompletedSection = (title === 'Completate' || title === 'Completed') && courses.some(c => c.progress === 100 && c.quizCompleted);

  // If completed section and we have completed courses, use 3D folder view
  if (isCompletedSection && courses.length > 0) {
    const completedProjects = courses.slice(0, 9).map(course => ({
      id: course.id,
      image: course.thumbnail,
      title: course.title
    }));

    return (
      <div className="mb-8">
        <h2 className="mb-6 px-4 md:px-0 text-xl md:text-2xl">{title}</h2>
        <div className="flex justify-center">
          <AnimatedFolder
            title={`${courses.length} Completed Courses`}
            projects={completedProjects}
            className="max-w-4xl"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative group/slider mb-8">
      <h2 className="mb-4 px-4 md:px-0 text-xl md:text-2xl">{title}</h2>

      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-16 h-full bg-[#002147]/50 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#002147]/70"
        >
          <ChevronLeft className="w-12 h-12" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-16 h-full bg-[#002147]/50 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#002147]/70"
        >
          <ChevronRight className="w-12 h-12" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth px-4 md:px-0 pb-4"
      >
        {courses.map((course, index) => (
          <CourseCard
            key={course.id}
            course={course}
            onCourseClick={onCourseClick}
            onPlay={onPlay}
            onEnroll={onEnroll}
            showProgress={showProgress}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

// CourseCard Component with Netflix preview
function CourseCard({
  course,
  onCourseClick,
  onPlay,
  onEnroll,
  showProgress,
  index
}: {
  course: Course;
  onCourseClick: (course: Course) => void;
  onPlay: (course: Course) => void;
  onEnroll: (courseId: string) => void;
  showProgress?: boolean;
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazy load thumbnail image
  const { imageSrc, isLoading } = useLazyImage({
    src: (() => {
      const url = course.thumbnail;
      if (!url) return '';
      return url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    })(),
    cacheId: `course-${course.id}-thumb`
  });

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  // Handle video time update - pause at 15 seconds
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= 15) {
      videoRef.current.pause();
    }
  };

  const previewVideoUrl = (() => {
    const url = course.videoUrl;
    if (!url) return null;
    return url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  })();

  const handleMouseEnter = () => {
    setIsHovered(true);

    hoverTimeoutRef.current = setTimeout(() => {
      setShowPreview(true);
      if (videoRef.current && previewVideoUrl) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => { });
      }
    }, 800); // 800ms delay before preview starts
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowPreview(false);

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleQuickUpgrade = async (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Default to the first package tier required by the course, or 'Pro'
    const targetTier = (course.packageTiers && course.packageTiers.length > 0) 
      ? course.packageTiers[0] 
      : 'Pro';

    try {
      toast.loading('Sending upgrade request...', { id: 'upgrade-req' });
      await apiService.request('/upgrade-requests', {
        method: 'POST',
        body: JSON.stringify({
          desiredPackage: targetTier,
          message: `Quick upgrade request for course: ${course.title}`
        })
      });
      toast.success('Upgrade request sent successfully! We will contact you soon.', { id: 'upgrade-req' });
    } catch (error) {
      console.error('Quick upgrade failed:', error);
      toast.error('Failed to send upgrade request. Please try again.', { id: 'upgrade-req' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (!course.isLocked) {
          onCourseClick(course);
        }
      }}
      className="flex-shrink-0 w-[200px] md:w-[280px] lg:w-[320px] cursor-pointer netflix-card-hover relative"
    >
      <div className="relative aspect-video mb-2 rounded overflow-hidden netflix-shadow">
        {/* Thumbnail Image */}
        <img
          src={imageSrc || (() => {
            const url = course.thumbnail;
            if (!url) return "https://images.unsplash.com/photo-1579546929518-9e396f3cc809";
            return url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
          })()}
          alt={course.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${showPreview ? 'opacity-0' : 'opacity-100'}`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809";
          }}
        />

        {/* Loading Skeleton */}
        {!imageSrc && isLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />
        )}

        {/* Lock Overlay with Quick Upgrade Button */}
        {course.isLocked && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[2px] p-4 text-center z-10">
            <div className="bg-white/10 p-3 rounded-full backdrop-blur-md mb-2">
              <Lock className="w-6 h-6 text-white opacity-90" />
            </div>
            <p className="text-white text-xs md:text-sm font-semibold mb-3">
              Requires {course.packageTiers?.[0] || 'Growth'} Plan
            </p>
            <button
              onClick={(e) => handleQuickUpgrade(course, e)}
              className="px-4 py-2 bg-[#FF5530] hover:bg-[#B54236] text-white text-xs md:text-sm font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all w-full max-w-[160px]"
            >
              Request Upgrade
            </button>
          </div>
        )}

        {/* Video Preview - only when course has a real video URL */}
        {!course.isLocked && previewVideoUrl && (
          <video
            ref={videoRef}
            muted
            playsInline
            preload="none"
            onTimeUpdate={handleTimeUpdate}
            src={previewVideoUrl}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showPreview ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          />
        )}

        {/* Progress Bar */}
        {showProgress && course.progress !== undefined && course.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <div
              className="h-full bg-[#FF5530]"
              style={{ width: `${course.progress}%` }}
            ></div>
          </div>
        )}

        {/* Enrolled Badge */}
        {course.enrolled && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-[#FF5530] rounded text-xs font-semibold">
            In List
          </div>
        )}

        {/* Like Percentage Badge */}
        {(() => {
          const likes = (course as any).likesCount || 0;
          const dislikes = (course as any).dislikesCount || 0;
          const totalVotes = likes + dislikes;
          if (totalVotes === 0) return null;

          const likePercentage = Math.round((likes / totalVotes) * 100);
          let colorClass = 'bg-[#B54236]/80';
          if (likePercentage > 50) colorClass = 'bg-[#FF5530]/80';
          else if (likePercentage >= 30) colorClass = 'bg-[#FF5530]/80';

          return (
            <div className={`absolute top-2 right-2 px-2 py-1 ${colorClass} backdrop-blur-sm rounded text-xs font-bold`}>
              👍 {likePercentage}%
            </div>
          );
        })()}
      </div>
      <div className="flex items-center gap-2">
        <h4 className="line-clamp-1 text-sm md:text-base flex-1">{course.title}</h4>
        {/* Like percentage next to title */}
        {(() => {
          const likes = (course as any).likesCount || 0;
          const dislikes = (course as any).dislikesCount || 0;
          const totalVotes = likes + dislikes;
          if (totalVotes === 0) return null;

          const likePercentage = Math.round((likes / totalVotes) * 100);
          let colorClass = 'text-[#B54236]';
          if (likePercentage > 50) colorClass = 'text-[#FF5530]';
          else if (likePercentage >= 30) colorClass = 'text-[#FF5530]';

          return (
            <span className={`text-xs font-semibold ${colorClass}`}>
              {likePercentage}%
            </span>
          );
        })()}
      </div>
    </motion.div>
  );
}