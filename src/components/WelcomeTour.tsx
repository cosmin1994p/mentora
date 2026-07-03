import { X, Check, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface WelcomeTourProps {
  onClose: () => void;
}

export function WelcomeTour({ onClose }: WelcomeTourProps) {
  return (
    <div className="fixed inset-0 bg-[#002147]/95 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-gradient-to-br from-[#002147] to-[#002147] rounded-2xl p-8 netflix-shadow-lg border border-[#FF5530]/30"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#FF5530] to-[#B54236] rounded-full mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="mb-3">Welcome to Mentora!</h1>
          <p className="text-gray-400 text-lg">
            Your personalized learning platform
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <div className="bg-[#002147] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-[#FF5530] rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="mb-2">🎯 Personalized Recommendations</h3>
                <p className="text-gray-400 text-sm">
                  Our smart system recommends courses and reels based on:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-500">
                  <li>• Your daily mood (happy, motivated, relaxed, etc.)</li>
                  <li>• Your energy level (high, medium, low)</li>
                  <li>• Your interests from the questionnaire</li>
                  <li>• Courses you're enrolled in</li>
                  <li>• Keywords and tags from courses</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-[#002147] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-[#FF5530] rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="mb-2">📚 Enroll in Courses</h3>
                <p className="text-gray-400 text-sm">
                  • Click on any course to see details<br />
                  • Press "Add to My List" to enroll<br />
                  • Your progress is automatically saved as you watch<br />
                  • View your courses in the "My Learning" section
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#002147] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-[#FF5530] rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="mb-2">🎬 From Reels to Courses</h3>
                <p className="text-gray-400 text-sm">
                  • Reels are short clips from full courses<br />
                  • When you see an interesting reel, click "Watch Full Course"<br />
                  • You'll be taken directly to the full course<br />
                  • Reels are recommended based on your preferences
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#002147] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-[#FF5530] rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="mb-2">🔄 Daily Updates</h3>
                <p className="text-gray-400 text-sm">
                  Each time you log in, we'll ask how you're feeling today.<br />
                  Recommendations will automatically update based on your response!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#FF5530]/20 to-[#B54236]/20 border border-[#FF5530]/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-center">
            💡 <strong>Tip:</strong> Look for the "Recommended for You" section on the homepage to see your personalized courses!
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 bg-[#FF5530] hover:bg-[#FF5530] text-white rounded-lg transition-all font-semibold text-lg"
        >
          Start Exploring
        </button>
      </motion.div>
    </div>
  );
}
