import { Play, Heart, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Reel } from '../App';
import { motion } from 'motion/react';
import { useLazyImage } from '../hooks/useMediaLoading';
import { useRef, useState, useEffect } from 'react';

interface ReelsSectionProps {
  onReelClick: (reel: Reel) => void;
  fullView?: boolean;
  reels: Reel[];
}

const defaultReels: Reel[] = [
  {
    id: 'r1',
    title: 'Sfat Rapid: Tehnici cu Cuțitul',
    creator: 'Gordon Ramsay',
    thumbnail: 'https://images.unsplash.com/photo-1681270543584-8e541a1bb056?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVmJTIwY29va2luZ3xlbnwxfHx8fDE3NjU2OTcxMTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    views: '2.4M',
    likes: '184K',
    courseId: '1',
    tags: ['cooking', 'culinary', 'practical', 'chef']
  },
  {
    id: 'r2',
    title: 'Fotografie la Ora de Aur',
    creator: 'Annie Leibovitz',
    thumbnail: 'https://images.unsplash.com/photo-1622319977720-9949ac28adc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoeSUyMGNhbWVyYXxlbnwxfHx8fDE3NjU2NzYzOTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    views: '1.8M',
    likes: '142K',
    courseId: '2',
    tags: ['photography', 'creative', 'artistic', 'visual']
  },
  {
    id: 'r3',
    title: 'Tutorial Creare Beat',
    creator: 'Deadmau5',
    thumbnail: 'https://images.unsplash.com/photo-1727831140213-18650ae7ef36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpY2lhbiUyMHBlcmZvcm1pbmd8ZW58MXx8fHwxNzY1NzQ5OTY0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    views: '3.1M',
    likes: '267K',
    courseId: '3',
    tags: ['music', 'creative', 'production', 'tech']
  },
  {
    id: 'r4',
    title: 'Bazele Structurii Poveștii',
    creator: 'Margaret Atwood',
    thumbnail: 'https://images.unsplash.com/photo-1582812532891-7968f272fc9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3cml0ZXIlMjBkZXNrfGVufDF8fHx8MTc2NTc0OTk2NHww&ixlib=rb-4.1.0&q=80&w=1080',
    views: '1.2M',
    likes: '98K',
    courseId: '4',
    tags: ['writing', 'creative', 'storytelling', 'relaxing']
  },
  {
    id: 'r5',
    title: 'Sfaturi Mișcare Cameră',
    creator: 'Martin Scorsese',
    thumbnail: 'https://images.unsplash.com/photo-1577190651915-bf62d54d5b36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWxtJTIwZGlyZWN0b3J8ZW58MXx8fHwxNzY1NzAyNzY4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    views: '4.2M',
    likes: '412K',
    courseId: '5',
    tags: ['film', 'creative', 'directing', 'artistic']
  },
  {
    id: 'r6',
    title: 'Setup Iluminare 101',
    creator: 'Annie Leibovitz',
    thumbnail: 'https://images.unsplash.com/photo-1622319977720-9949ac28adc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoeSUyMGNhbWVyYXxlbnwxfHx8fDE3NjU2NzYzOTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    views: '2.9M',
    likes: '223K',
    courseId: '2',
    tags: ['photography', 'creative', 'technical', 'visual']
  }
];

export function ReelsSection({ onReelClick, fullView, reels: providedReels }: ReelsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true); // Default to true if reels exist

  // Filter out invalid reels (must have id and thumbnail at minimum)
  const validReels = providedReels.filter(r => r && r.id && r.thumbnail);
  const allReels = validReels.length > 0 ? validReels : defaultReels;
  const displayReels = fullView ? allReels : allReels.slice(0, 10);

  // State for lazy loading images
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Preload initial batch of images (first 7) immediately
  useEffect(() => {
    const initialBatch = displayReels.slice(0, 7).map(r => r.id);
    setLoadedImages(new Set(initialBatch));

    // Preload next batch after 200ms (very fast)
    const timer = setTimeout(() => {
      setLoadedImages(prev => new Set([...prev, ...displayReels.slice(7, 10).map(r => r.id)]));
    }, 200);

    return () => clearTimeout(timer);
  }, [displayReels.length]);

  // Helper function to format duration
  const formatDuration = (reel: Reel) => {
    // Use startTime and endTime if available
    if (reel.startTime !== undefined && reel.endTime !== undefined) {
      const duration = Math.floor(reel.endTime - reel.startTime);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `0:${seconds.toString().padStart(2, '0')}`;
    }
    // Fallback to duration field if available (stored as seconds)
    if ((reel as any).duration !== undefined) {
      const duration = Math.floor((reel as any).duration);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `0:${seconds.toString().padStart(2, '0')}`;
    }
    // Default fallback for old reels without duration data
    return '0:30';
  };

  const checkScrollability = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const isScrollable = scrollWidth > clientWidth;

    setCanScrollLeft(isScrollable && scrollLeft > 0);
    setCanScrollRight(isScrollable && scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === 'left' ? -600 : 600;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleScroll = () => {
    checkScrollability();
  };

  useEffect(() => {
    if (fullView) return; // Skip scroll check for grid view

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
  }, [displayReels, fullView]);

  if (displayReels.length === 0) return null;

  // Full View - Grid Layout (for Reels page)
  if (fullView) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {displayReels.map((reel, index) => (
          loadedImages.has(reel.id) ? (
            <ReelCard
              key={reel.id}
              reel={reel}
              index={index}
              onReelClick={onReelClick}
              formatDuration={formatDuration}
              isGridView
            />
          ) : (
            <div
              key={reel.id}
              className="aspect-[9/16] rounded-xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse"
            />
          )
        ))}
      </div>
    );
  }

  // Horizontal Scroll Layout (for Home page sections)
  return (
    <div className="relative group/slider">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-32 bg-[#002147]/50 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#002147]/70 rounded-r-lg"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-32 bg-[#002147]/50 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#002147]/70 rounded-l-lg"
        >
          <ChevronRight className="w-10 h-10" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth px-4 md:px-0 pb-4"
      >
        {displayReels.map((reel, index) => (
          loadedImages.has(reel.id) ? (
            <ReelCard
              key={reel.id}
              reel={reel}
              index={index}
              onReelClick={onReelClick}
              formatDuration={formatDuration}
            />
          ) : (
            <div
              key={reel.id}
              style={{ minWidth: '240px', maxWidth: '280px', height: '400px' }}
              className="rounded-xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse flex-shrink-0"
            />
          )
        ))}
      </div>
    </div>
  );
}

// ReelCard Component with Lazy Loading
function ReelCard({
  reel,
  index,
  onReelClick,
  formatDuration,
  isGridView = false
}: {
  reel: Reel;
  index: number;
  onReelClick: (reel: Reel) => void;
  formatDuration: (reel: Reel) => string;
  isGridView?: boolean;
}) {
  const { imageSrc, isLoading } = useLazyImage({
    src: reel.thumbnail,
    cacheId: `reel-${reel.id}-thumb`
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={() => onReelClick(reel)}
      style={!isGridView ? { minWidth: '240px', maxWidth: '280px', height: '400px' } : undefined}
      className={`cursor-pointer group relative rounded-xl overflow-hidden netflix-shadow hover-scale ${isGridView
        ? 'aspect-[9/16]'
        : 'flex-shrink-0 w-[240px] md:w-[280px] h-[400px] md:h-[440px]'
        }`}
    >
      <img
        src={imageSrc || reel.thumbnail}
        alt={reel.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />

      {!imageSrc && isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/90 via-[#002147]/20 to-transparent"></div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
          <Play className="w-8 h-8 text-black fill-current ml-1" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h4 className="text-sm mb-1 line-clamp-2 text-shadow-netflix">{reel.title}</h4>
        <p className="text-xs text-gray-300 mb-3 text-shadow-netflix">{reel.creator}</p>
        <div className="flex items-center gap-4 text-xs text-gray-300">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {reel.views}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {reel.likes}
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 px-2 py-1 bg-[#002147]/60 backdrop-blur-sm rounded-lg text-xs border border-white/20">
        {formatDuration(reel)}
      </div>
    </motion.div>
  );
}