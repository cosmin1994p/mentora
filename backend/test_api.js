import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

console.log('Connecting to MongoDB...');
const conn = await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected!');

const user = await User.findOne();
console.log('First user:', user?.username, user?._id);

if (user) {
  console.log('User details:', {
    id: user._id,
    username: user.username,
    email: user.email,
    currentEmotion: user.currentEmotion,
    currentEnergyLevel: user.currentEnergyLevel
  });
}

process.exit(0);
