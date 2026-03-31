/**
 * Clear Selective Data Script
 * 
 * This script allows you to selectively clear specific collections
 * while preserving others.
 * 
 * Usage: node clearSelectiveData.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const readline = require('readline');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prp';

// Collections to clear (modify this array to select which collections to clear)
const COLLECTIONS_TO_CLEAR = [
  'users',
  'projects',
  'assignments',
  'file_metadata',
  'notifications',
  'password_resets',
  // 'batches', // Uncomment to also clear batches
];

async function clearSelectiveData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Get all collection names
    const allCollections = await db.listCollections().toArray();
    const allCollectionNames = allCollections.map(c => c.name);
    
    console.log(`📋 Database has ${allCollectionNames.length} collections total:\n`);
    allCollectionNames.forEach(name => {
      const willClear = COLLECTIONS_TO_CLEAR.includes(name);
      console.log(`   ${willClear ? '🗑️ ' : '✅ '} ${name} ${willClear ? '(WILL BE CLEARED)' : '(will be preserved)'}`);
    });
    console.log('');
    
    // Confirm before proceeding
    console.log('⚠️  WARNING: This will delete ALL data from the selected collections!');
    console.log(`⚠️  ${COLLECTIONS_TO_CLEAR.length} collections will be cleared.\n`);
    
    // Delete all documents from selected collections
    let totalDeleted = 0;
    
    for (const collectionName of COLLECTIONS_TO_CLEAR) {
      if (!allCollectionNames.includes(collectionName)) {
        console.log(`⚠️  ${collectionName}: Collection does not exist, skipping`);
        continue;
      }
      
      const collection = db.collection(collectionName);
      
      // Count documents before deletion
      const countBefore = await collection.countDocuments();
      
      if (countBefore > 0) {
        // Delete all documents
        const result = await collection.deleteMany({});
        totalDeleted += result.deletedCount;
        
        console.log(`🗑️  ${collectionName}: Deleted ${result.deletedCount} documents`);
      } else {
        console.log(`⚪ ${collectionName}: Already empty`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully deleted ${totalDeleted} documents total`);
    console.log(`✅ ${COLLECTIONS_TO_CLEAR.length} collections cleared`);
    console.log(`✅ ${allCollectionNames.length - COLLECTIONS_TO_CLEAR.length} collections preserved`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
console.log('\n' + '='.repeat(60));
console.log('🧹 CLEAR SELECTIVE DATA SCRIPT');
console.log('='.repeat(60) + '\n');

clearSelectiveData()
  .then(() => {
    console.log('\n✨ Data clearing completed successfully!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
