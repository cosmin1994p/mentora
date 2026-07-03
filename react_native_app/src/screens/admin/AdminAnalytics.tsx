import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../../services/apiService';

interface Analytics {
  totalUsers: number;
  totalCourses: number;
  totalReels: number;
  platformRevenue: number;
  activeUsers: number;
  completionRate: number;
  averageRating: number;
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await apiService.getPlatformAnalytics();
      setAnalytics(res.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color = '#EA7E5C' }: any) => (
    <View className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
      <View className="flex-row items-center gap-3">
        <View style={{ backgroundColor: `${color}20` }} className="p-3 rounded-lg">
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View className="flex-1">
          <Text className="text-gray-400 text-xs mb-1">{label}</Text>
          <Text className="text-white text-2xl font-bold">{value}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0A0E27]">
        <ActivityIndicator size="large" color="#EA7E5C" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }} className="flex-1 bg-[#0A0E27]">
      {/* Main Metrics */}
      <StatCard
        icon="people"
        label="Total Users"
        value={analytics?.totalUsers}
        color="#3B82F6"
      />
      <StatCard
        icon="book"
        label="Total Courses"
        value={analytics?.totalCourses}
        color="#10B981"
      />
      <StatCard
        icon="play-circle"
        label="Total Reels"
        value={analytics?.totalReels}
        color="#F59E0B"
      />
      <StatCard
        icon="trending-up"
        label="Revenue"
        value={`$${analytics?.platformRevenue}`}
        color="#EC4899"
      />

      {/* Secondary Metrics */}
      <View className="mt-6">
        <Text className="text-white text-lg font-bold mb-4">Performance</Text>
      </View>

      <StatCard
        icon="pulse"
        label="Active Users"
        value={analytics?.activeUsers}
        color="#8B5CF6"
      />
      <StatCard
        icon="checkmark-circle"
        label="Completion Rate"
        value={`${analytics?.completionRate}%`}
        color="#06B6D4"
      />
      <StatCard
        icon="star"
        label="Avg. Rating"
        value={`${analytics?.averageRating}/5`}
        color="#FBBF24"
      />

      {/* Chart Section */}
      <View className="bg-white/5 border border-white/10 rounded-xl p-4 mt-6 mb-6">
        <Text className="text-white font-bold mb-4">Engagement Trend</Text>
        <View className="h-40 bg-white/5 rounded-lg items-center justify-center">
          <Ionicons name="bar-chart" size={48} color="#6B7280" />
          <Text className="text-gray-400 mt-2 text-sm">Chart visualization</Text>
        </View>
      </View>
    </ScrollView>
  );
}
