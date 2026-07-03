
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function restoreJacksonCourse() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to Atlas');

        const db = mongoose.connection.db;

        // 1. Check if course already exists
        const existing = await db.collection('courses').findOne({
            title: { $regex: /Samuel L. Jackson/i }
        });

        if (existing) {
            console.log('! Course already exists:', existing.title);
            console.log('ID:', existing._id);
            // Update it just in case
        }

        // 2. Find orphaned image and video
        // Image ID from previous inspection: 6985e86fdaf0672ddac284f9
        const imageId = new mongoose.Types.ObjectId("6985e86fdaf0672ddac284f9");

        // Video ID from previous inspection: 6985e85ddaf0672ddac28484
        const videoId = new mongoose.Types.ObjectId("6985e85ddaf0672ddac28484");

        const courseData = {
            title: "Samuel L. Jackson Teaches Acting",
            instructor: "Samuel L. Jackson",
            category: "Acting",
            description: "Oscar-nominated actor Samuel L. Jackson teaches you how to master auditions, analyze scripts, and find the truth in every role.",
            duration: "5h 0m",
            lessons: 21,
            rating: 4.9,
            students: 15000,
            thumbnail: `http://localhost:8080/api/media/${imageId}`,
            thumbnailImageId: imageId, // Store as ObjectId
            videoUrl: `http://localhost:8080/api/media/${videoId}`,
            tags: ["acting", "performance", "cinema", "character", "storytelling"],
            lessonsData: [], // Add lessons if needed
            createdAt: new Date()
        };

        if (existing) {
            await db.collection('courses').updateOne(
                { _id: existing._id },
                { $set: courseData }
            );
            console.log('✓ Updated existing course');
        } else {
            const result = await db.collection('courses').insertOne(courseData);
            console.log('✓ Created new course with ID:', result.insertedId);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

restoreJacksonCourse();
