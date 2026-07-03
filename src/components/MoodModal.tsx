import { useState } from 'react';
import { motion } from 'motion/react';

interface MoodModalProps {
  onComplete: (mood: string, energy: string) => void;
}

const moods = [
  { value: 'happy', label: 'Happy', emoji: '😊', color: 'from-yellow-500 to-yellow-600' },
  { value: 'motivated', label: 'Motivated', emoji: '💪', color: 'from-[#FF5530] to-[#B54236]' },
  { value: 'relaxed', label: 'Relaxed', emoji: '😌', color: 'from-[#003366] to-[#002147]' },
  { value: 'curious', label: 'Curious', emoji: '🤔', color: 'from-purple-500 to-purple-600' },
  { value: 'productive', label: 'Productive', emoji: '⚡', color: 'from-green-500 to-green-600' },
  { value: 'creative', label: 'Creative', emoji: '🎨', color: 'from-pink-500 to-pink-600' },
];

const energyLevels = [
  { value: 'high', label: 'High Energy', emoji: '🚀', desc: 'I am full of energy!' },
  { value: 'medium', label: 'Medium Energy', emoji: '🌟', desc: 'Balanced and ready' },
  { value: 'low', label: 'Low Energy', emoji: '🌙', desc: 'I prefer something more relaxing' },
];

export function MoodModal({ onComplete }: MoodModalProps) {
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedEnergy, setSelectedEnergy] = useState('');

  const handleComplete = () => {
    if (selectedMood && selectedEnergy) {
      onComplete(selectedMood, selectedEnergy);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#002147]/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-[#002147]/90 backdrop-blur-xl rounded-2xl p-6 md:p-8 netflix-shadow-lg border border-white/10 my-4"
      >
        <div className="text-center mb-5 md:mb-6">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-1 text-2xl md:text-3xl font-bold"
          >
            How are you feeling today?
          </motion.h1>
          <p className="text-gray-400 text-base md:text-lg">
            Let's personalize recommendations for you
          </p>
        </div>

        {/* Mood Selection */}
        <div className="mb-5 md:mb-6">
          <h3 className="mb-3 text-base md:text-lg font-medium">Your Mood</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {moods.map((mood, index) => (
              <motion.button
                key={mood.value}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedMood(mood.value)}
                className={`p-3 md:p-4 rounded-xl border-2 transition-all ${selectedMood === mood.value
                    ? `border-transparent bg-gradient-to-br ${mood.color} shadow-lg`
                    : 'border-gray-600 bg-[#002147] hover:border-gray-500'
                  }`}
              >
                <div className="text-3xl md:text-4xl mb-1 md:mb-2">{mood.emoji}</div>
                <div className="text-sm font-semibold">{mood.label}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Energy Level Selection */}
        <div className="mb-5 md:mb-6">
          <h3 className="mb-3 text-base md:text-lg font-medium">Your Energy Level</h3>
          <div className="space-y-2 md:space-y-3">
            {energyLevels.map((energy, index) => (
              <motion.button
                key={energy.value}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedEnergy(energy.value)}
                className={`w-full p-3 md:p-4 rounded-xl border-2 transition-all text-left ${selectedEnergy === energy.value
                    ? 'border-[#FF5530] bg-[#FF5530]/20 shadow-lg'
                    : 'border-gray-600 bg-[#002147] hover:border-gray-500'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl md:text-3xl">{energy.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base">{energy.label}</div>
                    <div className="text-xs md:text-sm text-gray-400">{energy.desc}</div>
                  </div>
                  {selectedEnergy === energy.value && (
                    <div className="w-5 h-5 md:w-6 md:h-6 bg-[#FF5530] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Continue Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleComplete}
          disabled={!selectedMood || !selectedEnergy}
          className={`w-full py-3 md:py-4 rounded-lg transition-all font-semibold text-base md:text-lg ${selectedMood && selectedEnergy
              ? 'bg-[#FF5530] hover:bg-[#FF5530] text-white cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
        >
          Continue to Mentora
        </motion.button>

        {!selectedMood && !selectedEnergy && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Select your mood and energy level to continue
          </p>
        )}
      </motion.div>
    </div>
  );
}
