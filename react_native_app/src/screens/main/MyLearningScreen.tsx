import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/apiService';
import { useAuthStore } from '../../store/authStore';

interface EnrolledCourse {
  _id: string;
  courseId: string;
  title: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  category: string;
}

export default function MyLearningScreen({ navigation }: any) {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    loadEnrolledCourses();
  }, []);

  const loadEnrolledCourses = async () => {
    try {
      const res = await apiService.getMyEnrolledCourses();
      setCourses(res.data);
    } catch (error) {
      console.error('Failed to load enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const EnrolledCourseCard = ({ course }: { course: EnrolledCourse }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('CourseDetail', { courseId: course.courseId })}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-4 p-4"
    >
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-white font-bold text-base mb-1" numberOfLines={2}>
            {course.title}
          </Text>
          <Text className="text-gray-400 text-xs">{course.category}</Text>
        </View>
        <View className="bg-[#EA7E5C]/20 px-3 py-1 rounded-full">
          <Text className="text-[#EA7E5C] text-xs font-bold">{Math.round(course.progress)}%</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="bg-white/5 rounded-full h-2 mb-3 overflow-hidden">
        <View
          className="bg-gradient-to-r from-[#EA7E5C] to-[#EA7E5C]/60 h-full"
          style={{ width: `${course.progress}%` }}
        />
      </View>

      {/* Stats */}
      <View className="flex-row justify-between items-center">
        <Text className="text-gray-400 text-xs">
          {course.completedLessons} of {course.totalLessons} lessons
        </Text>
        <TouchableOpacity className="bg-[#EA7E5C] px-3 py-1 rounded-lg">
          <Text className="text-white text-xs font-bold">Continue</Text>
        </TouchableOpacity>
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
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 pt-4 pb-6 border-b border-white/10">
          <Text className="text-white text-3xl font-bold mb-2">My Learning</Text>
          <Text className="text-gray-400 text-sm">
            {courses.length} course{courses.length !== 1 ? 's' : ''} in progress
          </Text>
        </View>

        {/* Stats Overview */}
        {courses.length > 0 && (
          <View className="px-4 py-4 flex-row gap-3">
            <View className="flex-1 bg-white/5 border border-white/10 rounded-lg p-4">
              <Text className="text-gray-400 text-xs mb-1">Average Progress</Text>
              <Text className="text-white text-2xl font-bold">
                {Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length)}%
              </Text>
            </View>
            <View className="flex-1 bg-white/5 border border-white/10 rounded-lg p-4">
              <Text className="text-gray-400 text-xs mb-1">Completed</Text>
              <Text className="text-white text-2xl font-bold">
                {courses.filter(c => c.progress === 100).length}
              </Text>
            </View>
          </View>
        )}

        {/* Courses List */}
        <FlatList
          data={courses}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <EnrolledCourseCard course={item} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Ionicons name="school-outline" size={48} color="#6B7280" />
              <Text className="text-gray-400 mt-4">No courses yet</Text>
              <TouchableOpacity className="mt-4 bg-[#EA7E5C] px-6 py-2 rounded-lg">
                <Text className="text-white font-bold text-sm">Start Learning</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
