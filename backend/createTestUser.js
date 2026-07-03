import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://USER:PASS@your-cluster.mongodb.net/mentora';

async function createTestUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB Atlas');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Check if test user exists
        const existingUser = await usersCollection.findOne({ email: 'test@test.com' });

        if (existingUser) {
            console.log('Test user already exists, updating password...');
            const hashedPassword = await bcrypt.hash('test123456', 12);
            await usersCollection.updateOne(
                { email: 'test@test.com' },
                { $set: { password: hashedPassword } }
            );
            console.log('Password updated!');
        } else {
            console.log('Creating test user...');
            const hashedPassword = await bcrypt.hash('test123456', 12);
            await usersCollection.insertOne({
                username: 'testuser',
                email: 'test@test.com',
                password: hashedPassword,
                role: 'user',
                currentEmotion: 'NEUTRAL',
                currentEnergyLevel: 'MEDIUM',
                interests: ['Technology', 'Programming'],
                hobbies: 'Coding',
                activityDomain: 'Technology',
                preferredTags: [],
                enrolledCourses: [],
                completedCourses: [],
                createdAt: new Date()
            });
            console.log('Test user created!');
        }

        console.log('');
        console.log('=== TEST CREDENTIALS ===');
        console.log('Email: test@test.com');
        console.log('Password: test123456');
        console.log('========================');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createTestUser();
