// Find and fix courses with placeholder thumbnails
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fixPlaceholders() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to Atlas\n');

    const db = mongoose.connection.db;

    // Get all courses
    const courses = await db.collection('courses').find({}).toArray();

    // Get available thumbnail files
    const imageFiles = await db.collection('uploads.files').find({
        $or: [
            { filename: { $regex: /\.jpg$/i } },
            { filename: { $regex: /\.jpeg$/i } },
            { filename: { $regex: /\.png$/i } }
        ]
    }).toArray();

    console.log('📷 Available thumbnails:', imageFiles.length);

    // Default placeholder to use
    const defaultThumb = imageFiles.find(f => f.filename.includes('thumb-'));

    let fixed = 0;

    for (const course of courses) {
        const thumb = typeof course.thumbnail === 'string' ? course.thumbnail : '';

        // Check if thumbnail is a broken placeholder (unsplash URL or similar)
        const isBadThumb = !thumb ||
            thumb.includes('unsplash') ||
            thumb.includes('photo-') ||
            thumb.includes('placeholder') ||
            thumb.includes('via.placeholder');

        if (isBadThumb) {
            console.log(`\n⚠️ ${course.title}`);
            console.log(`   Bad thumbnail: ${thumb?.substring?.(0, 50) || 'none'}...`);

            // Has valid thumbnailImageId?
            if (course.thumbnailImageId) {
                const thumbId = typeof course.thumbnailImageId === 'string'
                    ? course.thumbnailImageId
                    : course.thumbnailImageId.toString();
                console.log(`   ✓ Already has thumbnailImageId: ${thumbId}`);
            } else if (defaultThumb) {
                // Set a default thumbnail
                console.log(`   Setting default thumbnail: ${defaultThumb.filename}`);
                await db.collection('courses').updateOne(
                    { _id: course._id },
                    {
                        $set: {
                            thumbnailImageId: defaultThumb._id.toString()
                        }
                    }
                );
                fixed++;
            }
        }
    }

    console.log(`\n✅ Fixed ${fixed} courses`);
    await mongoose.disconnect();
}

fixPlaceholders();
