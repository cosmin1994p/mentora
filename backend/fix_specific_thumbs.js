import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function fixAllThumbs() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to Atlas\n');

    const db = mongoose.connection.db;

    // Get all files
    const files = await db.collection('uploads.files').find({}).toArray();

    // Separate images from videos
    const videoFiles = files.filter(f =>
        f.filename.endsWith('.mp4') ||
        f.contentType?.includes('video')
    );

    const videoList = videoFiles.map(f => `${f._id}: ${f.filename}`).join('\n');
    fs.writeFileSync('videos_list.txt', videoList);
    console.log('Written detailed video list to videos_list.txt');

    // Get all courses
    const courses = await db.collection('courses').find({}).toArray();
    console.log(`\n📚 Fixing ${courses.length} courses...\n`);

    // Mapping of course keywords to image files
    const mappings = [
        { keywords: ['judd', 'apatow', 'comedy'], imageMatch: 'judd' },
        { keywords: ['malala', 'change'], imageMatch: 'malala' },
        { keywords: ['samuel', 'jackson', 'acting'], imageMatch: 'samuel' },
    ];

    for (const course of courses) {
        const titleLower = course.title.toLowerCase();

        for (const map of mappings) {
            if (map.keywords.some(k => titleLower.includes(k))) {
                // Find the matching image file (not video!)
                const matchingImage = imageFiles.find(f =>
                    f.filename.toLowerCase().includes(map.imageMatch)
                );

                if (matchingImage) {
                    console.log(`✓ ${course.title}`);
                    console.log(`  -> ${matchingImage.filename} (${matchingImage._id})`);

                    await db.collection('courses').updateOne(
                        { _id: course._id },
                        { $set: { thumbnailImageId: matchingImage._id.toString() } }
                    );
                }
            }
        }
    }

    console.log('\n✅ Done!');
    await mongoose.disconnect();
}

fixAllThumbs();
