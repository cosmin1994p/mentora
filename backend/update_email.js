import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const NEW_EMAIL = 'admin@stud.ase.ro';

async function fix() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    const before = await mongoose.connection.db.collection('users').findOne({ username: 'admintudy' });
    console.log('Before:', before?.email);

    await mongoose.connection.db.collection('users').updateOne(
        { username: 'admintudy' },
        { $set: { email: NEW_EMAIL } }
    );

    const after = await mongoose.connection.db.collection('users').findOne({ username: 'admintudy' });
    console.log('After:', after?.email);
    console.log('Done!');

    await mongoose.disconnect();
    process.exit(0);
}
fix();
