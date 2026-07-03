import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import Course from './src/models/Course.js';
import Reel from './src/models/Reel.js';
import User from './src/models/User.js';
import { initGridFS, uploadFile } from './src/services/gridfsService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
// Use the new port 8080 for serving files
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// Extended demo courses data
const courseData = [
    {
        title: 'Leadership Masterclass',
        instructor: 'Sara Johnson',
        externalThumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1080',
        duration: 204,
        category: 'business',
        description: 'Descoperă secretele liderilor de succes și cum să îți dezvolți propriul stil de leadership.',
        tags: ['leadership', 'motivational', 'success', 'inspiring', 'achievement'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'Photography Fundamentals',
        instructor: 'Mark Anderson',
        externalThumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1080',
        duration: 280,
        category: 'creative',
        description: 'Învață bazele fotografiei și cum să captezi momente unice.',
        tags: ['photography', 'creative', 'artistic', 'visual', 'practical'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Business Strategy Essentials',
        instructor: 'David Chen',
        externalThumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080',
        duration: 390,
        category: 'business',
        description: 'Strategii de business pentru antreprenori și manageri.',
        tags: ['business', 'strategy', 'productivity', 'efficiency', 'goals'],
        level: 'Advanced',
        isPublished: true
    },
    {
        title: 'Web Development cu React',
        instructor: 'Alex Martinez',
        externalThumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080',
        duration: 540,
        category: 'tech',
        description: 'Construiește aplicații web moderne cu React și TypeScript.',
        tags: ['tech', 'programming', 'innovation', 'challenging', 'advanced'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'Yoga și Wellness',
        instructor: 'Ana Ionescu',
        externalThumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1080',
        duration: 200,
        category: 'wellness',
        description: 'Găsește echilibrul perfect între corp și minte prin yoga.',
        tags: ['yoga', 'wellness', 'health', 'relaxing', 'balanced'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Music Production',
        instructor: 'Chris Martin',
        externalThumbnail: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1080',
        duration: 435,
        category: 'creative',
        description: 'Învață producția muzicală de la zero.',
        tags: ['music', 'creative', 'artistic', 'practical', 'introductory'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Fitness și Nutriție',
        instructor: 'Vlad Mihai',
        externalThumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1080',
        duration: 290,
        category: 'wellness',
        description: 'Transformă-ți corpul cu antrenamente eficiente și nutriție.',
        tags: ['fitness', 'health', 'wellness', 'energizing', 'challenging'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'Digital Marketing',
        instructor: 'Andrei Popa',
        externalThumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080',
        duration: 345,
        category: 'business',
        description: 'Strategii de marketing digital pentru era modernă.',
        tags: ['marketing', 'business', 'digital', 'strategy', 'advanced'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'Creative Writing',
        instructor: 'Jennifer Taylor',
        externalThumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1080',
        duration: 240,
        category: 'creative',
        description: 'Arta de a scrie povești captivante.',
        tags: ['writing', 'creative', 'art', 'inspiring', 'moderate'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Data Science Fundamentals',
        instructor: 'Robert Kim',
        externalThumbnail: 'https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=1080',
        duration: 620,
        category: 'tech',
        description: 'Introducere în știința datelor și analiză.',
        tags: ['science', 'tech', 'innovation', 'challenging', 'advanced'],
        level: 'Advanced',
        isPublished: true
    }
];

// Helper to download and store file
async function downloadAndStore(url, filename, isVideo = false) {
    try {
        console.log(`Downloading ${isVideo ? 'video' : 'image'} ${filename}...`);
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const buffer = Buffer.from(res.data);
        const contentType = res.headers['content-type'] || (isVideo ? 'video/mp4' : 'image/jpeg');

        const fileId = await uploadFile(buffer, filename, contentType);

        console.log(`✓ Stored ${filename} in GridFS (ID: ${fileId})`);
        return {
            fileId,
            url: `${BACKEND_URL}/api/files/${fileId}`
        };
    } catch (error) {
        console.error(`Error storing ${filename} from ${url}:`, error.message);
        // Return original url as fallback
        return { url };
    }
}

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Init GridFS
        initGridFS();

        // Clear data
        console.log('Clearing existing courses and reels...');
        await Course.deleteMany({});
        await Reel.deleteMany({});

        // Drop the unique 'id' index if it still exists (legacy)
        try {
            await mongoose.connection.db.collection('courses').dropIndex('id_1');
            console.log('Dropped legacy id_1 index');
        } catch (e) { /* ignore if not exists */ }

        // Store a shared demo video for all courses to save bandwidth/space
        const demoVideoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
        const sharedVideoInfo = await downloadAndStore(demoVideoUrl, 'demo-course-video.mp4', true);

        const coursesToInsert = [];

        console.log('Processing courses...');
        for (const c of courseData) {
            // 1. Store thumbnail
            const thumbInfo = await downloadAndStore(c.externalThumbnail, `thumb-${c.title.replace(/\s+/g, '-').toLowerCase()}.jpg`, false);

            // 2. Prepare course object
            coursesToInsert.push({
                ...c,
                thumbnail: thumbInfo,
                rating: 4.5 + Math.random() * 0.5,
                enrollmentCount: Math.floor(Math.random() * 10000) + 1000,
                videoUrl: sharedVideoInfo.url, // Use stored video URL
                video: { fileId: sharedVideoInfo.fileId } // Store reference
            });
        }

        // Insert courses
        const insertedCourses = await Course.insertMany(coursesToInsert);
        console.log(`✓ Inserted ${insertedCourses.length} courses`);

        // Create Reels based on these courses
        const reelsToInsert = [];
        for (const course of insertedCourses) {
            reelsToInsert.push({
                title: `${course.title} - Highlight`,
                description: `Short preview of ${course.title}`,
                creator: course.instructor,
                course: course._id,
                courseId: course._id,
                duration: 30,
                videoUrl: course.videoUrl, // Use same stored video for demo
                video: { fileId: sharedVideoInfo.fileId },
                thumbnail: course.thumbnail, // Reuse same thumbnail
                viewCount: Math.floor(Math.random() * 50000),
                likeCount: Math.floor(Math.random() * 2000),
                tags: course.tags.slice(0, 3),
                isPublished: true
            });
        }

        await Reel.insertMany(reelsToInsert);
        console.log(`✓ Inserted ${reelsToInsert.length} reels`);

        // Enroll 'test@test.com' in a few courses to populate "Continue Learning"
        const testUser = await User.findOne({ email: 'test@test.com' });
        if (testUser && insertedCourses.length > 0) {
            // Enroll in first 3 courses
            testUser.enrolledCourses = [insertedCourses[0]._id, insertedCourses[1]._id, insertedCourses[2]._id];
            // Add to interaction history
            testUser.interactionHistory = [
                { courseId: insertedCourses[0]._id, action: 'enroll', timestamp: new Date() },
                { courseId: insertedCourses[1]._id, action: 'enroll', timestamp: new Date() },
                { courseId: insertedCourses[2]._id, action: 'enroll', timestamp: new Date() }
            ];
            testUser.totalWatchTime = 120; // 2 hours
            await testUser.save();
            console.log(`✓ Enrolled test user in 3 courses for "Continue Learning"`);
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seed();
