/**
 * Re-compress Voss video to GOOD quality (720p CRF 23 — visually near-lossless)
 * With local cache, we don't need aggressive compression — cache handles speed.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
dotenv.config();

ffmpeg.setFfmpegPath(ffmpegStatic);
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function recompressVoss() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const coursesCol = db.collection('courses');
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

    const course = await coursesCol.findOne({ title: { $regex: /voss/i } });
    if (!course) { console.log('Course not found'); await mongoose.disconnect(); return; }

    const videoFileId = course.video?.fileId;
    if (!videoFileId) { console.log('No video fileId'); await mongoose.disconnect(); return; }

    const oid = typeof videoFileId === 'string' ? new mongoose.Types.ObjectId(videoFileId) : videoFileId;
    const fileDoc = await db.collection('uploads.files').findOne({ _id: oid });
    if (fileDoc) console.log('Current size:', (fileDoc.length / 1024 / 1024).toFixed(2), 'MB');

    // Download
    console.log('Downloading from GridFS...');
    const tmpInput = path.join(process.cwd(), 'voss_tmp_input.mp4');
    const tmpOutput = path.join(process.cwd(), 'voss_tmp_output.mp4');

    const ws = fs.createWriteStream(tmpInput);
    const ds = bucket.openDownloadStream(oid);
    await new Promise((resolve, reject) => { ds.pipe(ws); ws.on('finish', resolve); ws.on('error', reject); });
    console.log('Downloaded:', (fs.statSync(tmpInput).size / 1024 / 1024).toFixed(2), 'MB');

    // Compress: 720p, CRF 23 — good quality, reasonable size
    console.log('Compressing to 720p CRF 23 (good quality)...');
    await new Promise((resolve, reject) => {
        ffmpeg(tmpInput)
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioBitrate('128k')
            .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart', '-vf', 'scale=-2:720'])
            .output(tmpOutput)
            .on('progress', p => { if (p.percent) process.stdout.write('\rProgress: ' + p.percent.toFixed(1) + '%'); })
            .on('end', () => { console.log('\nDone'); resolve(); })
            .on('error', reject)
            .run();
    });

    const compressedSize = fs.statSync(tmpOutput).size;
    console.log('Compressed:', (compressedSize / 1024 / 1024).toFixed(2), 'MB');

    // Upload compressed
    console.log('Uploading to GridFS...');
    const compBuf = fs.readFileSync(tmpOutput);
    const uploadStream = bucket.openUploadStream('voss_hq_720p.mp4', {
        contentType: 'video/mp4',
        metadata: { type: 'course_video', quality: '720p_crf23' }
    });
    const readable = Readable.from(compBuf);
    await new Promise((resolve, reject) => {
        uploadStream.on('error', reject);
        uploadStream.on('finish', resolve);
        readable.pipe(uploadStream);
    });
    const newId = uploadStream.id;
    console.log('New fileId:', newId.toString());

    // Update course
    await coursesCol.updateOne({ _id: course._id }, {
        $set: {
            'video.fileId': newId,
            'video.contentType': 'video/mp4',
            'video.size': compressedSize,
            'video.url': `/api/media/${newId}`,
            videoUrl: `/api/media/${newId}`
        }
    });
    console.log('Course updated');

    // Delete old
    try { await bucket.delete(oid); console.log('Old video deleted'); } catch (e) { console.log('Could not delete old:', e.message); }

    // Also delete old cached version from media_cache
    const cacheDir = path.join(process.cwd(), 'media_cache');
    const oldCachePath = path.join(cacheDir, oid.toString());
    try { fs.unlinkSync(oldCachePath); fs.unlinkSync(oldCachePath + '.meta'); console.log('Old cache deleted'); } catch { }

    // Cleanup
    try { fs.unlinkSync(tmpInput); } catch { }
    try { fs.unlinkSync(tmpOutput); } catch { }

    console.log('\nDone! Video recompressed to', (compressedSize / 1024 / 1024).toFixed(2), 'MB (720p CRF 23)');
    console.log('Restart server to triggerr precache of the new video.');
    await mongoose.disconnect();
}

recompressVoss().catch(console.error);
