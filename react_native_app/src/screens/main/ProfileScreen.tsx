import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/apiService';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
        style: 'destructive',
      },
    ]);
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await updateProfile(formData);
      Alert.alert('Success', 'Profile updated successfully');
      setEditMode(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const ProfileSection = ({ title, children }: any) => (
    <View className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
      <Text className="text-white font-bold text-lg mb-4">{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E27]">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        {/* Header */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-gradient-to-br from-[#EA7E5C] to-[#EA7E5C]/50 rounded-full items-center justify-center mb-4">
            <Ionicons name="person" size={48} color="#fff" />
          </View>
          <Text className="text-white text-2xl font-bold">{user?.name}</Text>
          <Text className="text-gray-400 text-sm">{user?.email}</Text>
          <View className="mt-2 bg-[#EA7E5C]/20 px-4 py-1 rounded-full">
            <Text className="text-[#EA7E5C] text-xs font-bold capitalize">{user?.role}</Text>
          </View>
        </View>

        {/* Profile Info */}
        {editMode ? (
          <ProfileSection title="Edit Profile">
            {/* Name Input */}
            <View className="mb-4">
              <Text className="text-gray-400 text-sm mb-2">Name</Text>
              {/* TextInput would go here in real implementation */}
              <View className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white">
                <Text className="text-white">{formData.name}</Text>
              </View>
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-gray-400 text-sm mb-2">Email</Text>
              <View className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white">
                <Text className="text-white">{formData.email}</Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleUpdateProfile}
              disabled={loading}
              className={`bg-[#EA7E5C] rounded-lg py-3 ${loading ? 'opacity-50' : ''}`}
            >
              <Text className="text-white font-bold text-center">
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setEditMode(false)}
              className="bg-white/5 border border-white/10 rounded-lg py-3 mt-2"
            >
              <Text className="text-white font-bold text-center">Cancel</Text>
            </TouchableOpacity>
          </ProfileSection>
        ) : (
          <ProfileSection title="Profile Information">
            {/* Name */}
            <View className="mb-4 flex-row justify-between items-center">
              <View>
                <Text className="text-gray-400 text-xs mb-1">Full Name</Text>
                <Text className="text-white font-semibold">{user?.name}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#EA7E5C" />
            </View>

            {/* Email */}
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-400 text-xs mb-1">Email Address</Text>
                <Text className="text-white font-semibold">{user?.email}</Text>
              </View>
            </View>

            {/* Edit Button */}
            <TouchableOpacity
              onPress={() => setEditMode(true)}
              className="bg-[#EA7E5C] rounded-lg py-3 mt-4"
            >
              <Text className="text-white font-bold text-center">Edit Profile</Text>
            </TouchableOpacity>
          </ProfileSection>
        )}

        {/* Preferences */}
        <ProfileSection title="Preferences">
          <TouchableOpacity className="flex-row justify-between items-center py-3 border-b border-white/5">
            <View className="flex-row items-center gap-3">
              <Ionicons name="moon-outline" size={20} color="#EA7E5C" />
              <Text className="text-white">Dark Mode</Text>
            </View>
            <Text className="text-[#EA7E5C]">Enabled</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row justify-between items-center py-3 border-b border-white/5">
            <View className="flex-row items-center gap-3">
              <Ionicons name="notifications-outline" size={20} color="#EA7E5C" />
              <Text className="text-white">Notifications</Text>
            </View>
            <Text className="text-[#EA7E5C]">Enabled</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row justify-between items-center py-3">
            <View className="flex-row items-center gap-3">
              <Ionicons name="language" size={20} color="#EA7E5C" />
              <Text className="text-white">Language</Text>
            </View>
            <Text className="text-gray-400">English</Text>
          </TouchableOpacity>
        </ProfileSection>

        {/* Support */}
        <ProfileSection title="Support">
          <TouchableOpacity className="flex-row justify-between items-center py-3 border-b border-white/5">
            <View className="flex-row items-center gap-3">
              <Ionicons name="help-circle-outline" size={20} color="#EA7E5C" />
              <Text className="text-white">Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row justify-between items-center py-3">
            <View className="flex-row items-center gap-3">
              <Ionicons name="information-circle-outline" size={20} color="#EA7E5C" />
              <Text className="text-white">About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </ProfileSection>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 items-center"
        >
          <Text className="text-red-400 font-bold">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
