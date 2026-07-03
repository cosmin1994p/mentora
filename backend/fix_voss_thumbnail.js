/**
 * One-time migration: compress the VossBoss 1.3MB PNG thumbnail to ~80KB JPEG
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sharp from 'sharp';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function fixVossThumbnail() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const coursesCollection = db.collection('courses');
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

    // Find VossBoss course
    const course = await coursesCollection.findOne({ title: { $regex: /voss/i } });
    if (!course) {
        console.log('VossBoss course not found');
        await mongoose.disconnect();
        return;
    }

    console.log('Found:', course.title);
    const thumbFileId = course.thumbnail?.fileId;
    if (!thumbFileId) {
        console.log('No thumbnail fileId found');
        await mongoose.disconnect();
        return;
    }

    // Download current thumbnail from GridFS
    const objectId = typeof thumbFileId === 'string' ? new mongoose.Types.ObjectId(thumbFileId) : thumbFileId;
    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files.length) {
        console.log('Thumbnail file not found in GridFS');
        await mongoose.disconnect();
        return;
    }
    console.log('Current thumbnail:', (files[0].length / 1024).toFixed(1), 'KB', files[0].contentType);

    // Download to buffer
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(objectId);
    for await (const chunk of downloadStream) {
        chunks.push(chunk);
    }
    const originalBuffer = Buffer.concat(chunks);
    console.log('Downloaded:', (originalBuffer.length / 1024).toFixed(1), 'KB');

    // Compress with sharp
    const compressed = await sharp(originalBuffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
    console.log('Compressed:', (compressed.length / 1024).toFixed(1), 'KB');

    // Upload new compressed thumbnail
    const { Readable } = await import('stream');
    const uploadStream = bucket.openUploadStream('voss_thumbnail_compressed.jpg', {
        contentType: 'image/jpeg',
        metadata: { type: 'course_thumbnail', compressed: true }
    });

    const readable = Readable.from(compressed);
    await new Promise((resolve, reject) => {
        uploadStream.on('error', reject);
        uploadStream.on('finish', resolve);
        readable.pipe(uploadStream);
    });

    const newFileId = uploadStream.id;
    console.log('Uploaded new thumbnail:', newFileId.toString());

    // Update course document
    await coursesCollection.updateOne(
        { _id: course._id },
        {
            $set: {
                'thumbnail.fileId': newFileId,
                'thumbnail.contentType': 'image/jpeg',
                'thumbnail.url': `/api/media/${newFileId}`
            }
        }
    );
    console.log('Updated course document');

    // Delete old thumbnail
    try {
        await bucket.delete(objectId);
        console.log('Deleted old thumbnail');
    } catch (e) {
        console.log('Could not delete old thumbnail:', e.message);
    }

    console.log('Done! VossBoss thumbnail compressed from', (originalBuffer.length / 1024).toFixed(1), 'KB to', (compressed.length / 1024).toFixed(1), 'KB');
    await mongoose.disconnect();
}

fixVossThumbnail().catch(console.error);
