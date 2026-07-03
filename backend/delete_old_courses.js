import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __envFile = path.resolve(__dirname, '.env');
dotenv.config({ path: __envFile });

async function deleteOldCourses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectat la MongoDB\n');
    
    // Import models
    const Course = (await import('./src/models/Course.js')).default;
    const db = mongoose.connection.db;
    
    // Get BEFORE stats
    const statsBefore = await db.stats();
    console.log('📊 INAINTE:');
    console.log(`   Database size: ${(statsBefore.dataSize / 1024 / 1024).toFixed(2)} MB\n`);
    
    // Find courses created in March 2026 (01-31 martie)
    const startDate = new Date('2026-03-01');
    const endDate = new Date('2026-04-01');
    console.log(`🔍 Cauta cursuri create in MARTIE 2026 (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})\n`);
    
    const oldCourses = await Course.find({ 
      createdAt: { 
        $gte: startDate,
        $lt: endDate 
      } 
    });
    console.log(`📋 Gasit ${oldCourses.length} cursuri de sters\n`);
    
    if (oldCourses.length === 0) {
      console.log('✓ Niciun curs de sters');
      process.exit(0);
    }
    
    // List courses to delete
    console.log('Cursuri de sters:');
    for (const course of oldCourses) {
      console.log(`   - ${course.title} (${new Date(course.createdAt).toLocaleDateString()})`);
      console.log(`     Thumbnail: ${course.thumbnail || 'N/A'}`);
    }
    
    console.log(`\n🗑️  Sterg ${oldCourses.length} cursuri din martie...\n`);
    
    // Delete courses from March
    const result = await Course.deleteMany({ 
      createdAt: { 
        $gte: startDate,
        $lt: endDate 
      } 
    });
    console.log(`✓ Sters ${result.deletedCount} cursuri\n`);
    
    // Get AFTER stats
    const statsAfter = await db.stats();
    const freedMB = (statsBefore.dataSize - statsAfter.dataSize) / 1024 / 1024;
    
    console.log('📊 DUPA:');
    console.log(`   Database size: ${(statsAfter.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Eliberat: ~${freedMB.toFixed(2)} MB\n`);
    
    console.log('✅ Cleanup complet!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteOldCourses();
