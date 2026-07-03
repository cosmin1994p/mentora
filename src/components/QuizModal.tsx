import { X, CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Course, QuizQuestion } from '../App';
import { useState } from 'react';
import { motion } from 'motion/react';

interface QuizModalProps {
  course: Course;
  onClose: () => void;
  onQuizComplete?: (passed: boolean) => void;
}

// Generate quiz questions based on course
const generateQuiz = (course: Course): QuizQuestion[] => {
  const baseQuestions = [
    {
      id: '1',
      question: `What is the main benefit of the "${course.title}" course?`,
      options: [
        'Developing practical skills in the field',
        'Obtaining an official diploma',
        'Networking with other students',
        'Access to exclusive resources'
      ],
      correctAnswer: 0
    },
    {
      id: '2',
      question: `Who teaches the "${course.title}" course?`,
      options: [
        'A university professor',
        course.instructor,
        'An anonymous expert',
        'A team of instructors'
      ],
      correctAnswer: 1
    },
    {
      id: '3',
      question: 'What did you learn about practical implementation of the presented concepts?',
      options: [
        'You must apply knowledge immediately',
        'It is better to wait for the perfect moment',
        'It is not necessary to practice',
        'Theory is sufficient'
      ],
      correctAnswer: 0
    },
    {
      id: '4',
      question: 'What is the most important lesson from this course?',
      options: [
        'Fundamentals are essential for success',
        'You can skip the basics',
        'The order of lessons does not matter',
        'Theory is more important than practice'
      ],
      correctAnswer: 0
    },
    {
      id: '5',
      question: 'How can you best apply the knowledge from this course?',
      options: [
        'Constant practice and experimentation',
        'Wait until you finish all courses',
        'Just watch the videos',
        'Occasionally read the notes'
      ],
      correctAnswer: 0
    }
  ];

  return baseQuestions;
};

export function QuizModal({ course, onClose, onQuizComplete }: QuizModalProps) {
  const [questions] = useState<QuizQuestion[]>(generateQuiz(course));
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score
      const correctAnswers = questions.filter((q, i) => q.correctAnswer === selectedAnswers[i]).length;
      setScore(correctAnswers);
      setShowResults(true);
      if (onQuizComplete) {
        onQuizComplete(correctAnswers >= questions.length * 0.6);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswers(new Array(questions.length).fill(-1));
    setShowResults(false);
    setScore(0);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const scorePercentage = (score / questions.length) * 100;

  if (showResults) {
    return (
      <div className="fixed inset-0 bg-[#002147]/95 z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-3xl glass-effect rounded-2xl p-8 card-shadow-lg border border-white/10 my-8"
        >
          {/* Close Button - Top Right */}
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-all hover:scale-110 p-2 hover:bg-white/10 rounded-lg"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center"
            >
              <Trophy className="w-12 h-12 text-white" />
            </motion.div>

            <h2 className="mb-4">Quiz Completed!</h2>
            <p className="text-gray-400 mb-8">
              You completed the quiz for "{course.title}"
            </p>

            <div className="mb-8">
              <div className="text-6xl font-bold mb-2 bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                {score}/{questions.length}
              </div>
              <p className="text-xl text-gray-400">
                {scorePercentage >= 80 ? 'Excellent! 🎉' : 
                 scorePercentage >= 60 ? 'Good! 👍' : 
                 'Try Again! 💪'}
              </p>
            </div>

            {/* Results Breakdown */}
            <div className="glass-effect rounded-xl p-6 mb-6 border border-white/10 text-left">
              <h3 className="mb-4">Your Answers</h3>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-3">
                    {selectedAnswers[i] === q.correctAnswer ? (
                      <CheckCircle className="w-5 h-5 text-[#FF5530] flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#FF5530] flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm mb-1">{q.question}</p>
                      <p className={`text-xs ${
                        selectedAnswers[i] === q.correctAnswer ? 'text-[#FF5530]' : 'text-[#FF5530]'
                      }`}>
                        {selectedAnswers[i] === q.correctAnswer 
                          ? 'Correct!' 
                          : `Correct answer: ${q.options[q.correctAnswer]}`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
              >
                <RotateCcw className="w-5 h-5" />
                Retry Quiz
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const selectedAnswer = selectedAnswers[currentQuestion];

  return (
    <div className="fixed inset-0 bg-[#002147]/95 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-3xl glass-effect rounded-2xl p-8 card-shadow-lg border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="mb-1">Quiz: {course.title}</h2>
            <p className="text-sm text-gray-400">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-all hover:scale-110 p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-[#B54236] to-[#FF5530]"
            ></motion.div>
          </div>
        </div>

        {/* Question */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <h3 className="mb-6 text-2xl">{currentQ.question}</h3>

          <div className="space-y-3">
            {currentQ.options.map((option, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleAnswer(index)}
                className={`w-full text-left p-4 rounded-xl transition-all border-2 ${
                  selectedAnswer === index
                    ? 'border-[#FF5530] bg-[#FF5530]/20 shadow-lg'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswer === index
                      ? 'border-[#FF5530] bg-[#FF5530]'
                      : 'border-gray-500'
                  }`}>
                    {selectedAnswer === index && (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-2">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentQuestion
                    ? 'bg-[#FF5530] w-6'
                    : selectedAnswers[i] !== -1
                    ? 'bg-[#FF5530]'
                    : 'bg-gray-600'
                }`}
              ></div>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={selectedAnswer === -1}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}