import { Play, Info } from 'lucide-react';
import { Course } from '../App';
import { motion } from 'motion/react';
import { useRef } from 'react';

interface HeroProps {
  onPlayClick: (course: Course) => void;
  onInfoClick: (course: Course) => void;
  courses: Course[];
}

export function Hero({ onPlayClick, onInfoClick, courses }: HeroProps) {
  const hasAnimated = useRef(false);

  // If no courses, render nothing — the App-level loading overlay handles this
  if (courses.length === 0) return null;

  const featuredCourse = courses[0];

  // Skip entrance animations after first render
  const skipAnimation = hasAnimated.current;
  if (!hasAnimated.current) {
    hasAnimated.current = true;
  }

  return (
    <div className="relative h-[100vh] overflow-hidden bg-[#002147]">
      <div className="absolute inset-0 bg-[#002147]">
        <motion.img
          key={featuredCourse.id}
          initial={{ opacity: skipAnimation ? 1 : 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ opacity: { duration: skipAnimation ? 0 : 0.3 }, scale: { duration: 10, repeat: Infinity, repeatType: 'reverse' } }}
          src={featuredCourse.thumbnail}
          alt={featuredCourse.title}
          className="w-full h-full object-cover"
          loading="eager"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#002147] via-[#002147]/70 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#002147] via-transparent to-transparent"></div>
      </div>

      <div className="relative h-full px-4 md:px-12 flex items-center">
        <motion.div
          initial={{ opacity: skipAnimation ? 1 : 0, y: skipAnimation ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: skipAnimation ? 0 : 0.5 }}
          className="max-w-2xl"
        >
          <motion.h1
            initial={{ opacity: skipAnimation ? 1 : 0, y: skipAnimation ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: skipAnimation ? 0 : 0.4, delay: skipAnimation ? 0 : 0.15 }}
            className="mb-6 text-shadow-netflix"
          >
            {featuredCourse.title}
          </motion.h1>

          <motion.div
            initial={{ opacity: skipAnimation ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: skipAnimation ? 0 : 0.3, delay: skipAnimation ? 0 : 0.2 }}
            className="flex items-center gap-4 mb-6 text-lg"
          >
            <span className="text-[#FF5530] font-semibold">{(featuredCourse.rating * 20).toFixed(0)}% Match</span>
            <span className="border border-gray-400 px-2 py-0.5 text-sm">{new Date().getFullYear()}</span>
            <span>{featuredCourse.lessons} Lessons</span>
            <span className="border border-gray-400 px-2 py-0.5 text-sm">HD</span>
          </motion.div>

          <motion.p
            initial={{ opacity: skipAnimation ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: skipAnimation ? 0 : 0.3, delay: skipAnimation ? 0 : 0.25 }}
            className="text-lg text-white mb-8 max-w-xl leading-relaxed text-shadow-netflix"
          >
            {featuredCourse.description}
          </motion.p>

          <motion.div
            initial={{ opacity: skipAnimation ? 1 : 0, y: skipAnimation ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: skipAnimation ? 0 : 0.3, delay: skipAnimation ? 0 : 0.3 }}
            className="flex gap-4"
          >
            <button
              onClick={() => onPlayClick(featuredCourse)}
              className="flex items-center gap-3 px-8 py-3 bg-[#FF5530] text-white rounded hover:bg-[#FF5530]/80 transition-all text-lg font-semibold shadow-lg shadow-[#FF5530]/20"
            >
              <Play className="w-6 h-6 fill-current" />
              Play
            </button>
            <button
              onClick={() => onInfoClick(featuredCourse)}
              className="flex items-center gap-3 px-8 py-3 bg-[#002147] text-white border border-white/20 rounded hover:bg-[#002147]/80 hover:border-white/50 transition-all text-lg font-semibold"
            >
              <Info className="w-6 h-6" />
              More Info
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}