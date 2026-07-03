// Migration script: Local MongoDB -> MongoDB Atlas
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const LOCAL_URI = 'mongodb://localhost:27017/masterclass';
const ATLAS_URI = process.env.MONGODB_URI;

async function migrate() {
    console.log('🚀 Starting migration from Local to Atlas...\n');

    if (!ATLAS_URI || ATLAS_URI.includes('localhost')) {
        console.error('❌ ATLAS_URI not configured properly in .env');
        console.log('   Current MONGODB_URI:', ATLAS_URI);
        process.exit(1);
    }

    // Connect to local MongoDB
    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✓ Connected to Local MongoDB');

    // Connect to Atlas
    const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('✓ Connected to MongoDB Atlas');

    try {
        // Migrate Courses
        console.log('\n📚 Migrating Courses...');
        const localCourses = await localConn.db.collection('courses').find({}).toArray();
        const atlasCourses = await atlasConn.db.collection('courses').find({}).toArray();
        const atlasCourseTitles = new Set(atlasCourses.map(c => c.title));

        let coursesAdded = 0;
        for (const course of localCourses) {
            if (!atlasCourseTitles.has(course.title)) {
                delete course._id; // Remove old _id to create new one
                await atlasConn.db.collection('courses').insertOne(course);
                console.log(`  ✓ Added: ${course.title}`);
                coursesAdded++;
            } else {
                console.log(`  ⏭ Skipped (exists): ${course.title}`);
            }
        }
        console.log(`  Total: ${coursesAdded} new courses added`);

        // Migrate Reels
        console.log('\n🎬 Migrating Reels...');
        const localReels = await localConn.db.collection('reels').find({}).toArray();
        const atlasReels = await atlasConn.db.collection('reels').find({}).toArray();
        const atlasReelTitles = new Set(atlasReels.map(r => r.title));

        let reelsAdded = 0;
        for (const reel of localReels) {
            if (!atlasReelTitles.has(reel.title)) {
                delete reel._id;
                await atlasConn.db.collection('reels').insertOne(reel);
                console.log(`  ✓ Added: ${reel.title}`);
                reelsAdded++;
            } else {
                console.log(`  ⏭ Skipped (exists): ${reel.title}`);
            }
        }
        console.log(`  Total: ${reelsAdded} new reels added`);

        // Migrate Users (except admin)
        console.log('\n👥 Migrating Users...');
        const localUsers = await localConn.db.collection('users').find({ role: { $ne: 'admin' } }).toArray();
        const atlasUsers = await atlasConn.db.collection('users').find({}).toArray();
        const atlasUserEmails = new Set(atlasUsers.map(u => u.email));

        let usersAdded = 0;
        for (const user of localUsers) {
            if (!atlasUserEmails.has(user.email)) {
                delete user._id;
                await atlasConn.db.collection('users').insertOne(user);
                console.log(`  ✓ Added: ${user.username} (${user.email})`);
                usersAdded++;
            } else {
                console.log(`  ⏭ Skipped (exists): ${user.username}`);
            }
        }
        console.log(`  Total: ${usersAdded} new users added`);

        // Migrate GridFS files (uploads.files and uploads.chunks)
        console.log('\n📁 Migrating GridFS Files...');
        const localFiles = await localConn.db.collection('uploads.files').find({}).toArray();
        const atlasFiles = await atlasConn.db.collection('uploads.files').find({}).toArray();
        const atlasFileIds = new Set(atlasFiles.map(f => f._id.toString()));

        let filesAdded = 0;
        for (const file of localFiles) {
            if (!atlasFileIds.has(file._id.toString())) {
                // Get chunks for this file
                const chunks = await localConn.db.collection('uploads.chunks').find({ files_id: file._id }).toArray();

                // Insert file and chunks
                await atlasConn.db.collection('uploads.files').insertOne(file);
                if (chunks.length > 0) {
                    await atlasConn.db.collection('uploads.chunks').insertMany(chunks);
                }
                console.log(`  ✓ Added file: ${file.filename} (${chunks.length} chunks)`);
                filesAdded++;
            }
        }
        console.log(`  Total: ${filesAdded} new files added`);

        console.log('\n✅ Migration completed successfully!');

        // Show final counts
        const finalCourses = await atlasConn.db.collection('courses').countDocuments();
        const finalReels = await atlasConn.db.collection('reels').countDocuments();
        const finalUsers = await atlasConn.db.collection('users').countDocuments();
        const finalFiles = await atlasConn.db.collection('uploads.files').countDocuments();

        console.log('\n📊 Atlas Database Summary:');
        console.log(`   Courses: ${finalCourses}`);
        console.log(`   Reels: ${finalReels}`);
        console.log(`   Users: ${finalUsers}`);
        console.log(`   Files: ${finalFiles}`);

    } catch (error) {
        console.error('❌ Migration error:', error.message);
    } finally {
        await localConn.close();
        await atlasConn.close();
    }
}

migrate();
