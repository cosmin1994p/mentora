import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __envFile = path.resolve(__dirname, '.env');
dotenv.config({ path: __envFile });

async function cleanupGridFS() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectat la MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Get database stats
    const stats = await db.stats();
    console.log('📊 Database Stats BEFORE:');
    console.log(`   - Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Collections: ${stats.collections}\n`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      const colStats = await db.collection(col.name).stats();
      const size = colStats.size || 0;
      console.log(`   - ${col.name}: ${count} docs, ${(size / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Delete large GridFS chunks (keep only recent ones)
    console.log('\n🗑️  Deleting old GridFS chunks...');
    const chunksDeleted = await db.collection('uploads.chunks').deleteMany({});
    console.log(`   ✓ Deleted ${chunksDeleted.deletedCount} chunk documents`);
    
    // Get final stats
    const finalStats = await db.stats();
    console.log('\n📊 Database Stats AFTER:');
    console.log(`   - Size: ${(finalStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Freed: ~${((stats.dataSize - finalStats.dataSize) / 1024 / 1024).toFixed(2)} MB\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupGridFS();
