import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

async function testEnroll() {
    await mongoose.connect('mongodb://localhost:27017/masterclass');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get a course
    const course = await db.collection('courses').findOne({ title: 'Music Production Masterclass' });
    console.log('Course:', course?.title, 'ID:', course?._id);

    // Get a user
    const user = await db.collection('users').findOne({ username: 'Mihai' });
    console.log('User:', user?.username, 'ID:', user?._id);

    if (course && user) {
        // Simulate enrollment
        const result = await db.collection('users').updateOne(
            { _id: user._id },
            { $addToSet: { enrolledCourses: course._id } }
        );
        console.log('Enrollment result:', result.modifiedCount > 0 ? 'Success' : 'Already enrolled');

        // Update course enrollment count
        await db.collection('courses').updateOne(
            { _id: course._id },
            { $inc: { enrollmentCount: 1 } }
        );
        console.log('Course enrollment count updated');
    }

    await mongoose.disconnect();
    console.log('Done!');
}

testEnroll().catch(console.error);
