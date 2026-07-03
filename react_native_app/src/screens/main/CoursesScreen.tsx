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

export default function CoursesScreen({ navigation }: any) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Web Development', 'Mobile App', 'Data Science', 'UI/UX Design', 'Business'];

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    filterCourses(selectedCategory);
  }, [selectedCategory]);

  const loadCourses = async () => {
    try {
      const res = await apiService.getAllCourses();
      setCourses(res.data);
      setFilteredCourses(res.data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = (category: string) => {
    if (category === 'All') {
      setFilteredCourses(courses);
    } else {
      setFilteredCourses(courses.filter(c => c.category === category));
    }
  };

  const CourseListItem = ({ course }: { course: Course }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('CourseDetail', { courseId: course._id })}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-4 flex-row"
    >
      {/* Thumbnail */}
      <View className="bg-gradient-to-br from-[#EA7E5C] to-[#EA7E5C]/50 w-24 h-24 items-center justify-center">
        <Ionicons name="play-circle" size={30} color="#fff" />
      </View>

      {/* Content */}
      <View className="flex-1 p-3">
        <Text className="text-white font-bold text-sm mb-1" numberOfLines={2}>
          {course.title}
        </Text>
        <Text className="text-gray-400 text-xs mb-2">{course.category}</Text>
        <View className="flex-row justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={12} color="#EA7E5C" />
            <Text className="text-gray-300 text-xs">{course.rating}</Text>
          </View>
          <Text className="text-gray-400 text-xs">{course.studentsEnrolled} enrolled</Text>
        </View>
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
          <Text className="text-white text-3xl font-bold mb-4">Courses</Text>

          {/* Category Filters */}
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item)}
                className={`px-4 py-2 rounded-full mr-2 border ${
                  selectedCategory === item
                    ? 'bg-[#EA7E5C] border-[#EA7E5C]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === item ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Courses List */}
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <CourseListItem course={item} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Ionicons name="book-outline" size={48} color="#6B7280" />
              <Text className="text-gray-400 mt-4 text-center">No courses found</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
