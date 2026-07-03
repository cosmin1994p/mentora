import { X, Bell, CheckCircle, Star, TrendingUp, Clock, Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'trending' | 'reminder' | 'achievement' | 'milestone' | 'recommendation';
  title: string;
  message: string;
  time?: string;
  timestamp?: number;
  read: boolean;
}

interface LiveNotification {
  id: string;
  type: 'success' | 'info' | 'achievement' | 'milestone';
  title: string;
  message: string;
  timestamp: number;
}

interface NotificationsPanelProps {
  onClose: () => void;
  liveNotifications?: LiveNotification[];
  onMarkAllRead?: () => void;
}

export function NotificationsPanel({ onClose, liveNotifications = [], onMarkAllRead }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Convert and display only live notifications (no demo/hardcoded notifications)
  useEffect(() => {
    // Convert live notifications to panel format
    const convertedLive: Notification[] = liveNotifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      time: getTimeAgo(n.timestamp),
      read: false
    }));

    // Sort: unread first, then by time
    convertedLive.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
      return 0;
    });

    setNotifications(convertedLive);
  }, [liveNotifications]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onMarkAllRead?.();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-[#FF5530]" />;
      case 'trending':
        return <TrendingUp className="w-5 h-5 text-[#FF5530]" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'achievement':
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'milestone':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'recommendation':
        return <Star className="w-5 h-5 text-[#FF5530]" />;
      case 'info':
        return <Bell className="w-5 h-5 text-blue-400" />;
      default:
        return <Star className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#002147]/80 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: 'spring', damping: 25 }}
        className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-[#002147] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#002147] border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-[#FF5530]" />
            <h2 className="text-xl font-semibold">Notificări</h2>
            <span className="px-2 py-1 bg-[#FF5530] rounded-full text-xs">
              {notifications.filter(n => !n.read).length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 hover:bg-white/10 rounded-full flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="p-4 space-y-2">
          <AnimatePresence>
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg cursor-pointer transition-all ${notification.read
                    ? 'bg-[#002147] hover:bg-[#002147]'
                    : 'bg-[#002147] hover:bg-[#002147]'
                  }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`text-sm font-semibold ${notification.read ? 'text-gray-300' : 'text-white'
                        }`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-[#FF5530] rounded-full mt-2" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#002147] border-t border-white/10 p-4">
          <button
            onClick={handleMarkAllRead}
            className="w-full py-3 bg-[#FF5530] hover:bg-[#FF5530] rounded-lg font-semibold transition-all"
          >
            Marchează toate ca citite
          </button>
        </div>
      </motion.div>
    </motion.div>
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
