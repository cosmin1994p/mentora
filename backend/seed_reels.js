import mongoose from 'mongoose';

async function seedReels() {
    await mongoose.connect('mongodb://localhost:27017/masterclass');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get course IDs
    const courses = await db.collection('courses').find({}).toArray();
    console.log(`Found ${courses.length} courses`);

    // Drop existing reels
    try {
        await db.collection('reels').drop();
        console.log('Dropped reels collection');
    } catch (e) {
        console.log('Reels collection might not exist');
    }

    const sampleReels = [
        {
            title: "5-Minute Morning Stretch",
            description: "Quick stretching routine to start your day",
            creator: "Sarah Johnson",
            thumbnail: { url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b" },
            tags: ["fitness", "stretching", "morning", "quick"],
            views: 45200,
            likes: 3200,
            courseId: courses[0]?._id,
            duration: 15,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Yoga Flow for Relaxation",
            description: "Calm your mind with this gentle yoga sequence",
            creator: "Maya Patel",
            thumbnail: { url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773" },
            tags: ["yoga", "relaxation", "wellness", "mindfulness"],
            views: 38700,
            likes: 2800,
            courseId: courses[1]?._id,
            duration: 30,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "HIIT Cardio Blast",
            description: "Intense 15-minute cardio workout",
            creator: "Mike Torres",
            thumbnail: { url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd" },
            tags: ["hiit", "cardio", "fitness", "workout"],
            views: 52100,
            likes: 4100,
            courseId: courses[2]?._id,
            duration: 15,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "JavaScript Tips & Tricks",
            description: "Quick coding tips for JavaScript developers",
            creator: "Alex Chen",
            thumbnail: { url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c" },
            tags: ["programming", "javascript", "tech", "tips"],
            views: 28400,
            likes: 1900,
            courseId: courses[3]?._id,
            duration: 60,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Marketing Hack of the Day",
            description: "Quick marketing strategy you can use now",
            creator: "Emma Williams",
            thumbnail: { url: "https://images.unsplash.com/photo-1533750349088-cd871a92f312" },
            tags: ["marketing", "business", "strategy", "tips"],
            views: 19800,
            likes: 1500,
            courseId: courses[4]?._id,
            duration: 30,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Photo Composition Tips",
            description: "Improve your photography with these composition techniques",
            creator: "David Kim",
            thumbnail: { url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e" },
            tags: ["photography", "creative", "tips", "art"],
            views: 22100,
            likes: 1700,
            courseId: courses[5]?._id,
            duration: 45,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Python One-Liners",
            description: "Powerful Python code in a single line",
            creator: "Dr. Lisa Wang",
            thumbnail: { url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5" },
            tags: ["python", "programming", "tech", "tips"],
            views: 31500,
            likes: 2300,
            courseId: courses[6]?._id,
            duration: 30,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Healthy Snack Ideas",
            description: "Quick and nutritious snacks you can make in 5 minutes",
            creator: "Chef Marco Rossi",
            thumbnail: { url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061" },
            tags: ["cooking", "health", "nutrition", "quick"],
            views: 25800,
            likes: 2100,
            courseId: courses[7]?._id,
            duration: 15,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Leadership Quick Tips",
            description: "Become a better leader with these strategies",
            creator: "James Anderson",
            thumbnail: { url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c" },
            tags: ["leadership", "business", "management", "tips"],
            views: 18200,
            likes: 1400,
            courseId: courses[8]?._id,
            duration: 30,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: "Writing Inspiration",
            description: "Get inspired to write with these creative prompts",
            creator: "Emily Brooks",
            thumbnail: { url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" },
            tags: ["writing", "creative", "inspiration", "art"],
            views: 15400,
            likes: 1200,
            courseId: courses[9]?._id,
            duration: 30,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    const result = await db.collection('reels').insertMany(sampleReels);
    console.log(`Inserted ${result.insertedCount} reels`);

    await mongoose.disconnect();
    console.log('Done!');
}

seedReels().catch(console.error);
