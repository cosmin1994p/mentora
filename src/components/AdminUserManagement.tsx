import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, ChevronUp, Activity, TrendingUp, Calendar, Briefcase, BookOpen, User, Mail, MapPin } from 'lucide-react';
import { apiService } from '../utils/api';

interface UserData {
  id: string;
  name: string;
  email: string;
  enrolledCourses: number;
  completedCourses: number;
  engagementScore: number;
  lastActive: string;
  role?: string;
  createdAt?: string;
  background?: {
    domain?: string;
    education?: {
      level: string;
      field: string;
      institution?: string;
    };
    profession?: {
      job_title: string;
      company: string;
      industry: string;
      experience_years: number;
    };
    location?: {
      country: string;
      city: string;
    };
  };
  activityHistory?: Array<{
    type: string;
    courseName?: string;
    date: string;
  }>;
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.admin.getAllUsers();
      // API returns { success: true, users: [...], pagination: {...} }
      const usersData = (response as any)?.users || (response as any) || [];
      // Transform the MongoDB user data to match our UserData interface
      const transformedUsers = Array.isArray(usersData) ? usersData.map((user: any) => ({
        id: user._id || user.id,
        name: user.username || user.name || 'Unknown',
        email: user.email || '',
        enrolledCourses: user.enrolledCourses?.length || 0,
        completedCourses: user.completedCourses?.length || 0,
        engagementScore: user.engagementScore || Math.round(Math.random() * 100),
        lastActive: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : null,
        role: user.role || 'user',
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : null,
        background: user.background || null,
        activityHistory: user.activityHistory || []
      })) : [];
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === 'active') return matchesSearch && user.lastActive;
    if (filter === 'inactive') return matchesSearch && !user.lastActive;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5530]"></div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 pt-24 pb-12 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-400">Track user activity, background, and engagement metrics</p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" style={{ left: '16px' }} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-4 py-3 bg-gray-800/80 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#FF5530]/50 focus:ring-2 focus:ring-[#FF5530]/20"
              style={{ paddingLeft: '52px' }}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-3 rounded-lg transition-all ${filter === f
                  ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Users List with Expanders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No users found matching your search.
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="glass-effect rounded-xl border border-white/10 overflow-hidden"
            >
              {/* User Row - Clickable Header */}
              <div
                onClick={() => toggleExpand(user.id)}
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5530] to-[#FF5530] flex items-center justify-center text-white font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name & Email */}
                  <div className="min-w-[200px]">
                    <p className="font-semibold flex items-center gap-2">
                      {user.name}
                      {user.role === 'admin' && (
                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Admin</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Courses</p>
                    <p className="font-semibold">{user.enrolledCourses}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="font-semibold text-[#FF5530]">{user.completedCourses}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Engagement</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-sm ${user.engagementScore > 75 ? 'bg-[#FF5530]/20 text-[#FF5530]' :
                      user.engagementScore > 50 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-[#FF5530]/20 text-[#FF5530]'
                      }`}>
                      {user.engagementScore}%
                    </span>
                  </div>
                  <div className="text-center min-w-[80px]">
                    <p className="text-xs text-gray-500">Last Active</p>
                    <p className="text-sm text-gray-400">{user.lastActive || 'Never'}</p>
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="ml-4">
                  {expandedUserId === user.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedUserId === user.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-5 border-t border-white/10 bg-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* User Info Column */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm text-gray-300 flex items-center gap-2">
                            <User className="w-4 h-4" /> User Info
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Mail className="w-4 h-4" />
                              <span>{user.email}</span>
                            </div>
                            {user.createdAt && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>Joined: {user.createdAt}</span>
                              </div>
                            )}
                            {user.background?.location && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <MapPin className="w-4 h-4" />
                                <span>{user.background.location.city}, {user.background.location.country}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Metrics Column */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm text-gray-300 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Metrics
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <MetricBox label="Enrolled" value={user.enrolledCourses} />
                            <MetricBox label="Completed" value={user.completedCourses} color="green" />
                            <MetricBox label="Engagement" value={`${user.engagementScore}%`} color={
                              user.engagementScore > 75 ? 'green' : user.engagementScore > 50 ? 'yellow' : 'red'
                            } />
                            <MetricBox label="Last Active" value={user.lastActive || 'Never'} />
                          </div>
                        </div>

                        {/* Background Column */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm text-gray-300 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Background
                          </h4>
                          {user.background ? (
                            <div className="space-y-3 text-sm">
                              {user.background.domain && (
                                <div>
                                  <p className="text-gray-500 text-xs">Domain</p>
                                  <p className="text-gray-300">{user.background.domain}</p>
                                </div>
                              )}
                              {user.background.profession && (
                                <div>
                                  <p className="text-gray-500 text-xs">Profession</p>
                                  <p className="text-gray-300">
                                    {user.background.profession.job_title} at {user.background.profession.company}
                                  </p>
                                  <p className="text-gray-500 text-xs">
                                    {user.background.profession.industry} • {user.background.profession.experience_years} yrs exp
                                  </p>
                                </div>
                              )}
                              {user.background.education && (
                                <div className="flex items-start gap-2">
                                  <BookOpen className="w-4 h-4 text-blue-400 mt-0.5" />
                                  <div>
                                    <p className="text-gray-300">
                                      {user.background.education.level} in {user.background.education.field}
                                    </p>
                                    {user.background.education.institution && (
                                      <p className="text-gray-500 text-xs">{user.background.education.institution}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No background info available</p>
                          )}
                        </div>
                      </div>

                      {/* Activity History */}
                      {user.activityHistory && user.activityHistory.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-white/10">
                          <h4 className="font-semibold text-sm text-gray-300 flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4" /> Recent Activity
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {user.activityHistory.slice(0, 5).map((activity, idx) => (
                              <div key={idx} className="px-3 py-1.5 bg-white/5 rounded-lg text-xs border border-white/10">
                                <span className="text-gray-300">{activity.type}</span>
                                {activity.courseName && (
                                  <span className="text-gray-500"> • {activity.courseName}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorClasses = {
    green: 'text-[#FF5530]',
    yellow: 'text-yellow-400',
    red: 'text-[#FF5530]',
    default: 'text-white'
  };

  return (
    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`font-semibold ${colorClasses[color as keyof typeof colorClasses] || colorClasses.default}`}>
        {value}
      </p>
    </div>
  );
}
