import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../../services/apiService';

export default function AdminUserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await apiService.getAllUsers();
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const UserItem = ({ user }: any) => (
    <View className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-white font-bold text-sm mb-1">{user.name}</Text>
          <Text className="text-gray-400 text-xs">{user.email}</Text>
        </View>
        <View className="bg-blue-500/20 px-2 py-1 rounded">
          <Text className="text-blue-400 text-xs font-bold capitalize">{user.role}</Text>
        </View>
      </View>

      <View className="flex-row gap-4 mb-3">
        <View>
          <Text className="text-gray-400 text-xs">Courses</Text>
          <Text className="text-white font-bold">{user.enrolledCourses || 0}</Text>
        </View>
        <View>
          <Text className="text-gray-400 text-xs">Completed</Text>
          <Text className="text-white font-bold">{user.completedCourses || 0}</Text>
        </View>
        <View>
          <Text className="text-gray-400 text-xs">Joined</Text>
          <Text className="text-white font-bold text-xs">
            {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <TouchableOpacity className="bg-[#EA7E5C]/20 border border-[#EA7E5C]/30 rounded-lg py-2">
        <Text className="text-[#EA7E5C] text-center font-bold text-xs">View Details</Text>
      </TouchableOpacity>
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
        <View className="grid grid-cols-3 gap-3 mb-6">
          <View className="bg-white/5 border border-white/10 rounded-lg p-3">
            <Text className="text-gray-400 text-xs mb-1">Total Users</Text>
            <Text className="text-white text-2xl font-bold">{users.length}</Text>
          </View>
          <View className="bg-white/5 border border-white/10 rounded-lg p-3">
            <Text className="text-gray-400 text-xs mb-1">Admins</Text>
            <Text className="text-white text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </Text>
          </View>
          <View className="bg-white/5 border border-white/10 rounded-lg p-3">
            <Text className="text-gray-400 text-xs mb-1">Active</Text>
            <Text className="text-white text-2xl font-bold">
              {users.filter(u => u.isActive).length}
            </Text>
          </View>
        </View>

        {/* Users List */}
        {users.map((user) => (
          <UserItem key={user._id} user={user} />
        ))}
      </ScrollView>
    </View>
  );
}
