/**
 * Fix existing users by adding isVerified field
 * Run this once to update old users created before email verification was added
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function fixExistingUsers() {
    try {
        await client.connect();
        console.log('✓ Connected to MongoDB');

        const db = client.db('project_management');
        const usersCollection = db.collection('users');

        // Find all users without isVerified field
        const usersWithoutVerification = await usersCollection.find({
            isVerified: { $exists: false }
        }).toArray();

        console.log(`\nFound ${usersWithoutVerification.length} users without verification status`);

        if (usersWithoutVerification.length === 0) {
            console.log('✓ All users already have verification status');
            return;
        }

        // Update all existing users
        // - Mentees: set isVerified to true (grandfather them in)
        // - Others: set isVerified to true (they don't need verification)
        const result = await usersCollection.updateMany(
            { isVerified: { $exists: false } },
            { 
                $set: { isVerified: true },
                $unset: { verificationToken: "" }
            }
        );

        console.log(`\n✓ Updated ${result.modifiedCount} users`);
        console.log('  - All existing users are now marked as verified');
        console.log('  - New signups will require email verification');

        // Show updated users
        const updatedUsers = await usersCollection.find({}, {
            projection: { email: 1, role: 1, isVerified: 1, _id: 0 }
        }).toArray();

        console.log('\nCurrent users:');
        updatedUsers.forEach(user => {
            console.log(`  - ${user.email} (${user.role}): isVerified = ${user.isVerified}`);
        });

    } catch (error) {
        console.error('✗ Error:', error.message);
    } finally {
        await client.close();
        console.log('\n✓ Database connection closed');
    }
}

fixExistingUsers();
