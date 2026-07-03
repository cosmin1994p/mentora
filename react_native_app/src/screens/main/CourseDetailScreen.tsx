import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/apiService';

const { width } = Dimensions.get('window');

export default function CourseDetailScreen({ route, navigation }: any) {
  const { courseId } = route.params;
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    loadCourseDetail();
  }, [courseId]);

  const loadCourseDetail = async () => {
    try {
      const res = await apiService.getCourseById(courseId);
      setCourse(res.data);
    } catch (error) {
      console.error('Failed to load course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      await apiService.enrollCourse(courseId);
      setIsEnrolled(true);
    } catch (error) {
      console.error('Failed to enroll:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0A0E27] items-center justify-center">
        <ActivityIndicator size="large" color="#EA7E5C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E27]">
      <ScrollView>
        {/* Hero Image */}
        <View className="bg-gradient-to-br from-[#EA7E5C] to-[#EA7E5C]/50 h-48 items-center justify-center relative">
          <Ionicons name="play-circle" size={80} color="#fff" />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute top-4 left-4 bg-black/30 rounded-full p-2"
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Course Info */}
        <View className="px-4 py-6">
          {/* Header */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="bg-[#EA7E5C]/20 px-3 py-1 rounded-full">
                <Text className="text-[#EA7E5C] text-xs font-bold">{course?.category}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={14} color="#EA7E5C" />
                <Text className="text-gray-300 text-sm font-bold">{course?.rating}</Text>
              </View>
            </View>
            <Text className="text-white text-2xl font-bold mb-2">{course?.title}</Text>
            <Text className="text-gray-400 text-sm">{course?.studentsEnrolled} students enrolled</Text>
          </View>

          {/* Instructor */}
          <View className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 flex-row items-center">
            <View className="bg-[#EA7E5C]/20 w-12 h-12 rounded-full items-center justify-center mr-3">
              <Ionicons name="person" size={24} color="#EA7E5C" />
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Instructor</Text>
              <Text className="text-white font-semibold">{course?.instructor}</Text>
            </View>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-white font-bold text-lg mb-2">About Course</Text>
            <Text className="text-gray-400 text-sm leading-6">{course?.description}</Text>
          </View>

          {/* Course Stats */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
              <Text className="text-gray-400 text-xs mb-1">Lessons</Text>
              <Text className="text-white font-bold text-lg">{course?.lessons || 0}</Text>
            </View>
            <View className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
              <Text className="text-gray-400 text-xs mb-1">Duration</Text>
              <Text className="text-white font-bold text-lg">{course?.duration || '0h'}</Text>
            </View>
            <View className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
              <Text className="text-gray-400 text-xs mb-1">Level</Text>
              <Text className="text-white font-bold text-lg capitalize">{course?.level || 'Beginner'}</Text>
            </View>
          </View>

          {/* Enroll Button */}
          <TouchableOpacity
            onPress={handleEnroll}
            disabled={isEnrolled}
            className={`rounded-lg py-4 mb-4 ${
              isEnrolled
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-[#EA7E5C]'
            }`}
          >
            <Text className={`font-bold text-center text-lg ${
              isEnrolled ? 'text-green-400' : 'text-white'
            }`}>
              {isEnrolled ? 'Enrolled' : 'Enroll Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
