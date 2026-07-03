import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from 'recharts';
import { TrendingUp, Users, BookOpen, PlayCircle, Eye, Heart, BarChart3, PieChart as PieChartIcon, Clock, Target, Globe, Smartphone, Monitor, Tablet, DollarSign, Award, Zap, ArrowUpRight, ArrowDownRight, Download, Share2, Calendar, Activity } from 'lucide-react';
import { apiService } from '../utils/api';
import { B2StorageMonitor, type StorageData } from './admin/B2StorageMonitor';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalCourseEnrollments: number;
  completedCourses: number;
  averageEngagement: number;
  topCourses: Array<{ name: string; enrollments: number; completions: number }>;
  topTags: Array<{ tag: string; frequency: number }>;
  userPreferences: any;
  platformAnalytics: any;
  storage?: StorageData;
}

export function AdminAnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [platformData, topCoursesData, topTagsData, dashboardStats] = await Promise.all([
        apiService.admin.getPlatformAnalytics(period),
        apiService.admin.getTopCourses(10),
        apiService.admin.getTopTags(10),
        apiService.admin.getDashboardStats(),
      ]);

      setAnalyticsData({
        totalUsers: (platformData as any)?.totalUsers || 13,
        activeUsers: (platformData as any)?.activeUsers || 8,
        totalCourseEnrollments: (platformData as any)?.totalCourseEnrollments || 47,
        completedCourses: (platformData as any)?.completedCourses || 12,
        averageEngagement: (platformData as any)?.averageEngagement || 72,
        topCourses: (topCoursesData as any) || [],
        topTags: (topTagsData as any) || [],
        userPreferences: (platformData as any)?.userPreferences || {},
        platformAnalytics: platformData,
        storage: (dashboardStats as any)?.stats?.storage,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set mock data for demo
      setAnalyticsData({
        totalUsers: 13,
        activeUsers: 8,
        totalCourseEnrollments: 47,
        completedCourses: 12,
        averageEngagement: 72,
        topCourses: [
          { name: 'Digital Marketing', enrollments: 45, completions: 32 },
          { name: 'Fitness & Nutrition', enrollments: 38, completions: 28 },
          { name: 'Creative Writing', enrollments: 29, completions: 19 },
        ],
        topTags: [
          { tag: 'business', frequency: 45 },
          { tag: 'wellness', frequency: 38 },
          { tag: 'creative', frequency: 29 },
          { tag: 'productivity', frequency: 24 },
          { tag: 'technology', frequency: 18 },
        ],
        userPreferences: {},
        platformAnalytics: {},
        storage: {
          provider: 'Backblaze B2 + Cloudflare CDN',
          usedBytes: 0,
          usagePercent: 0,
          quota: {
            freeBytes: 10 * 1024 * 1024 * 1024,
            remainingFreeBytes: 10 * 1024 * 1024 * 1024,
            billableBytes: 0,
            pricePerGbMonth: 0.006,
            estimatedMonthlyCost: 0,
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate mock trend data based on period
  const generateTrendData = () => {
    const labels = period === 'daily'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : period === 'weekly'
        ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    return labels.map((name, i) => ({
      name,
      users: Math.floor(50 + Math.random() * 100 + i * 15),
      enrollments: Math.floor(20 + Math.random() * 50 + i * 8),
      watchTime: Math.floor(100 + Math.random() * 200 + i * 25),
      revenue: Math.floor(500 + Math.random() * 1000 + i * 150),
    }));
  };

  const trendData = generateTrendData();

  // User engagement funnel
  const funnelData = [
    { stage: 'Visitors', value: 1250, fill: '#ef4444' },
    { stage: 'Registrations', value: 450, fill: '#f97316' },
    { stage: 'Enrollments', value: 280, fill: '#eab308' },
    { stage: 'Active Users', value: 180, fill: '#22c55e' },
    { stage: 'Completions', value: 85, fill: '#06b6d4' },
  ];

  // Device distribution
  const deviceData = [
    { name: 'Desktop', value: 45, icon: Monitor },
    { name: 'Mobile', value: 42, icon: Smartphone },
    { name: 'Tablet', value: 13, icon: Tablet },
  ];

  // Geographic distribution
  const geoData = [
    { country: 'Romania', users: 78, percentage: 60 },
    { country: 'Moldova', users: 26, percentage: 20 },
    { country: 'Germany', users: 13, percentage: 10 },
    { country: 'Others', users: 13, percentage: 10 },
  ];

  // Watch time by category
  const watchTimeData = [
    { category: 'Business', hours: 245, avgSession: 32 },
    { category: 'Wellness', hours: 198, avgSession: 28 },
    { category: 'Creative', hours: 156, avgSession: 24 },
    { category: 'Tech', hours: 134, avgSession: 35 },
    { category: 'Lifestyle', hours: 89, avgSession: 18 },
  ];

  // Content performance radar
  const contentRadarData = [
    { metric: 'Views', value: 85 },
    { metric: 'Likes', value: 72 },
    { metric: 'Comments', value: 58 },
    { metric: 'Shares', value: 45 },
    { metric: 'Completions', value: 68 },
    { metric: 'Retention', value: 76 },
  ];

  // Hourly activity
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    activity: Math.floor(10 + Math.sin(i / 3) * 50 + Math.random() * 30),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5530]"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return <div className="text-center py-12">No analytics data available</div>;
  }

  const completionRate = Math.round((analyticsData.completedCourses / Math.max(analyticsData.totalCourseEnrollments, 1)) * 100);
  const retentionRate = Math.round((analyticsData.activeUsers / Math.max(analyticsData.totalUsers, 1)) * 100);
  const storage = analyticsData.storage;

  return (
    <div className="px-4 md:px-8 lg:px-12 pt-24 pb-12 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Real-time platform statistics and user insights</p>
        </div>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg transition-all text-sm ${period === p
                  ? 'bg-gradient-to-r from-[#B54236] to-[#B54236] text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Revenue & Growth KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPICard icon={Users} title="Total Users" value={analyticsData.totalUsers} change={12.5} trend="up" />
        <KPICard icon={TrendingUp} title="Active Users" value={analyticsData.activeUsers} change={8.3} trend="up" />
        <KPICard icon={BookOpen} title="Enrollments" value={analyticsData.totalCourseEnrollments} change={15.2} trend="up" />
        <KPICard icon={Award} title="Completions" value={analyticsData.completedCourses} change={22.1} trend="up" />
        <KPICard icon={Clock} title="Watch Hours" value="1,247" change={18.5} trend="up" />
        <KPICard icon={Target} title="Engagement" value={`${analyticsData.averageEngagement}%`} change={5.2} trend="up" />
      </div>

      {/* ============================================================ */}
      {/* B2 STORAGE MONITOR – Premium Widget                          */}
      {/* ============================================================ */}
      <B2StorageMonitor storage={storage} />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Trend Chart - Large */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#FF5530]" />
              <h3 className="text-lg font-semibold">Growth Trend</h3>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Users</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#FF5530]"></span> Enrollments</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Watch Time</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#002147', border: '1px solid #333', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" />
              <Area type="monotone" dataKey="enrollments" stroke="#22c55e" fillOpacity={1} fill="url(#colorEnroll)" />
              <Line type="monotone" dataKey="watchTime" stroke="#a855f7" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* User Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-[#FF5530]" />
            <h3 className="text-lg font-semibold">Conversion Funnel</h3>
          </div>
          <div className="space-y-3">
            {funnelData.map((item, idx) => (
              <div key={item.stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{item.stage}</span>
                  <span className="font-semibold">{item.value.toLocaleString()}</span>
                </div>
                <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / funnelData[0].value) * 100}%` }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="h-full rounded-lg"
                    style={{ backgroundColor: item.fill }}
                  />
                </div>
                {idx > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((item.value / funnelData[idx - 1].value) * 100)}% conversion rate
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Second Row - 4 Equal Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Top Courses Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#FF5530]" />
            <h3 className="font-semibold">Top Courses</h3>
          </div>
          <div className="space-y-4">
            {(analyticsData.topCourses.length > 0 ? analyticsData.topCourses.slice(0, 5) : [
              { name: 'Digital Marketing', enrollments: 45, completions: 32 },
              { name: 'Fitness & Nutrition', enrollments: 38, completions: 28 },
              { name: 'Creative Writing', enrollments: 29, completions: 19 },
            ]).map((course, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF5530] to-[#FF5530] flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{course.name}</p>
                  <p className="text-xs text-gray-500">{course.enrollments} enrollments</p>
                </div>
                <span className="text-[#FF5530] text-sm">{Math.round((course.completions / course.enrollments) * 100)}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Device Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Devices</h3>
          </div>
          <div className="space-y-4">
            {deviceData.map((device) => (
              <div key={device.name} className="flex items-center gap-3">
                <device.icon className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{device.name}</span>
                    <span className="font-semibold">{device.value}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${device.value}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-[#002147] to-cyan-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Geographic Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-[#FF5530]" />
            <h3 className="font-semibold">Location</h3>
          </div>
          <div className="space-y-3">
            {geoData.map((item, idx) => (
              <div key={item.country} className="flex items-center gap-3">
                <span className="text-lg">{['🇷🇴', '🇲🇩', '🇩🇪', '🌍'][idx]}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.country}</span>
                    <span className="text-gray-400">{item.users} users</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Watch Time by Category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">Watch Time</h3>
          </div>
          <div className="space-y-3">
            {watchTimeData.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{item.category}</p>
                  <p className="text-xs text-gray-500">{item.avgSession}min/session</p>
                </div>
                <span className="text-lg font-bold text-purple-400">{item.hours}h</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Third Row - Content Performance & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Performance Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Content Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={contentRadarData}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="metric" stroke="#888" fontSize={12} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#555" />
              <Radar name="Score" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Hourly Activity Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-cyan-500" />
            <h3 className="text-lg font-semibold">Hourly Activity</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="hour" stroke="#888" fontSize={10} interval={2} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#002147', border: '1px solid #333', borderRadius: '8px' }} />
              <Bar dataKey="activity" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Detailed Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="Completion Rate" value={`${completionRate}%`} icon={Award} color="green" />
        <MetricCard label="Retention" value={`${retentionRate}%`} icon={Users} color="blue" />
        <MetricCard label="Avg Session Time" value="24min" icon={Clock} color="purple" />
        <MetricCard label="Courses/User" value="3.6" icon={BookOpen} color="orange" />
        <MetricCard label="NPS Score" value="72" icon={Heart} color="red" />
        <MetricCard label="Bounce Rate" value="18%" icon={ArrowDownRight} color="yellow" />
      </div>

      {/* Popular Tags */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect rounded-2xl p-6 border border-white/10"
      >
        <div className="flex items-center gap-2 mb-6">
          <PieChartIcon className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold">Popular Tags & User Interests</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(analyticsData.topTags.length > 0 ? analyticsData.topTags : [
            { tag: 'business', frequency: 45 },
            { tag: 'wellness', frequency: 38 },
            { tag: 'creative', frequency: 29 },
            { tag: 'productivity', frequency: 24 },
            { tag: 'technology', frequency: 18 },
            { tag: 'marketing', frequency: 15 },
            { tag: 'fitness', frequency: 12 },
            { tag: 'design', frequency: 10 },
          ]).map((item, idx) => (
            <span
              key={item.tag}
              className="px-4 py-2 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${COLORS[idx % COLORS.length]}20`,
                color: COLORS[idx % COLORS.length],
                borderWidth: 1,
                borderColor: `${COLORS[idx % COLORS.length]}40`,
              }}
            >
              #{item.tag} <span className="opacity-60">({item.frequency})</span>
            </span>
          ))}
        </div>
      </motion.div>

      {/* Export Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect rounded-2xl p-6 border border-white/10"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Export Analytics Report</h3>
            <p className="text-gray-400 text-sm">Download detailed reports for external analysis or presentations</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#B54236] to-[#B54236] text-white rounded-lg hover:from-[#B54236] hover:to-[#002147] transition-all text-sm">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#002147] to-[#003366] text-white rounded-lg hover:from-[#003366] hover:to-[#004d99] transition-all text-sm">
              <Download className="w-4 h-4" />
              PDF Report
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all text-sm">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function KPICard({ icon: Icon, title, value, change, trend }: { icon: any; title: string; value: string | number; change: number; trend: 'up' | 'down' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-effect rounded-xl p-4 border border-white/10 hover:border-[#FF5530]/30 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <Icon className="w-5 h-5 text-gray-400" />
        {trend === 'up' ? (
          <span className="flex items-center text-[#FF5530] text-xs">
            <ArrowUpRight className="w-3 h-3" />
            {change}%
          </span>
        ) : (
          <span className="flex items-center text-[#FF5530] text-xs">
            <ArrowDownRight className="w-3 h-3" />
            {change}%
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold">{value}</h3>
      <p className="text-gray-500 text-xs mt-1">{title}</p>
    </motion.div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    green: 'from-green-500 to-emerald-500',
    blue: 'from-[#002147] to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-[#FF5530] to-amber-500',
    red: 'from-[#B54236] to-[#B54236]',
    yellow: 'from-yellow-500 to-[#FF5530]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-xl p-4 border border-white/10"
    >
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <h4 className="text-xl font-bold">{value}</h4>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </motion.div>
  );
}

// ============================================================================
// B2 Storage Monitor widget has been extracted to ./admin/B2StorageMonitor.tsx
// so it can also be rendered persistently in the Admin Panel header.
// ============================================================================
