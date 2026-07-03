import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminVideoManagement from '../admin/AdminVideoManagement';
import AdminUserManagement from '../admin/AdminUserManagement';
import AdminAnalytics from '../admin/AdminAnalytics';

const Tab = MaterialTopTabNavigator();

export default function AdminPanelScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#0A0E27]">
      {/* Header */}
      <View className="px-4 pt-4 pb-4 border-b border-white/10">
        <View className="flex-row items-center gap-3">
          <View className="bg-red-500/20 p-2 rounded-lg">
            <Ionicons name="shield" size={24} color="#EF4444" />
          </View>
          <View>
            <Text className="text-white text-xl font-bold">Admin Panel</Text>
            <Text className="text-gray-400 text-xs">Platform Management</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigator */}
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
          tabBarStyle: { backgroundColor: '#0A0E27', borderBottomColor: '#ffffff1a' },
          tabBarIndicatorStyle: { backgroundColor: '#EA7E5C', height: 3 },
          tabBarActiveTintColor: '#EA7E5C',
          tabBarInactiveTintColor: '#6B7280',
          tabBarScrollEnabled: true,
        }}
      >
        <Tab.Screen
          name="Videos"
          component={AdminVideoManagement}
          options={{
            tabBarLabel: 'Videos',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="film" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Users"
          component={AdminUserManagement}
          options={{
            tabBarLabel: 'Users',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AdminAnalytics}
          options={{
            tabBarLabel: 'Analytics',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}
