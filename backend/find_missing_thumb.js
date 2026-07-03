// Find course with specific thumbnail ID
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const searchId = '6967d6c5effbbca265ce425b';

async function findCourse() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to Atlas\n');

    const courses = await mongoose.connection.db.collection('courses').find({}).toArray();

    console.log('Searching for thumbnail ID:', searchId);

    for (const c of courses) {
        const thumbId = c.thumbnailImageId?.toString() || '';
        const thumb = typeof c.thumbnail === 'string' ? c.thumbnail : '';

        if (thumbId === searchId || thumb.includes(searchId)) {
            console.log('\n✓ FOUND IN COURSE:', c.title);
            console.log('  thumbnailImageId:', c.thumbnailImageId);
            console.log('  thumbnail:', c.thumbnail);
        }
    }

    // Also check local MongoDB
    const localConn = await mongoose.createConnection('mongodb://localhost:27017/masterclass').asPromise();
    console.log('\n✓ Connected to Local\n');

    // Check if file exists locally
    const localFile = await localConn.db.collection('uploads.files').findOne({
        _id: new mongoose.Types.ObjectId(searchId)
    });

    if (localFile) {
        console.log('✓ File EXISTS in local MongoDB:', localFile.filename);

        // Get chunks
        const chunks = await localConn.db.collection('uploads.chunks').find({
            files_id: localFile._id
        }).toArray();

        console.log('  Chunks:', chunks.length);

        // Migrate this specific file
        const atlasConn = mongoose.connection;

        // Check if already in Atlas
        const atlasFile = await atlasConn.db.collection('uploads.files').findOne({
            _id: localFile._id
        });

        if (!atlasFile) {
            console.log('\n📦 Migrating file to Atlas...');
            await atlasConn.db.collection('uploads.files').insertOne(localFile);
            if (chunks.length > 0) {
                await atlasConn.db.collection('uploads.chunks').insertMany(chunks);
            }
            console.log('✅ File migrated successfully!');
        } else {
            console.log('\n⚠️ File already exists in Atlas');
        }
    } else {
        console.log('❌ File NOT found in local MongoDB either');
    }

    await localConn.close();
    await mongoose.disconnect();
}

findCourse();
