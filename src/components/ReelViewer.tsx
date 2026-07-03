import { X } from 'lucide-react';
import { Reel, Course } from '../App';
import { useEffect } from 'react';
import { VerticalReelStack } from './ui/vertical-reel-stack';

interface ReelViewerProps {
  reel: Reel;
  allReels: Reel[];
  courses: Course[];
  onClose: () => void;
  onViewCourse: (courseId: string) => void;
}

export function ReelViewer({ reel, allReels, courses, onClose, onViewCourse }: ReelViewerProps) {
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Record view on mount
  useEffect(() => {
    if (reel?.id) {
      // Fire and forget - don't await
      import('../utils/api').then(({ apiService }) => {
        apiService.user.recordReelView(reel.id).catch(err =>
          console.error('Failed to record reel view:', err)
        );
      });
    }
  }, [reel.id]);

  return (
    <div className="fixed inset-0 bg-[#002147] z-50 flex items-center justify-center overflow-hidden">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-[#000000]/80 hover:bg-[#000000] rounded-full flex items-center justify-center transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Vertical Reel Stack */}
      <VerticalReelStack
        reels={allReels}
        courses={courses}
        initialReelId={reel.id}
        onViewCourse={onViewCourse}
      />
    </div>
  );
}