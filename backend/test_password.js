import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __envFile = path.resolve(__dirname, '.env');
dotenv.config({ path: __envFile });

async function testPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Import User model
    const User = (await import('./src/models/User.js')).default;
    
    // Find admin user
    const admin = await User.findOne({username: 'admintudy', role: 'admin'});
    
    if (!admin) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    
    console.log('✓ Admin user found:');
    console.log('  - Username:', admin.username);
    console.log('  - Email:', admin.email);
    console.log('  - Role:', admin.role);
    console.log('  - Password hash:', admin.password.substring(0, 30) + '...');
    
    // Test password comparison
    const testPassword = 'admintudy';
    const matches = await admin.comparePassword(testPassword);
    
    console.log('\n✓ Password test:');
    console.log('  - Testing password:', testPassword);
    console.log('  - Password matches:', matches ? '✓ YES' : '❌ NO');
    
    if (!matches) {
      console.log('\n⚠️  Password mismatch! Resetting admin password...');
      admin.password = testPassword;
      await admin.save();
      console.log('✓ Admin password reset to:', testPassword);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testPassword();
