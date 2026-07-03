/**
 * Seed Database with Demo Courses and Reels
 * Run this once to populate MongoDB with initial data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.js';
import Reel from './src/models/Reel.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Demo courses data
const demoCourses = [
    {
        title: 'Leadership Masterclass',
        instructor: 'Sara Johnson',
        thumbnail: { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1080' },
        duration: 204, // 3h 24m in minutes
        lessons: 24,
        category: 'business',
        description: 'Descoperă secretele liderilor de succes și cum să îți dezvolți propriul stil de leadership.',
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
        duration: 280, // 4h 40m
        lessons: 32,
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
        duration: 390, // 6h 30m
        lessons: 40,
        category: 'business',
        description: 'Strategii de business pentru antreprenori și manageri.',
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
        duration: 540, // 9h
        lessons: 56,
        category: 'tech',
        description: 'Construiește aplicații web moderne cu React și TypeScript.',
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
        duration: 420, // 7h
        lessons: 38,
        category: 'creative',
        description: 'Design interfaces memorabile și experiențe utilizator excepționale.',
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
        duration: 150, // 2h 30m
        lessons: 18,
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
        duration: 620, // 10h 20m
        lessons: 48,
        category: 'tech',
        description: 'Explorează lumea fascinantă a data science și AI.',
        rating: 4.9,
        enrollmentCount: 14320,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['science', 'tech', 'innovation', 'challenging', 'advanced'],
        level: 'Advanced',
        isPublished: true
    },
    {
        title: 'Creative Writing: Povestirea Captivantă',
        instructor: 'Jennifer Taylor',
        thumbnail: { url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1080' },
        duration: 240, // 4h
        lessons: 20,
        category: 'creative',
        description: 'Dezvoltă-ți abilitățile de scriere creativă și captivează cititorii.',
        rating: 4.7,
        enrollmentCount: 7650,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['writing', 'creative', 'art', 'inspiring', 'moderate'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Entrepreneurship: De la Idee la Succes',
        instructor: 'Michael Stevens',
        thumbnail: { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1080' },
        duration: 330, // 5h 30m
        lessons: 26,
        category: 'business',
        description: 'Transformă ideile în afaceri de succes cu strategii dovedite.',
        rating: 4.8,
        enrollmentCount: 11900,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['business', 'achievement', 'goals', 'intensive', 'success'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'Music Production: Creează Muzica Ta',
        instructor: 'Chris Martin',
        thumbnail: { url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1080' },
        duration: 435, // 7h 15m
        lessons: 35,
        category: 'creative',
        description: 'Învață producția muzicală de la zero și creează hiturile viitorului.',
        rating: 4.9,
        enrollmentCount: 13400,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['music', 'creative', 'artistic', 'practical', 'introductory'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Fundamente Culinare: Arta Gătitului',
        instructor: 'Chef Maria Popescu',
        thumbnail: { url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1080' },
        duration: 390, // 6h 30m
        lessons: 30,
        category: 'lifestyle',
        description: 'Descoperă secretele gătitului de la bucătari profesioniști.',
        rating: 4.9,
        enrollmentCount: 16200,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['culinary', 'cooking', 'food', 'lifestyle', 'creative'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Yoga și Wellness: Armonie Deplină',
        instructor: 'Ana Ionescu',
        thumbnail: { url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1080' },
        duration: 200, // 3h 20m
        lessons: 20,
        category: 'wellness',
        description: 'Găsește echilibrul perfect între corp și minte prin yoga.',
        rating: 4.8,
        enrollmentCount: 11500,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['yoga', 'wellness', 'health', 'relaxing', 'balanced'],
        level: 'Beginner',
        isPublished: true
    },
    {
        title: 'Digital Marketing: Strategii de Succes',
        instructor: 'Andrei Popa',
        thumbnail: { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080' },
        duration: 345, // 5h 45m
        lessons: 28,
        category: 'business',
        description: 'Învață strategiile de marketing digital care aduc rezultate.',
        rating: 4.7,
        enrollmentCount: 19800,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['marketing', 'business', 'digital', 'strategy', 'advanced'],
        level: 'Intermediate',
        isPublished: true
    },
    {
        title: 'Fitness și Nutriție: Transformare Completă',
        instructor: 'Vlad Mihai',
        thumbnail: { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1080' },
        duration: 290, // 4h 50m
        lessons: 25,
        category: 'wellness',
        description: 'Transformă-ți corpul cu antrenamente eficiente și nutriție.',
        rating: 4.9,
        enrollmentCount: 21300,
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        tags: ['fitness', 'health', 'wellness', 'energizing', 'challenging'],
        level: 'Intermediate',
        isPublished: true
    }
];

// Demo reels will be created after courses
async function seedDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Clear existing courses and reels
        console.log('Clearing existing data...');
        await Course.deleteMany({});
        await Reel.deleteMany({});
        console.log('✓ Cleared existing courses and reels');

        // Insert courses
        console.log('Inserting courses...');
        const insertedCourses = await Course.insertMany(demoCourses);
        console.log(`✓ Inserted ${insertedCourses.length} courses`);

        // Create reels from courses
        console.log('Creating reels...');
        const reelsData = insertedCourses.map((course, index) => ({
            title: `${course.title} - Intro`,
            description: `Snippet din cursul "${course.title}"`,
            creator: course.instructor,
            thumbnail: { url: course.thumbnail.url.replace('w=1080', 'w=600') },
            video: { url: course.videoUrl },
            videoUrl: course.videoUrl,
            courseId: course._id,
            tags: course.tags.slice(0, 4),
            duration: 30 + (index % 5) * 15, // 30-90 seconds
            viewCount: Math.floor(Math.random() * 3000000) + 500000,
            likeCount: Math.floor(Math.random() * 150000) + 20000,
            isPublished: true
        }));

        const insertedReels = await Reel.insertMany(reelsData);
        console.log(`✓ Inserted ${insertedReels.length} reels`);

        // Update courses with reel references
        for (let i = 0; i < insertedCourses.length; i++) {
            await Course.findByIdAndUpdate(insertedCourses[i]._id, {
                $push: { reels: insertedReels[i]._id }
            });
        }
        console.log('✓ Updated courses with reel references');

        console.log('\n========================================');
        console.log('✓ Database seeded successfully!');
        console.log(`  Courses: ${insertedCourses.length}`);
        console.log(`  Reels: ${insertedReels.length}`);
        console.log('========================================\n');

        // Print sample IDs for testing
        console.log('Sample Course IDs:');
        insertedCourses.slice(0, 3).forEach(c => {
            console.log(`  ${c.title}: ${c._id}`);
        });

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

seedDatabase();
