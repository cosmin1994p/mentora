import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/apiService';

export default function ReelViewerScreen({ route, navigation }: any) {
  const { reelId } = route.params;
  const [reel, setReel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    loadReel();
  }, [reelId]);

  const loadReel = async () => {
    try {
      const res = await apiService.getReelById(reelId);
      setReel(res.data);
    } catch (error) {
      console.error('Failed to load reel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      await apiService.likeReel(reelId);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Failed to like reel:', error);
    }
  };

  const handleWatch = async () => {
    try {
      await apiService.watchReel(reelId);
    } catch (error) {
      console.error('Failed to record watch:', error);
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
      {/* Video Player */}
      <View className="bg-black w-full aspect-video items-center justify-center relative">
        <Ionicons name="play" size={80} color="#EA7E5C" />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute top-4 left-4 bg-black/50 rounded-full p-2"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Action Buttons */}
        <View className="absolute right-4 bottom-1/3 gap-4">
          <TouchableOpacity
            onPress={handleLike}
            className="items-center gap-1"
          >
            <View className="bg-white/10 rounded-full p-3">
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? '#EA7E5C' : '#fff'}
              />
            </View>
            <Text className="text-white text-xs font-bold">{reel?.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center gap-1">
            <View className="bg-white/10 rounded-full p-3">
              <Ionicons name="eye-outline" size={24} color="#fff" />
            </View>
            <Text className="text-white text-xs font-bold">{reel?.views}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center gap-1">
            <View className="bg-white/10 rounded-full p-3">
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            </View>
            <Text className="text-white text-xs font-bold">Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reel Info */}
      <View className="flex-1 px-4 py-6">
        <View className="mb-4">
          <Text className="text-white text-xl font-bold mb-2">{reel?.title}</Text>
          <Text className="text-gray-400 text-sm mb-2">{reel?.category}</Text>
          <Text className="text-gray-400 text-sm">{reel?.description}</Text>
        </View>

        {/* Creator Info */}
        <View className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 gap-3">
            <View className="bg-[#EA7E5C]/20 w-10 h-10 rounded-full items-center justify-center">
              <Ionicons name="person" size={20} color="#EA7E5C" />
            </View>
            <View>
              <Text className="text-white font-semibold text-sm">{reel?.creator}</Text>
              <Text className="text-gray-400 text-xs">{reel?.creatorFollowers} followers</Text>
            </View>
          </View>
          <TouchableOpacity className="bg-[#EA7E5C] px-4 py-2 rounded-full">
            <Text className="text-white font-bold text-xs">Follow</Text>
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View className="flex-1">
          <Text className="text-white font-bold text-lg mb-3">Comments ({reel?.comments || 0})</Text>
          <View className="bg-white/5 border border-white/10 rounded-lg p-4 items-center justify-center flex-1">
            <Ionicons name="chatbubbles-outline" size={40} color="#6B7280" />
            <Text className="text-gray-400 mt-2">No comments yet</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
