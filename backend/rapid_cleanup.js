import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('Connecting to MongoDB...');
await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected!\n');

const db = mongoose.connection.db;

console.log('Deleting all GridFS chunks to free space...');
try {
  const result = await db.collection('uploads.chunks').deleteMany({});
  console.log(`✓ Deleted ${result.deletedCount} chunk documents\n`);
  console.log('⚠️  This will orphan files until garbage collection');
} catch (e) {
  console.log(`Error: ${e.message}`);
}

// Also delete old GridFS files
console.log('\nDeleting old uploaded files...');
try {
  // Keep only files from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const result = await db.collection('uploads.files').deleteMany({
    uploadDate: { $lt: sevenDaysAgo }
  });
  console.log(`✓ Deleted ${result.deletedCount} old file entries\n`);
} catch (e) {
  console.log(`Error: ${e.message}`);
}

console.log('Cleanup complete - try API calls again');
process.exit(0);
