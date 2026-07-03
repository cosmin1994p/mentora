import mongoose from 'mongoose';

async function checkAndFixTags() {
    await mongoose.connect('mongodb://localhost:27017/masterclass');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const courses = await db.collection('courses').find({}).toArray();

    console.log('\n=== CURRENT COURSES ===\n');
    for (const c of courses) {
        console.log(`${c.title}`);
        console.log(`  Category: ${c.category}`);
        console.log(`  Tags: ${c.tags?.join(', ')}`);
        console.log('');
    }

    // Define correct mappings
    const correctData = {
        "Complete Fitness Masterclass": {
            category: "fitness",
            tags: ["fitness", "workout", "health", "strength", "cardio", "exercise"]
        },
        "Yoga for Beginners": {
            category: "wellness",
            tags: ["yoga", "wellness", "relaxation", "flexibility", "mindfulness", "fitness"]
        },
        "High-Intensity Interval Training": {
            category: "fitness",
            tags: ["hiit", "cardio", "fitness", "workout", "health", "exercise", "strength"]
        },
        "Web Development Bootcamp": {
            category: "tech",
            tags: ["programming", "tech", "javascript", "react", "web", "coding"]
        },
        "Digital Marketing Strategy": {
            category: "marketing",
            tags: ["marketing", "digital", "social-media", "business", "advertising", "strategy"]
        },
        "Photography Fundamentals": {
            category: "photography",
            tags: ["photography", "creative", "visual", "art", "camera", "design"]
        },
        "Data Science with Python": {
            category: "tech",
            tags: ["data-science", "python", "programming", "analytics", "machine-learning", "tech"]
        },
        "Healthy Cooking Basics": {
            category: "cooking",
            tags: ["cooking", "culinary", "nutrition", "health", "lifestyle", "food"]
        },
        "Business Leadership": {
            category: "business",
            tags: ["leadership", "management", "business", "career", "professional", "strategy"]
        },
        "Creative Writing Workshop": {
            category: "writing",
            tags: ["writing", "creative", "storytelling", "content", "art", "copywriting"]
        },
        "Music Production Masterclass": {
            category: "music",
            tags: ["music", "audio", "production", "creative", "beats", "DAW"]
        }
    };

    console.log('\n=== UPDATING COURSES ===\n');

    for (const [title, data] of Object.entries(correctData)) {
        const result = await db.collection('courses').updateOne(
            { title },
            { $set: { category: data.category, tags: data.tags } }
        );
        if (result.matchedCount > 0) {
            console.log(`✓ Updated: ${title} -> category: ${data.category}`);
        }
    }

    console.log('\n=== VERIFICATION ===\n');
    const updatedCourses = await db.collection('courses').find({}).toArray();
    for (const c of updatedCourses) {
        console.log(`${c.title}: ${c.category} | ${c.tags?.join(', ')}`);
    }

    await mongoose.disconnect();
    console.log('\nDone!');
}

checkAndFixTags().catch(console.error);
