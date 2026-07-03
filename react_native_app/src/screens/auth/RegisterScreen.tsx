import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { isLoading } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !username || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Implement register logic
    try {
      // await register(username, email, password, name);
      Alert.alert('Success', 'Account created! Please log in');
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-[#0A0E27]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1 justify-center px-6">
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-white mb-2">Create Account</Text>
          <Text className="text-gray-400 text-sm">Start your learning journey</Text>
        </View>

        {/* Form */}
        <View className="gap-4 mb-6">
          {/* Name */}
          <View>
            <Text className="text-gray-400 text-sm mb-2 font-medium">Full Name</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              placeholder="Enter your full name"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
              editable={!isLoading}
            />
          </View>

          {/* Email */}
          <View>
            <Text className="text-gray-400 text-sm mb-2 font-medium">Email</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              placeholder="Enter your email"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />
          </View>

          {/* Username */}
          <View>
            <Text className="text-gray-400 text-sm mb-2 font-medium">Username</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              placeholder="Choose a username"
              placeholderTextColor="#6B7280"
              value={username}
              onChangeText={setUsername}
              editable={!isLoading}
            />
          </View>

          {/* Password */}
          <View>
            <Text className="text-gray-400 text-sm mb-2 font-medium">Password</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              placeholder="Create a password"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
          </View>

          {/* Confirm Password */}
          <View>
            <Text className="text-gray-400 text-sm mb-2 font-medium">Confirm Password</Text>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              placeholder="Confirm your password"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          className={`bg-gradient-to-r from-[#EA7E5C] to-[#EA7E5C] rounded-lg py-3 mb-4 ${isLoading ? 'opacity-50' : ''}`}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text className="text-white font-bold text-center text-lg">
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View className="flex-row justify-center gap-1">
          <Text className="text-gray-400 text-sm">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-[#EA7E5C] font-bold text-sm">Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
