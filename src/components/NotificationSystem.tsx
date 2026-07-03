import { X, CheckCircle, Trophy, Star, Play, BookOpen, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'achievement' | 'milestone';
  title: string;
  message: string;
  timestamp: number;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationSystem({ notifications, onDismiss }: NotificationSystemProps) {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-[#FF5530]" />;
      case 'achievement':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 'milestone':
        return <Star className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  const getGradient = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'from-green-600/20 to-green-900/20 border-[#FF5530]/30';
      case 'achievement':
        return 'from-yellow-600/20 to-yellow-900/20 border-yellow-500/30';
      case 'milestone':
        return 'from-purple-600/20 to-purple-900/20 border-purple-500/30';
      default:
        return 'from-blue-600/20 to-blue-900/20 border-blue-500/30';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-3 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`glass-effect rounded-xl p-4 border bg-gradient-to-br ${getGradient(notification.type)} netflix-shadow-lg backdrop-blur-xl`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold mb-1 text-white">
                  {notification.title}
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {getTimeAgo(notification.timestamp)}
                </p>
              </div>
              <button
                onClick={() => onDismiss(notification.id)}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 10) return 'Acum';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}z`;
}
