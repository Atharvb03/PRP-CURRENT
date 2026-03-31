/**
 * Check current users and their verification status
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function checkUsers() {
    try {
        await client.connect();
        console.log('✓ Connected to MongoDB\n');

        const db = client.db('project_management');
        const usersCollection = db.collection('users');

        const users = await usersCollection.find({}).toArray();

        console.log(`Total users: ${users.length}\n`);

        users.forEach((user, index) => {
            console.log(`User ${index + 1}:`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  isVerified: ${user.isVerified !== undefined ? user.isVerified : 'NOT SET'}`);
            console.log(`  verificationToken: ${user.verificationToken ? 'EXISTS' : 'NOT SET'}`);
            console.log('');
        });

    } catch (error) {
        console.error('✗ Error:', error.message);
    } finally {
        await client.close();
    }
}

checkUsers();
