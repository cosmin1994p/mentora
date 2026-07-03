// Check data in MongoDB Atlas
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/masterclass';

async function checkData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB:', mongoose.connection.db.databaseName);

        // Check courses
        const courses = await mongoose.connection.db.collection('courses').find({}).toArray();
        console.log('\n📚 COURSES:', courses.length);
        courses.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c.title} (${c.category})`);
        });

        // Check reels
        const reels = await mongoose.connection.db.collection('reels').find({}).toArray();
        console.log('\n🎬 REELS:', reels.length);
        reels.forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.title}`);
        });

        // Check users
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log('\n👥 USERS:', users.length);
        users.forEach((u, i) => {
            console.log(`  ${i + 1}. ${u.username} (${u.email}) - ${u.role}`);
        });

        await mongoose.disconnect();
        console.log('\n✓ Done');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkData();
