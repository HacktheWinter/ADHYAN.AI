import mongoose from 'mongoose';
import Classroom from './models/Classroom.js';

// Update this to match your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name';

async function migrateClassrooms() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');

        console.log('Finding classrooms without isLive field...');
        const classrooms = await Classroom.find({});
        console.log(`Found ${classrooms.length} classrooms`);

        let updated = 0;
        for (const classroom of classrooms) {
            if (classroom.isLive === undefined) {
                classroom.isLive = false;
                await classroom.save();
                updated++;
                console.log(`Updated classroom: ${classroom._id} (${classroom.name})`);
            }
        }

        console.log(`\nMigration complete! Updated ${updated} classrooms.`);

        // Verify
        const allClassrooms = await Classroom.find({});
        console.log('\nAll classrooms now have isLive field:');
        allClassrooms.forEach(c => {
            console.log(`  ${c.name}: isLive = ${c.isLive}`);
        });

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

migrateClassrooms();
