import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

mongoose.set('strictQuery', false);

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://GHINEA_TUDOR:stud@mongo.utaytsq.mongodb.net/streamclass?retryWrites=true&w=majority');
    
    const adminUsername = process.env.ADMIN_USERNAME || 'admintudy';
    const result = await User.updateOne({ username: adminUsername }, { $set: { role: 'admin' } });
    console.log('Fixed admin user:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
