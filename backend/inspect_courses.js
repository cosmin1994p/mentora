import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function inspectCourses() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const coursesCollection = db.collection('courses');
    const filesCollection = db.collection('uploads.files');

    const allCourses = await coursesCollection.find({}).toArray();
    const results = [];

    for (const course of allCourses) {
        const entry = {
            id: course._id.toString(),
            title: course.title,
            thumbType: typeof course.thumbnail,
            thumbIsString: typeof course.thumbnail === 'string',
            thumbStr: typeof course.thumbnail === 'string' ? course.thumbnail.substring(0, 80) : null,
            thumbFileId: course.thumbnail?.fileId ? course.thumbnail.fileId.toString() : null,
            thumbUrl: course.thumbnail?.url || null,
            thumbContentType: course.thumbnail?.contentType || null,
            videoFileId: course.video?.fileId ? course.video.fileId.toString() : null,
            videoContentType: course.video?.contentType || null,
            videoSize: course.video?.size || null,
            videoUrl: course.videoUrl || null,
            thumbGridFSSize: null,
            videoGridFSSize: null,
        };

        if (course.thumbnail?.fileId) {
            try {
                const fid = typeof course.thumbnail.fileId === 'string'
                    ? new mongoose.Types.ObjectId(course.thumbnail.fileId)
                    : course.thumbnail.fileId;
                const f = await filesCollection.findOne({ _id: fid });
                entry.thumbGridFSSize = f ? (f.length / 1024).toFixed(1) + ' KB' : 'NOT FOUND';
            } catch (e) { entry.thumbGridFSSize = 'ERR: ' + e.message; }
        }

        if (course.video?.fileId) {
            try {
                const fid = typeof course.video.fileId === 'string'
                    ? new mongoose.Types.ObjectId(course.video.fileId)
                    : course.video.fileId;
                const f = await filesCollection.findOne({ _id: fid });
                entry.videoGridFSSize = f ? (f.length / 1024 / 1024).toFixed(2) + ' MB' : 'NOT FOUND';
            } catch (e) { entry.videoGridFSSize = 'ERR: ' + e.message; }
        }

        results.push(entry);
    }

    fs.writeFileSync('inspect_result.json', JSON.stringify(results, null, 2), 'utf8');
    console.log('Done: ' + results.length + ' courses');
    await mongoose.disconnect();
}

inspectCourses().catch(console.error);
