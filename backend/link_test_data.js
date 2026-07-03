import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://USER:PASS@your-cluster.mongodb.net/mentora';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    const speaker1 = await db.collection('instructors').findOne({ name: 'Speaker 1' });
    const cursss = await db.collection('courses').findOne({ title: 'cursss' });
    
    if (speaker1 && cursss) {
      console.log('Linking Speaker 1 to cursss...');
      await db.collection('courses').updateOne(
        { _id: cursss._id },
        { $addToSet: { instructors: speaker1._id } }
      );
      console.log('✓ Success!');
    } else {
      console.log('⚠ Could not find documents.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
