import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('Connecting to MongoDB...');
await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected!\n');

const db = mongoose.connection.db;

console.log('🧹 AGGRESSIVE CLEANUP - Deleting all GridFS...');

try {
  // Delete ALL GridFS chunks
  const chunks = await db.collection('uploads.chunks').deleteMany({});
  console.log(`✓ Deleted ${chunks.deletedCount} GridFS chunks`);
  
  // Delete ALL GridFS files
  const files = await db.collection('uploads.files').deleteMany({});
  console.log(`✓ Deleted ${files.deletedCount} GridFS files`);
  
  // Delete old activity logs
  const activities = await db.collection('activities').deleteMany({});
  console.log(`✓ Deleted ${activities.deletedCount} activity records`);
  
  // Clear recommendations cache
  const recommendations = await db.collection('recommendations_cache').deleteMany({});
  console.log(`✓ Deleted ${recommendations.deletedCount} recommendation records\n`);
  
  console.log('✅ Cleanup complete - database should be under quota now');
} catch (e) {
  console.log(`Error: ${e.message}`);
}

process.exit(0);
