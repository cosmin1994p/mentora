// Delete orphaned reels (MaceWindu and malalafin)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function deleteOrphanedReels() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to Atlas\n');

    const db = mongoose.connection.db;

    // Delete reels with specific titles
    const result = await db.collection('reels').deleteMany({
        title: { $in: ['MaceWindu', 'malalafin'] }
    });

    console.log('Deleted:', result.deletedCount, 'orphaned reels');

    await mongoose.disconnect();
}

deleteOrphanedReels();
