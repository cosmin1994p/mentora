/**
 * Migration Script: Publish All Reels
 * Run this script to set isPublished=true for all existing reels
 * 
 * Usage: node backend/scripts/publishAllReels.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/streamclass';

async function publishAllReels() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Get the Reel collection directly
        const db = mongoose.connection.db;
        const reelsCollection = db.collection('reels');

        // Count total reels
        const totalReels = await reelsCollection.countDocuments();
        console.log(`Found ${totalReels} reels in database`);

        // Count unpublished reels
        const unpublishedCount = await reelsCollection.countDocuments({ isPublished: { $ne: true } });
        console.log(`Found ${unpublishedCount} unpublished reels`);

        if (unpublishedCount === 0) {
            console.log('✓ All reels are already published!');
        } else {
            // Update all reels to be published
            const result = await reelsCollection.updateMany(
                { isPublished: { $ne: true } },
                { $set: { isPublished: true } }
            );
            console.log(`✓ Updated ${result.modifiedCount} reels to isPublished=true`);
        }

        // Show summary
        const publishedCount = await reelsCollection.countDocuments({ isPublished: true });
        console.log(`\nSummary: ${publishedCount}/${totalReels} reels are now published`);

        await mongoose.disconnect();
        console.log('✓ Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

publishAllReels();
