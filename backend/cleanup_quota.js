import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.js';
import Reel from './src/models/Reel.js';
import Activity from './src/models/Activity.js';
import Notification from './src/models/Notification.js';

dotenv.config();

console.log('Connecting to MongoDB...');
await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected!\n');

// Get database stats
const collections = await mongoose.connection.db.listCollections().toArray();
console.log('Collections:', collections.map(c => c.name).join(', '), '\n');

// Get sizes
let totalSize = 0;
for (const collection of collections) {
  try {
    const stats = await mongoose.connection.db.collection(collection.name).stats();
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const count = stats.count;
    console.log(`${collection.name}: ${sizeMB} MB (${count} documents)`);
    totalSize += stats.size;
  } catch (e) {
    console.log(`${collection.name}: (error getting stats)`);
  }
}
console.log(`\nTotal: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);

// Delete old activities (older than 30 days) - these take up lots of space
console.log('Deleting activities older than 30 days...');
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const activityResult = await Activity.deleteMany({ timestamp: { $lt: thirtyDaysAgo } });
console.log(`Deleted ${activityResult.deletedCount} old activities\n`);

// Delete old notifications - these can accumulate
console.log('Deleting old/expired notifications...');
const notificationResult = await Notification.deleteMany({
  $or: [
    { expiresAt: { $lt: new Date() } },
    { createdAt: { $lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } } // older than 60 days
  ]
});
console.log(`Deleted ${notificationResult.deletedCount} old notifications\n`);

// Delete reels without courses (orphaned)
console.log('Checking for orphaned reels...');
const reelsWithoutCourses = await Reel.find({ courseId: { $exists: false } }).countDocuments();
console.log(`Found ${reelsWithoutCourses} reels without courses\n`);

// Get new sizes
console.log('\nFinal collection sizes:');
let newTotalSize = 0;
for (const collection of collections) {
  try {
    const stats = await mongoose.connection.db.collection(collection.name).stats();
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const count = stats.count;
    console.log(`${collection.name}: ${sizeMB} MB (${count} documents)`);
    newTotalSize += stats.size;
  } catch (e) {
    // ignore
  }
}
console.log(`\nTotal: ${(newTotalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Freed: ${((totalSize - newTotalSize) / 1024 / 1024).toFixed(2)} MB`);

process.exit(0);
