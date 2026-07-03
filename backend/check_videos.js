import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function checkCurrentVoss() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const course = await db.collection('courses').findOne({ title: { $regex: /voss/i } });

    if (!course) { console.log('NOT FOUND'); await mongoose.disconnect(); return; }

    const lines = [];
    lines.push('Title: ' + course.title);
    lines.push('Video fileId: ' + (course.video?.fileId || 'NONE'));
    lines.push('Video size: ' + (course.video?.size || 'NONE'));

    if (course.video?.fileId) {
        const fid = typeof course.video.fileId === 'string'
            ? new mongoose.Types.ObjectId(course.video.fileId)
            : course.video.fileId;
        const file = await db.collection('uploads.files').findOne({ _id: fid });
        if (file) {
            lines.push('GridFS size: ' + (file.length / 1024 / 1024).toFixed(2) + ' MB');
            lines.push('GridFS contentType: ' + file.contentType);
            lines.push('GridFS filename: ' + file.filename);
            lines.push('GridFS metadata: ' + JSON.stringify(file.metadata));
        } else {
            lines.push('GridFS file NOT FOUND');
        }
    }

    fs.writeFileSync('voss_status.txt', lines.join('\n'), 'utf8');
    console.log('Done');
    await mongoose.disconnect();
}

checkCurrentVoss().catch(console.error);
