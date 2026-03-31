/**
 * SAFE VERSION: Clear all data from MongoDB EXCEPT mentor, HOD, and project coordinator accounts
 * This version requires manual confirmation before deletion
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const readline = require('readline');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function clearDataKeepStaff() {
    try {
        await client.connect();
        console.log('✓ Connected to MongoDB\n');

        const db = client.db('project_management');
        
        const usersCollection = db.collection('users');
        const projectsCollection = db.collection('projects');
        const assignmentsCollection = db.collection('assignments');
        const filesCollection = db.collection('files');
        const batchesCollection = db.collection('batches');
        const passwordResetCollection = db.collection('password_resets');

        console.log('📊 Current Database State:');
        console.log('═════════════════════════════════════\n');

        // Show current counts
        const menteeCount = await usersCollection.countDocuments({ role: 'mentee' });
        const mentorCount = await usersCollection.countDocuments({ 
            $or: [{ role: 'mentor' }, { roles: 'mentor' }] 
        });
        const hodCount = await usersCollection.countDocuments({ 
            $or: [{ role: 'hod' }, { roles: 'hod' }] 
        });
        const pcCount = await usersCollection.countDocuments({ 
            $or: [{ role: 'project_coordinator' }, { roles: 'project_coordinator' }] 
        });
        const projectCount = await projectsCollection.countDocuments();
        const assignmentCount = await assignmentsCollection.countDocuments();
        const fileCount = await filesCollection.countDocuments();
        const batchCount = await batchesCollection.countDocuments();

        console.log('WILL BE DELETED:');
        console.log(`  ❌ ${menteeCount} mentee accounts`);
        console.log(`  ❌ ${projectCount} projects`);
        console.log(`  ❌ ${assignmentCount} assignments`);
        console.log(`  ❌ ${fileCount} file metadata records`);
        console.log(`  ❌ ${batchCount} academic year batches`);
        console.log('');
        console.log('WILL BE KEPT:');
        console.log(`  ✅ ${mentorCount} mentor accounts`);
        console.log(`  ✅ ${hodCount} HOD accounts`);
        console.log(`  ✅ ${pcCount} project coordinator accounts`);
        console.log('\n═════════════════════════════════════\n');

        // Show staff accounts that will be preserved
        const staffUsers = await usersCollection.find({
            role: { $in: ['mentor', 'hod', 'project_coordinator'] }
        }, {
            projection: { email: 1, role: 1, roles: 1, name: 1, _id: 0 }
        }).toArray();

        console.log('Staff accounts that will be PRESERVED:\n');
        staffUsers.forEach((user, index) => {
            const userRoles = user.roles || [user.role];
            console.log(`${index + 1}. ${user.email} (${userRoles.join(', ')})`);
        });

        console.log('\n═════════════════════════════════════\n');
        console.log('⚠️  WARNING: This action CANNOT be undone!');
        console.log('⚠️  All mentee data, projects, and assignments will be permanently deleted!\n');

        const answer = await askQuestion('Type "DELETE ALL DATA" to confirm (or anything else to cancel): ');

        if (answer.trim() !== 'DELETE ALL DATA') {
            console.log('\n❌ Operation cancelled. No data was deleted.\n');
            rl.close();
            return;
        }

        console.log('\n🗑️  Deleting data...\n');

        // Delete mentee accounts only
        const deletedMentees = await usersCollection.deleteMany({ role: 'mentee' });
        console.log(`✓ Deleted ${deletedMentees.deletedCount} mentee accounts`);

        // Delete all projects
        const deletedProjects = await projectsCollection.deleteMany({});
        console.log(`✓ Deleted ${deletedProjects.deletedCount} projects`);

        // Delete all assignments
        const deletedAssignments = await assignmentsCollection.deleteMany({});
        console.log(`✓ Deleted ${deletedAssignments.deletedCount} assignments`);

        // Delete all file metadata
        const deletedFiles = await filesCollection.deleteMany({});
        console.log(`✓ Deleted ${deletedFiles.deletedCount} file metadata records`);

        // Delete all batches
        const deletedBatches = await batchesCollection.deleteMany({});
        console.log(`✓ Deleted ${deletedBatches.deletedCount} batches`);

        // Delete all password reset tokens
        const deletedPasswordResets = await passwordResetCollection.deleteMany({});
        console.log(`✓ Deleted ${deletedPasswordResets.deletedCount} password reset tokens`);

        console.log('\n═════════════════════════════════════\n');
        console.log('✅ Data cleanup completed successfully!');
        console.log(`✅ ${staffUsers.length} staff accounts preserved`);
        console.log('✅ Database schema intact');
        console.log('✅ Ready for fresh data\n');

        console.log('📝 Note: S3 files are NOT deleted from AWS.');
        console.log('   If needed, delete them separately from AWS Console.\n');

        rl.close();

    } catch (error) {
        console.error('✗ Error:', error.message);
        console.error(error);
        rl.close();
    } finally {
        await client.close();
        console.log('✓ Database connection closed\n');
    }
}

// Run the cleanup
clearDataKeepStaff();
