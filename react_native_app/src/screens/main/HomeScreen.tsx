import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/apiService';

interface Course {
  _id: string;
  title: string;
  category: string;
  thumbnail: string;
  rating: number;
  studentsEnrolled: number;
  description: string;
  price?: number;
}

export default function HomeScreen({ navigation }: any) {
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [recentReels, setRecentReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const [coursesRes, reelsRes] = await Promise.all([
        apiService.getAllCourses(),
        apiService.getAllReels(),
      ]);
      setFeaturedCourses(coursesRes.data.slice(0, 5));
      setRecentReels(reelsRes.data.slice(0, 10));
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CourseCard = ({ course }: { course: Course }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('CourseDetail', { courseId: course._id })}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mr-4 w-48"
    >
      {/* Thumbnail */}
      <View className="bg-gradient-to-br from-[#EA7E5C] to-[#EA7E5C]/50 h-28 items-center justify-center">
        <Ionicons name="play-circle" size={40} color="#fff" />
      </View>

      {/* Content */}
      <View className="p-3">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-white font-bold text-sm flex-1" numberOfLines={2}>
            {course.title}
          </Text>
        </View>

        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={12} color="#EA7E5C" />
            <Text className="text-gray-300 text-xs">{course.rating}</Text>
          </View>
          <Text className="text-gray-400 text-xs">{course.studentsEnrolled} students</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ReelCard = ({ reel }: { reel: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ReelViewer', { reelId: reel._id })}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-4 h-48"
    >
      <View className="flex-1 bg-gradient-to-br from-[#EA7E5C]/20 to-[#EA7E5C]/5 items-center justify-center">
        <Ionicons name="play" size={50} color="#EA7E5C" />
        <Text className="text-white text-xs mt-2 px-3 text-center" numberOfLines={2}>
          {reel.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0A0E27] items-center justify-center">
        <ActivityIndicator size="large" color="#EA7E5C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E27]">
      <FlatList
        data={[{ id: 'header' }, ...featuredCourses.map(c => ({ ...c, id: c._id }))]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.id === 'header') {
            return (
              <View className="px-4 pt-4 pb-6">
                {/* Welcome Section */}
                <View className="mb-8">
                  <Text className="text-gray-400 text-sm mb-1">Welcome back!</Text>
                  <Text className="text-white text-3xl font-bold">Learn Today,</Text>
                  <Text className="text-white text-3xl font-bold">
                    Grow <Text className="text-[#EA7E5C]">Tomorrow</Text>
                  </Text>
                </View>

                {/* Search Bar */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('Search')}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex-row items-center gap-3 mb-8"
                >
                  <Ionicons name="search" size={20} color="#6B7280" />
                  <Text className="text-gray-500 flex-1">Search courses...</Text>
                </TouchableOpacity>

                {/* Featured Section */}
                <View className="mb-6">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white font-bold text-lg">Featured Courses</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Courses')}>
                      <Text className="text-[#EA7E5C] text-sm">View all</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }

          return <CourseCard course={item as Course} />;
        }}
        ListFooterComponent={
          <View className="px-4 py-8">
            {/* Trending Reels */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white font-bold text-lg">Trending Reels</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Reels')}>
                  <Text className="text-[#EA7E5C] text-sm">View all</Text>
                </TouchableOpacity>
              </View>
            </View>

            {recentReels.map((reel) => (
              <ReelCard key={reel._id} reel={reel} />
            ))}
          </View>
        }
        horizontal={false}
        scrollEnabled={true}
      />
    </SafeAreaView>
  );
}
