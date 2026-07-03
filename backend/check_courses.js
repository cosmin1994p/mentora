import mongoose from 'mongoose';

async function checkCourses() {
    await mongoose.connect('mongodb://localhost:27017/masterclass');

    const db = mongoose.connection.db;
    console.log('Connected to database:', db.databaseName);

    // Direct count
    const courseCount = await db.collection('courses').countDocuments();
    console.log('courses collection count:', courseCount);

    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log('\nAll databases:');
    for (const d of dbs.databases) {
        console.log(`  - ${d.name}`);
    }

    await mongoose.disconnect();
}

checkCourses().catch(console.error);
