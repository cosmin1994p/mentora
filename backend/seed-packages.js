import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Package from './src/models/Package.js';
import Course from './src/models/Course.js';
import User from './src/models/User.js';

dotenv.config();

// Fix mongoose strictQuery deprecation warning
mongoose.set('strictQuery', false);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamclass';
// The user prompt mentioned MongoDB Atlas earlier: mongodb+srv://GHINEA_TUDOR:stud@mongo.utaytsq.mongodb.net
// But let's rely on .env

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    // We will connect using the MONGODB_URI from .env, but fallback to the one provided by user if needed
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://GHINEA_TUDOR:stud@mongo.utaytsq.mongodb.net/streamclass?retryWrites=true&w=majority');
    console.log('Connected!');

    // 1. Create Packages
    const packagesData = [
      {
        name: 'Free',
        order: 1,
        description: 'Basic access to free courses',
        priceMonthly: 0,
        priceAnnual: 0,
        features: [{ name: 'Access to free courses', included: true }, { name: 'Premium Courses', included: false }]
      },
      {
        name: 'Starter',
        order: 2,
        description: 'Good for individuals starting out',
        priceMonthly: 9.99,
        priceAnnual: 99.99,
        features: [{ name: 'Access to Starter courses', included: true }, { name: 'Premium Support', included: false }]
      },
      {
        name: 'Growth',
        order: 3,
        description: 'Perfect for professionals',
        priceMonthly: 29.99,
        priceAnnual: 299.99,
        features: [{ name: 'Access to Growth courses', included: true }, { name: 'Premium Support', included: true }]
      },
      {
        name: 'Enterprise',
        order: 4,
        description: 'Full access for teams',
        priceMonthly: 99.99,
        priceAnnual: 999.99,
        features: [{ name: 'All courses unlocked', included: true }, { name: 'Dedicated Account Manager', included: true }]
      }
    ];

    console.log('Clearing old packages...');
    await Package.deleteMany({});
    
    console.log('Inserting new packages...');
    const insertedPackages = await Package.insertMany(packagesData);
    console.log('Inserted packages:', insertedPackages.map(p => p.name));

    // 2. Lock existing courses
    console.log('Updating courses to require Growth package...');
    const result = await Course.updateMany(
      {},
      { 
        $set: { 
          packageTiers: ['Growth', 'Enterprise'],
          isFree: false
        } 
      }
    );
    console.log(`Updated ${result.modifiedCount} courses to be locked.`);

    // 3. Make sure the current user is Free so they see the locks
    console.log('Resetting users to Free package...');
    const freePackage = insertedPackages.find(p => p.name === 'Free');
    if (freePackage) {
      const userResult = await User.updateMany({}, { $set: { package: freePackage._id, role: 'user' }});
      console.log(`Updated ${userResult.modifiedCount} users to Free package.`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

seed();
