import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __envFile = path.resolve(__dirname, '.env');
dotenv.config({ path: __envFile });

async function aggressiveCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectat la MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Get BEFORE stats
    const statsBefore = await db.stats();
    console.log('📊 Inainte:');
    console.log(`   Size: ${(statsBefore.dataSize / 1024 / 1024).toFixed(2)} MB\n`);
    
    // DROP GridFS collections entirely (this will free massive space)
    console.log('🗑️  Deleting GridFS collections...');
    
    const collectionsToDelete = ['uploads.files', 'uploads.chunks'];
    for (const colName of collectionsToDelete) {
      try {
        await db.collection(colName).drop();
        console.log(`   ✓ Dropped: ${colName}`);
      } catch (e) {
        if (e.message.includes('ns not found')) {
          console.log(`   ✓ ${colName} - nu exista`);
        } else {
          console.error(`   ✗ Error dropping ${colName}:`, e.message);
        }
      }
    }
    
    console.log('\n✅ GridFS cleared!\n');
    
    // Get AFTER stats (may show similar size due to MongoDB allocation)
    const statsAfter = await db.stats();
    console.log('📊 Dupa:');
    console.log(`   Size: ${(statsAfter.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Freed: ~${((statsBefore.dataSize - statsAfter.dataSize) / 1024 / 1024).toFixed(2)} MB`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

aggressiveCleanup();
