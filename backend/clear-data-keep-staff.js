/**
 * Clear all data from MongoDB EXCEPT mentor, HOD, and project coordinator accounts
 * This preserves:
 * - Mentor users
 * - HOD users
 * - Project Coordinator users
 * 
 * This deletes:
 * - All mentee accounts
 * - All projects
 * - All assignments
 * - All file metadata
 * - All batches
 * - All password reset tokens
 * - All notifications (if any)
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function clearDataKeepStaff() {
    try {
        await client.connect();
        console.log('✓ Connected to MongoDB\n');

        const db = client.db('project_management');
        
        // Get all collections
        const usersCollection = db.collection('users');
        const projectsCollection = db.collection('projects');
        const assignmentsCollection = db.collection('assignments');
        const filesCollection = db.collection('files');
        const batchesCollection = db.collection('batches');
        const passwordResetCollection = db.collection('password_resets');

        console.log('📊 Current Database State:');
        console.log('─────────────────────────────────────\n');

        // Show current counts
        const totalUsers = await usersCollection.countDocuments();
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
        const passwordResetCount = await passwordResetCollection.countDocuments();

        console.log('Users:');
        console.log(`  Total: ${totalUsers}`);
        console.log(`  Mentees: ${menteeCount} (WILL BE DELETED)`);
        console.log(`  Mentors: ${mentorCount} (WILL BE KEPT)`);
        console.log(`  HODs: ${hodCount} (WILL BE KEPT)`);
        console.log(`  Project Coordinators: ${pcCount} (WILL BE KEPT)`);
        console.log('');
        console.log('Other Data:');
        console.log(`  Projects: ${projectCount} (WILL BE DELETED)`);
        console.log(`  Assignments: ${assignmentCount} (WILL BE DELETED)`);
        console.log(`  Files: ${fileCount} (WILL BE DELETED)`);
        console.log(`  Batches: ${batchCount} (WILL BE DELETED)`);
        console.log(`  Password Resets: ${passwordResetCount} (WILL BE DELETED)`);
        console.log('\n─────────────────────────────────────\n');

        // Confirm before deletion
        console.log('⚠️  WARNING: This will delete all data except staff accounts!');
        console.log('⚠️  This action CANNOT be undone!\n');
        console.log('Starting deletion in 3 seconds...\n');
        
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🗑️  Deleting data...\n');

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

        console.log('\n─────────────────────────────────────\n');
        console.log('📊 Final Database State:');
        console.log('─────────────────────────────────────\n');

        // Show final counts
        const finalUsers = await usersCollection.countDocuments();
        const finalMentees = await usersCollection.countDocuments({ role: 'mentee' });
        const finalMentors = await usersCollection.countDocuments({ 
            $or: [{ role: 'mentor' }, { roles: 'mentor' }] 
        });
        const finalHODs = await usersCollection.countDocuments({ 
            $or: [{ role: 'hod' }, { roles: 'hod' }] 
        });
        const finalPCs = await usersCollection.countDocuments({ 
            $or: [{ role: 'project_coordinator' }, { roles: 'project_coordinator' }] 
        });
        const finalProjects = await projectsCollection.countDocuments();
        const finalAssignments = await assignmentsCollection.countDocuments();
        const finalFiles = await filesCollection.countDocuments();
        const finalBatches = await batchesCollection.countDocuments();

        console.log('Users:');
        console.log(`  Total: ${finalUsers}`);
        console.log(`  Mentees: ${finalMentees}`);
        console.log(`  Mentors: ${finalMentors}`);
        console.log(`  HODs: ${finalHODs}`);
        console.log(`  Project Coordinators: ${finalPCs}`);
        console.log('');
        console.log('Other Data:');
        console.log(`  Projects: ${finalProjects}`);
        console.log(`  Assignments: ${finalAssignments}`);
        console.log(`  Files: ${finalFiles}`);
        console.log(`  Batches: ${finalBatches}`);

        console.log('\n─────────────────────────────────────\n');

        // Show remaining staff accounts
        const staffUsers = await usersCollection.find({
            role: { $in: ['mentor', 'hod', 'project_coordinator'] }
        }, {
            projection: { email: 1, role: 1, roles: 1, name: 1, _id: 0 }
        }).toArray();

        console.log('✅ Preserved Staff Accounts:\n');
        staffUsers.forEach((user, index) => {
            const userRoles = user.roles || [user.role];
            console.log(`${index + 1}. ${user.email}`);
            console.log(`   Name: ${user.name || 'N/A'}`);
            console.log(`   Roles: ${userRoles.join(', ')}`);
            console.log('');
        });

        console.log('─────────────────────────────────────\n');
        console.log('✅ Data cleanup completed successfully!');
        console.log('✅ All staff accounts preserved');
        console.log('✅ Database schema intact');
        console.log('✅ Ready for fresh data\n');

        console.log('📝 Note: S3 files are NOT deleted. If you want to delete S3 files,');
        console.log('   you need to do that separately from AWS Console or CLI.\n');

    } catch (error) {
        console.error('✗ Error:', error.message);
        console.error(error);
    } finally {
        await client.close();
        console.log('✓ Database connection closed\n');
    }
}

// Run the cleanup
clearDataKeepStaff();
