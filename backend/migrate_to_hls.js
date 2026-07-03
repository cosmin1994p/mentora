/**
 * Migrate existing course videos to HLS format
 * Downloads each course video from GridFS and transcodes to HLS (480p/720p/1080p)
 * Usage: node migrate_to_hls.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

// Dynamic import to ensure env is loaded first
const main = async () => {
    const { default: hlsService } = await import('./src/services/hlsService.js');
    const { default: gridFSService } = await import('./src/services/gridfsService.js');

    const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!MONGO_URI) { console.error('No MONGODB_URI set'); process.exit(1); }

    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Initialize GridFS
    gridFSService.initialize();

    const db = mongoose.connection.db;
    const coursesCol = db.collection('courses');
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

    // Find all courses with videos
    const courses = await coursesCol.find({ 'video.fileId': { $exists: true } }).toArray();
    console.log(`\nFound ${courses.length} courses with videos\n`);

    for (const course of courses) {
        const courseId = course._id.toString();
        const videoFileId = course.video?.fileId;

        if (!videoFileId) {
            console.log(`⏭ Skipping ${course.title} — no video fileId`);
            continue;
        }

        // Check if HLS already exists
        if (hlsService.isHLSReady(courseId)) {
            console.log(`⏭ Skipping ${course.title} — HLS already ready`);
            continue;
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Processing: ${course.title} (${courseId})`);

        const oid = typeof videoFileId === 'string'
            ? new mongoose.Types.ObjectId(videoFileId)
            : videoFileId;

        // Download from GridFS
        const tmpInput = path.join(__dirname, `_tmp_hls_${courseId}.mp4`);
        try {
            console.log(`  Downloading from GridFS...`);
            const downloadStream = bucket.openDownloadStream(oid);
            const writeStream = fs.createWriteStream(tmpInput);
            await new Promise((resolve, reject) => {
                downloadStream.pipe(writeStream);
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                downloadStream.on('error', reject);
            });

            const size = fs.statSync(tmpInput).size;
            console.log(`  Downloaded: ${(size / 1024 / 1024).toFixed(2)} MB`);

            // Transcode to HLS
            const { hlsUrl } = await hlsService.transcodeToHLS(tmpInput, courseId);

            // Update course in DB
            await coursesCol.updateOne(
                { _id: course._id },
                { $set: { hlsUrl, hlsReady: true } }
            );

            console.log(`  ✓ ${course.title} — HLS ready at ${hlsUrl}`);
        } catch (err) {
            console.error(`  ✗ Failed for ${course.title}:`, err.message);
        } finally {
            try { fs.unlinkSync(tmpInput); } catch { }
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Migration complete!\n`);
    await mongoose.disconnect();
};

main().catch(console.error);
