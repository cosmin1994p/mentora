// Fix thumbnail references - match by filename
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fixThumbnails() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to Atlas\n');

    // Get all files
    const files = await mongoose.connection.db.collection('uploads.files').find({}).toArray();
    console.log(`📁 Found ${files.length} files in GridFS`);

    // Create a map of filename -> _id
    const fileMap = {};
    files.forEach(f => {
        fileMap[f.filename] = f._id;
        // Also map by partial name
        const baseName = f.filename.replace(/\.[^/.]+$/, '').toLowerCase();
        fileMap[baseName] = f._id;
    });

    console.log('Files available:');
    files.forEach(f => console.log(`  - ${f._id}: ${f.filename}`));

    // Get all courses
    const courses = await mongoose.connection.db.collection('courses').find({}).toArray();
    console.log(`\n📚 Checking ${courses.length} courses...\n`);

    let fixed = 0;

    for (const course of courses) {
        // Try to find matching thumbnail by course title
        const titleSlug = course.title.toLowerCase().replace(/[^a-z0-9]/g, '-');

        // Check current thumbnail status
        const currentThumb = course.thumbnailImageId?.toString();
        const thumbExists = currentThumb && files.some(f => f._id.toString() === currentThumb);

        if (!thumbExists) {
            // Try to find a matching file
            let matchedFile = null;

            // Look for thumb-{title}.jpg pattern
            const possibleNames = [
                `thumb-${titleSlug}.jpg`,
                `thumb-${titleSlug}.png`,
                `${titleSlug}.jpg`,
                course.title + '.jpg'
            ];

            for (const name of possibleNames) {
                if (fileMap[name.toLowerCase()]) {
                    matchedFile = files.find(f => f.filename.toLowerCase() === name.toLowerCase());
                    break;
                }
            }

            // Also try partial match
            if (!matchedFile) {
                const simpleTitle = course.title.toLowerCase().split(' ')[0];
                matchedFile = files.find(f => f.filename.toLowerCase().includes(simpleTitle));
            }

            if (matchedFile) {
                console.log(`✓ Fixing: ${course.title}`);
                console.log(`  Found: ${matchedFile.filename} -> ${matchedFile._id}`);

                await mongoose.connection.db.collection('courses').updateOne(
                    { _id: course._id },
                    { $set: { thumbnailImageId: matchedFile._id.toString() } }
                );
                fixed++;
            } else {
                console.log(`⏭ ${course.title} - no matching thumbnail found`);
            }
        } else {
            console.log(`✓ ${course.title} - already has valid thumbnail`);
        }
    }

    console.log(`\n✅ Fixed ${fixed} courses`);

    await mongoose.disconnect();
}

fixThumbnails();
