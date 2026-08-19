import { Play, Info } from 'lucide-react';
import { Course } from '../App';

interface HeroProps {
  onPlayClick: (course: Course) => void;
  onInfoClick: (course: Course) => void;
  courses: Course[];
}

export function Hero({ onPlayClick, onInfoClick, courses }: HeroProps) {
  const featuredCourse = courses[0];

  return (
    <section className="relative h-[70svh] min-h-[420px] max-h-[900px] overflow-hidden bg-[#002147]">
      <div className="absolute inset-0 bg-[#002147]">
        {featuredCourse?.thumbnail ? (
          <img
            key={featuredCourse.id}
            src={featuredCourse.thumbnail}
            alt={featuredCourse.title}
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1920}
            height={1080}
          />
        ) : (
          <div className="h-full w-full bg-[#002147]" aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#002147] via-[#002147]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#002147] via-transparent to-transparent" />
      </div>

      <div className="relative flex h-full items-center px-4 md:px-12">
        <div className="max-w-2xl">
          {featuredCourse ? (
            <>
              <h1 className="mb-6 text-shadow-netflix">{featuredCourse.title}</h1>

              <div className="mb-6 flex items-center gap-4 text-lg">
                <span className="font-semibold text-[#FF5530]">{(featuredCourse.rating * 20).toFixed(0)}% Match</span>
                <span className="border border-gray-400 px-2 py-0.5 text-sm">{new Date().getFullYear()}</span>
                <span>{featuredCourse.lessons} Lessons</span>
                <span className="border border-gray-400 px-2 py-0.5 text-sm">HD</span>
              </div>

              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white text-shadow-netflix">
                {featuredCourse.description}
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => onPlayClick(featuredCourse)}
                  className="flex items-center gap-3 rounded bg-[#FF5530] px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-[#FF5530]/20 transition-all hover:bg-[#FF5530]/80"
                >
                  <Play className="h-6 w-6 fill-current" />
                  Play
                </button>
                <button
                  onClick={() => onInfoClick(featuredCourse)}
                  className="flex items-center gap-3 rounded border border-white/20 bg-[#002147] px-8 py-3 text-lg font-semibold text-white transition-all hover:border-white/50 hover:bg-[#002147]/80"
                >
                  <Info className="h-6 w-6" />
                  More Info
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4" aria-hidden>
              <div className="h-10 w-3/4 max-w-lg rounded bg-white/10" />
              <div className="h-5 w-1/2 max-w-md rounded bg-white/10" />
              <div className="h-20 w-full max-w-xl rounded bg-white/10" />
              <div className="flex gap-4">
                <div className="h-12 w-32 rounded bg-white/10" />
                <div className="h-12 w-36 rounded bg-white/10" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
