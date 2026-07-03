// Check and fix thumbnail references in courses
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkThumbnails() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB Atlas\n');

        // Get all courses
        const courses = await mongoose.connection.db.collection('courses').find({}).toArray();
        console.log(`📚 Checking ${courses.length} courses...\n`);

        // Get all GridFS files
        const files = await mongoose.connection.db.collection('uploads.files').find({}).toArray();
        const fileIds = new Set(files.map(f => f._id.toString()));

        console.log(`📁 Found ${files.length} files in GridFS`);
        console.log('   Sample files:');
        files.slice(0, 5).forEach(f => console.log(`     - ${f._id}: ${f.filename}`));
        console.log('');

        let problematicCourses = [];

        for (const course of courses) {
            const thumbId = course.thumbnailImageId?.toString() || (typeof course.thumbnail === 'string' ? course.thumbnail : null);
            const videoId = course.videoFileId?.toString() || (typeof course.videoUrl === 'string' ? course.videoUrl : null);

            // Check if thumbnail ID exists
            let thumbExists = true;
            let videoExists = true;

            // Only check if it's a MongoDB ObjectId (24 hex chars, no slashes)
            if (thumbId && thumbId.length === 24 && /^[a-f0-9]+$/i.test(thumbId)) {
                thumbExists = fileIds.has(thumbId);
            }

            if (videoId && videoId.length === 24 && /^[a-f0-9]+$/i.test(videoId)) {
                videoExists = fileIds.has(videoId);
            }

            const status = (thumbExists && videoExists) ? '✓' : '❌';
            const thumbDisplay = thumbId ? (thumbId.length > 40 ? thumbId.substring(0, 40) + '...' : thumbId) : 'none';
            const videoDisplay = videoId ? (videoId.length > 40 ? videoId.substring(0, 40) + '...' : videoId) : 'none';

            console.log(`${status} ${course.title}`);
            console.log(`   Thumb: ${thumbDisplay} ${thumbExists ? '✓' : '❌ MISSING'}`);

            if (!thumbExists || !videoExists) {
                problematicCourses.push({
                    id: course._id,
                    title: course.title,
                    thumbId,
                    videoId,
                    thumbMissing: !thumbExists,
                    videoMissing: !videoExists
                });
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Total courses: ${courses.length}`);
        console.log(`   With missing files: ${problematicCourses.length}`);

        if (problematicCourses.length > 0) {
            console.log('\n❌ Courses with missing GridFS files:');
            for (const c of problematicCourses) {
                console.log(`   - ${c.title}`);
                if (c.thumbMissing) console.log(`     Missing thumbnail: ${c.thumbId}`);
                if (c.videoMissing) console.log(`     Missing video: ${c.videoId}`);
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkThumbnails();
