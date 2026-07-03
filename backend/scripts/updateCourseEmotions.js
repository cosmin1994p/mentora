// Script to update emotionAffinity for existing courses based on their category/tags
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const CourseSchema = new mongoose.Schema({
    title: String,
    category: String,
    tags: [String],
    emotionAffinity: {
        FERICIT: Number,
        MOTIVAT: Number,
        RELAXAT: Number,
        CURIOS: Number,
        PRODUCTIV: Number,
        CREATIV: Number
    }
}, { strict: false });

const Course = mongoose.model('Course', CourseSchema);

// Define emotion profiles based on category/tags
const categoryEmotionProfiles = {
    'Business': { FERICIT: 0.4, MOTIVAT: 0.9, RELAXAT: 0.2, CURIOS: 0.6, PRODUCTIV: 0.95, CREATIV: 0.3 },
    'Technology': { FERICIT: 0.5, MOTIVAT: 0.7, RELAXAT: 0.3, CURIOS: 0.95, PRODUCTIV: 0.8, CREATIV: 0.5 },
    'Creative': { FERICIT: 0.8, MOTIVAT: 0.5, RELAXAT: 0.7, CURIOS: 0.6, PRODUCTIV: 0.3, CREATIV: 0.95 },
    'Wellness': { FERICIT: 0.9, MOTIVAT: 0.6, RELAXAT: 0.95, CURIOS: 0.5, PRODUCTIV: 0.4, CREATIV: 0.4 },
    'Photography': { FERICIT: 0.7, MOTIVAT: 0.4, RELAXAT: 0.8, CURIOS: 0.7, PRODUCTIV: 0.3, CREATIV: 0.9 },
    'Music': { FERICIT: 0.85, MOTIVAT: 0.5, RELAXAT: 0.9, CURIOS: 0.6, PRODUCTIV: 0.2, CREATIV: 0.95 },
    'Art': { FERICIT: 0.8, MOTIVAT: 0.4, RELAXAT: 0.7, CURIOS: 0.65, PRODUCTIV: 0.3, CREATIV: 0.98 },
    'Fitness': { FERICIT: 0.7, MOTIVAT: 0.95, RELAXAT: 0.4, CURIOS: 0.4, PRODUCTIV: 0.8, CREATIV: 0.2 },
    'Marketing': { FERICIT: 0.5, MOTIVAT: 0.85, RELAXAT: 0.3, CURIOS: 0.7, PRODUCTIV: 0.9, CREATIV: 0.6 },
    'Personal Development': { FERICIT: 0.8, MOTIVAT: 0.9, RELAXAT: 0.5, CURIOS: 0.8, PRODUCTIV: 0.85, CREATIV: 0.4 },
    'Leadership': { FERICIT: 0.6, MOTIVAT: 0.95, RELAXAT: 0.3, CURIOS: 0.7, PRODUCTIV: 0.9, CREATIV: 0.4 },
    'default': { FERICIT: 0.5, MOTIVAT: 0.5, RELAXAT: 0.5, CURIOS: 0.5, PRODUCTIV: 0.5, CREATIV: 0.5 }
};

async function updateCourseEmotions() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/masterclass';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const courses = await Course.find({});
        console.log(`Found ${courses.length} courses to update`);

        for (const course of courses) {
            // Get emotion profile based on category
            let profile = categoryEmotionProfiles[course.category] || categoryEmotionProfiles['default'];

            // Add some randomness (+/- 0.1) to make each course unique
            const emotionAffinity = {
                FERICIT: Math.min(1, Math.max(0, profile.FERICIT + (Math.random() - 0.5) * 0.2)),
                MOTIVAT: Math.min(1, Math.max(0, profile.MOTIVAT + (Math.random() - 0.5) * 0.2)),
                RELAXAT: Math.min(1, Math.max(0, profile.RELAXAT + (Math.random() - 0.5) * 0.2)),
                CURIOS: Math.min(1, Math.max(0, profile.CURIOS + (Math.random() - 0.5) * 0.2)),
                PRODUCTIV: Math.min(1, Math.max(0, profile.PRODUCTIV + (Math.random() - 0.5) * 0.2)),
                CREATIV: Math.min(1, Math.max(0, profile.CREATIV + (Math.random() - 0.5) * 0.2))
            };

            await Course.updateOne(
                { _id: course._id },
                { $set: { emotionAffinity } }
            );

            console.log(`Updated: ${course.title} (${course.category}) -> FERICIT: ${emotionAffinity.FERICIT.toFixed(2)}, MOTIVAT: ${emotionAffinity.MOTIVAT.toFixed(2)}`);
        }

        console.log('\n✅ All courses updated with emotion affinity scores!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateCourseEmotions();
