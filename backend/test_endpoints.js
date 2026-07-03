import mongoose from 'mongoose';
import User from './src/models/User.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Connect to DB
console.log('Connecting to MongoDB...');
await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected!');

// Find first user or admin
const user = await User.findOne({ role: 'user' }).limit(1);
if (!user) {
  console.log('No users found, using admin');
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('No users or admin found!');
    process.exit(1);
  }
}

console.log('User:', user?.username || 'admin');
const userId = user?._id || (await User.findOne({ role: 'admin' }))?._id;
console.log('User ID:', userId);

// Generate test token
const jwtSecret = process.env.JWT_SECRET || 'Mentora_super_secret_key_2024';
const token = jwt.sign(
  { userId: userId, email: user?.email, role: user?.role || 'admin' },
  jwtSecret,
  { expiresIn: '1h' }
);

console.log('\nTesting API endpoints...\n');

// Test 1: Update emotion
console.log('1. Testing PUT /api/auth/emotion');
try {
  const response = await fetch('http://localhost:8080/api/auth/emotion', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ emotion: 'happy', energyLevel: 'high' })
  });

  const data = await response.json();
  console.log('   Status:', response.status);
  console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 200));
} catch (error) {
  console.error('   Error:', error.message);
}

// Test 2: Get notifications
console.log('\n2. Testing GET /api/notifications');
try {
  const response = await fetch('http://localhost:8080/api/notifications', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('   Status:', response.status);
  console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 200));
} catch (error) {
  console.error('   Error:', error.message);
}

// Test 3: Get courses
console.log('\n3. Testing GET /api/courses');
try {
  const response = await fetch('http://localhost:8080/api/courses', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('   Status:', response.status);
  const courseCount = Array.isArray(data) ? data.length : data?.data?.length || 0;
  console.log('   Courses found:', courseCount);
  if (Array.isArray(data) && data[0]) {
    console.log('   First course videoUrl:', data[0].videoUrl ? 'SET' : 'NOT SET');
  }
} catch (error) {
  console.error('   Error:', error.message);
}

process.exit(0);
