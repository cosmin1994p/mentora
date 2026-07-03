import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await login(username, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-[#0A0E27]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1 justify-center px-6">
        {/* Logo */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-gradient-to-br from-[#EA7E5C] to-[#EA7E5C]/60 rounded-2xl items-center justify-center mb-6">
            <Text className="text-3xl font-bold text-white">SC</Text>
          </View>
          <Text className="text-3xl font-bold text-white mb-2">Welcome Back</Text>
          <Text className="text-gray-400 text-sm">Sign in to continue learning</Text>
        </View>

        {/* Form */}
        <View className="gap-4 mb-6">
          {/* Username */}
          <View>
            <Text className="text-gray-400 text-sm mb-2 font-medium">Username or Email</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              placeholder="Enter your username"
              placeholderTextColor="#6B7280"
              value={username}
              onChangeText={setUsername}
              editable={!isLoading}
            />
          </View>

          {/* Password */}
          <View>
            <Text className="text-gray-400 text-sm mb-2 font-medium">Password</Text>
            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-lg px-4 py-3">
              <TextInput
                className="flex-1 text-white"
                placeholder="Enter your password"
                placeholderTextColor="#6B7280"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text className="text-gray-400 ml-2">
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity>
            <Text className="text-[#EA7E5C] text-right text-sm font-medium">Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          className={`bg-gradient-to-r from-[#EA7E5C] to-[#EA7E5C] rounded-lg py-3 mb-4 ${isLoading ? 'opacity-50' : ''}`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text className="text-white font-bold text-center text-lg">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {/* Register Link */}
        <View className="flex-row justify-center gap-1">
          <Text className="text-gray-400 text-sm">Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-[#EA7E5C] font-bold text-sm">Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
