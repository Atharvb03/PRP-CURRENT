/**
 * Clear All Data Script
 * 
 * This script removes ALL documents from all collections in the database
 * while preserving the collection structure and indexes.
 * 
 * WARNING: This is irreversible! All data will be permanently deleted.
 * 
 * Usage: node clearAllData.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prp';

async function clearAllData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Get all collection names
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(`📋 Found ${collectionNames.length} collections:\n`);
    collectionNames.forEach(name => console.log(`   - ${name}`));
    console.log('');
    
    // Confirm before proceeding
    console.log('⚠️  WARNING: This will delete ALL data from ALL collections!');
    console.log('⚠️  Collection structures and indexes will be preserved.\n');
    
    // Delete all documents from each collection
    let totalDeleted = 0;
    
    for (const collectionName of collectionNames) {
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
    console.log(`✅ All collections are now empty`);
    console.log(`✅ Collection structures and indexes preserved`);
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
console.log('🧹 CLEAR ALL DATA SCRIPT');
console.log('='.repeat(60) + '\n');

clearAllData()
  .then(() => {
    console.log('\n✨ Data clearing completed successfully!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
