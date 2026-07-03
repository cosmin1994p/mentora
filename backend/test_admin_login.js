import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __envFile = path.resolve(__dirname, '.env');
dotenv.config({ path: __envFile });

async function testAdminLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    
    const User = (await import('./src/models/User.js')).default;
    const Activity = (await import('./src/models/Activity.js')).default;
    
    const admin = await User.findOne({username: 'admintudy', role: 'admin'});
    
    if (!admin) {
      console.log('❌ Admin not found');
      process.exit(1);
    }
    
    console.log('✓ Admin found:', admin.username);
    
    // Test password
    const passwordValid = await admin.comparePassword('admintudy');
    console.log('✓ Password valid:', passwordValid);
    
    if (!passwordValid) {
      console.log('❌ Password does not match!');
      process.exit(1);
    }
    
    // Update login stats
    admin.lastLogin = new Date();
    admin.loginCount = (admin.loginCount || 0) + 1;
    await admin.save();
    console.log('✓ Updated admin login stats');
    
    // Try Activity.logActivity
    console.log('\n📝 Testing Activity.logActivity...');
    try {
      await Activity.logActivity(admin._id, 'login', {
        details: { adminLogin: true },
        ipAddress: '127.0.0.1',
        userAgent: 'Test'
      });
      console.log('✓ Activity logged successfully');
    } catch (actError) {
      console.error('❌ Activity logging failed:', actError.message);
      console.error('Stack:', actError.stack);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testAdminLogin();
