import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/apiService';

interface Reel {
  _id: string;
  title: string;
  category: string;
  likes: number;
  views: number;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 32) / 2;

export default function ReelsScreen({ navigation }: any) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      const res = await apiService.getAllReels();
      setReels(res.data);
    } catch (error) {
      console.error('Failed to load reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const ReelCard = ({ reel }: { reel: Reel }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ReelViewer', { reelId: reel._id })}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-4"
      style={{ width: CARD_WIDTH }}
    >
      {/* Thumbnail */}
      <View className="bg-gradient-to-br from-[#EA7E5C] to-[#EA7E5C]/50 items-center justify-center" style={{ height: CARD_WIDTH }}>
        <Ionicons name="play" size={40} color="#fff" />
      </View>

      {/* Info */}
      <View className="p-3">
        <Text className="text-white font-bold text-sm mb-2" numberOfLines={2}>
          {reel.title}
        </Text>

        <View className="flex-row justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="heart" size={12} color="#EA7E5C" />
            <Text className="text-gray-300 text-xs">{reel.likes}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="eye" size={12} color="#6B7280" />
            <Text className="text-gray-300 text-xs">{reel.views}</Text>
          </View>
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
        <View className="px-4 pt-4 pb-4 border-b border-white/10">
          <Text className="text-white text-3xl font-bold">Trending Reels</Text>
        </View>

        {/* Reels Grid */}
        <FlatList
          data={reels}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ReelCard reel={item} />}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Ionicons name="film-outline" size={48} color="#6B7280" />
              <Text className="text-gray-400 mt-4">No reels yet</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
