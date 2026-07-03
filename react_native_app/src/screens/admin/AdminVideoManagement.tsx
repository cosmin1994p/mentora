import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../../services/apiService';

export default function AdminVideoManagement() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const res = await apiService.getAdminVideos();
      setVideos(res.data);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const VideoItem = ({ video }: any) => (
    <View className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-white font-bold text-sm mb-1" numberOfLines={2}>
            {video.title}
          </Text>
          <Text className="text-gray-400 text-xs">{video.instructor}</Text>
        </View>
        <View className="bg-[#EA7E5C]/20 px-2 py-1 rounded">
          <Text className="text-[#EA7E5C] text-xs font-bold capitalize">{video.status}</Text>
        </View>
      </View>

      <View className="flex-row gap-4 mb-3">
        <View>
          <Text className="text-gray-400 text-xs">Views</Text>
          <Text className="text-white font-bold">{video.views}</Text>
        </View>
        <View>
          <Text className="text-gray-400 text-xs">Duration</Text>
          <Text className="text-white font-bold">{video.duration}m</Text>
        </View>
        <View>
          <Text className="text-gray-400 text-xs">Uploaded</Text>
          <Text className="text-white font-bold">
            {new Date(video.uploadedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity className="flex-1 bg-blue-500/20 border border-blue-500/30 rounded-lg py-2">
          <Text className="text-blue-400 text-center font-bold text-xs">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-red-500/20 border border-red-500/30 rounded-lg py-2">
          <Text className="text-red-400 text-center font-bold text-xs">Delete</Text>
        </TouchableOpacity>
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
    <View className="flex-1 bg-[#0A0E27]">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
            <Text className="text-gray-400 text-xs mb-1">Total Videos</Text>
            <Text className="text-white text-2xl font-bold">{videos.length}</Text>
          </View>
          <View className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
            <Text className="text-gray-400 text-xs mb-1">Total Views</Text>
            <Text className="text-white text-2xl font-bold">
              {videos.reduce((acc, v) => acc + (v.views || 0), 0)}
            </Text>
          </View>
        </View>

        {/* Upload Button */}
        <TouchableOpacity className="bg-[#EA7E5C] rounded-lg py-3 mb-6">
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="cloud-upload" size={20} color="#fff" />
            <Text className="text-white font-bold">Upload Video</Text>
          </View>
        </TouchableOpacity>

        {/* Videos List */}
        {videos.map((video) => (
          <VideoItem key={video._id} video={video} />
        ))}
      </ScrollView>
    </View>
  );
}
