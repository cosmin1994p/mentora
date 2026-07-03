import mongoose from 'mongoose';

async function fixAndSeed() {
    await mongoose.connect('mongodb://localhost:27017/masterclass');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop the courses collection entirely
    try {
        await db.collection('courses').drop();
        console.log('Dropped courses collection');
    } catch (e) {
        console.log('Collection might not exist');
    }

    // Create courses without schema
    const sampleCourses = [
        {
            title: "Complete Fitness Masterclass",
            description: "Transform your body with this comprehensive fitness program covering strength, cardio, and flexibility.",
            instructor: "Sarah Johnson",
            duration: 180,
            category: "fitness",
            tags: ["fitness", "health", "workout", "strength", "cardio"],
            thumbnail: { url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438" },
            rating: 4.8,
            enrollmentCount: 15420,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Yoga for Beginners",
            description: "Start your yoga journey with gentle poses and breathing techniques for mind-body wellness.",
            instructor: "Maya Patel",
            duration: 120,
            category: "wellness",
            tags: ["yoga", "wellness", "relaxation", "flexibility", "mindfulness"],
            thumbnail: { url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b" },
            rating: 4.9,
            enrollmentCount: 23100,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "High-Intensity Interval Training",
            description: "Burn calories and build endurance with these intense, time-efficient HIIT workouts.",
            instructor: "Mike Torres",
            duration: 90,
            category: "fitness",
            tags: ["hiit", "cardio", "fitness", "weight-loss", "intensive"],
            thumbnail: { url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48" },
            rating: 4.7,
            enrollmentCount: 18750,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Web Development Bootcamp",
            description: "Learn modern web development with HTML, CSS, JavaScript, React and Node.js.",
            instructor: "Alex Chen",
            duration: 480,
            category: "tech",
            tags: ["programming", "web", "javascript", "react", "tech"],
            thumbnail: { url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6" },
            rating: 4.8,
            enrollmentCount: 45200,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Digital Marketing Strategy",
            description: "Master SEO, social media marketing, content strategy and paid advertising.",
            instructor: "Emma Williams",
            duration: 240,
            category: "business",
            tags: ["marketing", "digital", "social-media", "business", "strategy"],
            thumbnail: { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f" },
            rating: 4.6,
            enrollmentCount: 12800,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Photography Fundamentals",
            description: "Learn composition, lighting, and post-processing to capture stunning photos.",
            instructor: "David Kim",
            duration: 150,
            category: "creative",
            tags: ["photography", "art", "creative", "visual", "design"],
            thumbnail: { url: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd" },
            rating: 4.7,
            enrollmentCount: 9500,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Data Science with Python",
            description: "Master data analysis, machine learning, and visualization with Python.",
            instructor: "Dr. Lisa Wang",
            duration: 360,
            category: "tech",
            tags: ["data-science", "python", "machine-learning", "analytics", "tech"],
            thumbnail: { url: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0" },
            rating: 4.9,
            enrollmentCount: 32400,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Healthy Cooking Basics",
            description: "Learn to prepare nutritious, delicious meals with simple ingredients.",
            instructor: "Chef Marco Rossi",
            duration: 120,
            category: "lifestyle",
            tags: ["cooking", "health", "nutrition", "lifestyle", "wellness"],
            thumbnail: { url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136" },
            rating: 4.5,
            enrollmentCount: 7800,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Business Leadership",
            description: "Develop essential leadership skills for managing teams and driving success.",
            instructor: "James Anderson",
            duration: 200,
            category: "business",
            tags: ["leadership", "management", "business", "career", "professional"],
            thumbnail: { url: "https://images.unsplash.com/photo-1552664730-d307ca884978" },
            rating: 4.6,
            enrollmentCount: 11200,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Creative Writing Workshop",
            description: "Develop your storytelling skills for fiction, non-fiction, and content creation.",
            instructor: "Emily Brooks",
            duration: 180,
            category: "creative",
            tags: ["writing", "creative", "storytelling", "content", "art"],
            thumbnail: { url: "https://images.unsplash.com/photo-1455390582262-044cdead277a" },
            rating: 4.7,
            enrollmentCount: 8900,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    // Insert directly
    const result = await db.collection('courses').insertMany(sampleCourses);
    console.log(`Inserted ${result.insertedCount} courses`);

    // Verify
    const count = await db.collection('courses').countDocuments();
    console.log(`Total courses now: ${count}`);

    await mongoose.disconnect();
    console.log('Done!');
}

fixAndSeed().catch(console.error);
