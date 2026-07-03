/**
 * Simple Seed Script - CommonJS version
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

const CourseSchema = new mongoose.Schema({
    title: String,
    description: String,
    instructor: String,
    duration: Number,
    level: String,
    category: String,
    tags: [String],
    thumbnail: { url: String },
    videoUrl: String,
    rating: Number,
    enrollmentCount: Number,
    isPublished: Boolean
}, { timestamps: true, strict: false });

const Course = mongoose.model('Course', CourseSchema);

const demoCourses = [
    {
        title: 'Leadership Masterclass',
        instructor: 'Sara Johnson',
        thumbnail: { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1080' },
        duration: 204,
        category: 'business',
        description: 'Descoperă secretele liderilor de succes.',
        rating: 4.8,
        enrollmentCount: 12500,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['leadership', 'motivational', 'success', 'inspiring', 'achievement'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'Photography Fundamentals',
        instructor: 'Mark Anderson',
        thumbnail: { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1080' },
        duration: 280,
        category: 'creative',
        description: 'Învață bazele fotografiei și cum să captezi momente unice.',
        rating: 4.9,
        enrollmentCount: 8900,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['photography', 'creative', 'artistic', 'visual', 'practical'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Business Strategy Essentials',
        instructor: 'David Chen',
        thumbnail: { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080' },
        duration: 390,
        category: 'business',
        description: 'Strategii de business pentru antreprenori.',
        rating: 4.7,
        enrollmentCount: 15800,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['business', 'strategy', 'productivity', 'efficiency', 'goals'],
        level: 'Advanced',
        isPublished: true
    },
    {
        title: 'Web Development cu React',
        instructor: 'Alex Martinez',
        thumbnail: { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080' },
        duration: 540,
        category: 'tech',
        description: 'Construiește aplicații web moderne.',
        rating: 4.9,
        enrollmentCount: 23400,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['tech', 'programming', 'innovation', 'challenging', 'advanced'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'UX/UI Design Masterclass',
        instructor: 'Emma Wilson',
        thumbnail: { url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1080' },
        duration: 420,
        category: 'creative',
        description: 'Design interfaces memorabile.',
        rating: 4.8,
        enrollmentCount: 11200,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['design', 'creative', 'art', 'visual', 'practical'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'Mindfulness și Productivitate',
        instructor: 'Lisa Brown',
        thumbnail: { url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1080' },
        duration: 150,
        category: 'wellness',
        description: 'Găsește echilibrul între minte și productivitate.',
        rating: 4.9,
        enrollmentCount: 9800,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['relaxing', 'balanced', 'easy', 'wellness', 'calm'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Data Science și Machine Learning',
        instructor: 'Robert Kim',
        thumbnail: { url: 'https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=1080' },
        duration: 620,
        category: 'tech',
        description: 'Explorează lumea fascinantă a data science.',
        rating: 4.9,
        enrollmentCount: 14320,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['science', 'tech', 'innovation', 'challenging', 'advanced'],
        level: 'Advanced',
        isPublished: true
    },
    {
        title: 'Creative Writing',
        instructor: 'Jennifer Taylor',
        thumbnail: { url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1080' },
        duration: 240,
        category: 'creative',
        description: 'Dezvoltă-ți abilitățile de scriere creativă.',
        rating: 4.7,
        enrollmentCount: 7650,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['writing', 'creative', 'art', 'inspiring', 'moderate'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Entrepreneurship',
        instructor: 'Michael Stevens',
        thumbnail: { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1080' },
        duration: 330,
        category: 'business',
        description: 'Transformă ideile în afaceri de succes.',
        rating: 4.8,
        enrollmentCount: 11900,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['business', 'achievement', 'goals', 'intensive', 'success'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'Music Production',
        instructor: 'Chris Martin',
        thumbnail: { url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1080' },
        duration: 435,
        category: 'creative',
        description: 'Învață producția muzicală de la zero.',
        rating: 4.9,
        enrollmentCount: 13400,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['music', 'creative', 'artistic', 'practical', 'introductory'],
        level: 'Beginner',
        isPublished: true
    }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        console.log('Deleting existing courses...');
        await Course.deleteMany({});

        console.log('Inserting', demoCourses.length, 'courses...');
        const result = await Course.insertMany(demoCourses);
        console.log('Inserted', result.length, 'courses!');

        // Verify
        const count = await Course.countDocuments();
        console.log('Total courses in DB:', count);

        await mongoose.disconnect();
        console.log('Done!');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

seed();
