import mongoose from 'mongoose';

async function checkUsers() {
    await mongoose.connect('mongodb://localhost:27017/masterclass');

    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();

    console.log('Users in database:');
    for (const user of users) {
        console.log(`- ID: ${user._id}, Username: ${user.username}, Email: ${user.email}`);
        console.log(`  EnrolledCourses: ${JSON.stringify(user.enrolledCourses || [])}`);
    }

    await mongoose.disconnect();
}

checkUsers().catch(console.error);
