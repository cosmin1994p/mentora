
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function inspectJacksonReels() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const db = mongoose.connection.db;
        const reels = await db.collection('reels').find({
            $or: [
                { title: { $regex: /Samuel/i } },
                { creator: { $regex: /Samuel/i } },
                { title: { $regex: /Jackson/i } },
                { creator: { $regex: /Jackson/i } }
            ]
        }).toArray();

        let output = {};
        if (reels.length > 0) {
            output = { found: true, reels: reels };
        } else {
            const allReels = await db.collection('reels').find({}, { projection: { title: 1, creator: 1 } }).toArray();
            output = { found: false, allReels: allReels };
        }

        fs.writeFileSync('jackson_inspect_reels.json', JSON.stringify(output, null, 2));
        console.log('Written to jackson_inspect_reels.json');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

inspectJacksonReels();
