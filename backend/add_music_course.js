import mongoose from 'mongoose';

async function addMusicCourse() {
    await mongoose.connect('mongodb://localhost:27017/masterclass');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    const musicCourse = {
        title: "Music Production Masterclass",
        description: "Learn to create professional music tracks from scratch using modern DAW software.",
        instructor: "DJ Marcus Hall",
        duration: 200,
        category: "music",
        tags: ["music", "audio", "production", "creative", "beats", "DAW"],
        thumbnail: { url: "https://images.unsplash.com/photo-1511379938547-c1f69419868d" },
        rating: 4.8,
        enrollmentCount: 14500,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await db.collection('courses').insertOne(musicCourse);
    console.log('Added Music Production Masterclass');

    // Verify
    const count = await db.collection('courses').countDocuments();
    console.log(`Total courses now: ${count}`);

    await mongoose.disconnect();
}

addMusicCourse().catch(console.error);
