/**
 * Test verification token lookup
 * This helps debug why verification links aren't working
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function testVerification() {
    try {
        await client.connect();
        console.log('✓ Connected to MongoDB\n');

        const db = client.db('project_management');
        const usersCollection = db.collection('users');

        // Find all users with verification tokens
        const usersWithTokens = await usersCollection.find({
            verificationToken: { $exists: true }
        }).toArray();

        console.log(`Users with verification tokens: ${usersWithTokens.length}\n`);

        if (usersWithTokens.length === 0) {
            console.log('⚠ No users have verification tokens');
            console.log('This means either:');
            console.log('  1. All users are already verified');
            console.log('  2. No new signups have been created');
            console.log('  3. The signup process is not saving the token\n');
            
            // Show all mentees
            const mentees = await usersCollection.find({ role: 'mentee' }).toArray();
            console.log(`Total mentees: ${mentees.length}`);
            mentees.forEach(m => {
                console.log(`  - ${m.email}: isVerified=${m.isVerified}, hasToken=${!!m.verificationToken}`);
            });
        } else {
            usersWithTokens.forEach((user, index) => {
                console.log(`User ${index + 1}:`);
                console.log(`  Email: ${user.email}`);
                console.log(`  Role: ${user.role}`);
                console.log(`  isVerified: ${user.isVerified}`);
                console.log(`  Token: ${user.verificationToken}`);
                console.log(`  Verification Link: ${process.env.FRONTEND_URL}/verify/${user.verificationToken}`);
                console.log('');
            });
        }

        // Test a specific token (if provided as command line arg)
        const testToken = process.argv[2];
        if (testToken) {
            console.log(`\nTesting token: ${testToken}`);
            const user = await usersCollection.findOne({ verificationToken: testToken });
            if (user) {
                console.log('✓ Token found in database!');
                console.log(`  User: ${user.email}`);
                console.log(`  isVerified: ${user.isVerified}`);
            } else {
                console.log('✗ Token NOT found in database');
                console.log('  This token is invalid or has already been used');
            }
        }

    } catch (error) {
        console.error('✗ Error:', error.message);
    } finally {
        await client.close();
    }
}

testVerification();
