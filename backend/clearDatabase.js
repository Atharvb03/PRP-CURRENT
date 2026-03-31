/**
 * Clear all data from MongoDB database
 * Keeps the database structure (collections and indexes) but removes all documents
 */

const { MongoClient } = require("mongodb");
require("dotenv").config();

const mongoURI = "mongodb://127.0.0.1:27017";
const dbName = "project_management";

async function clearDatabase() {
    const client = new MongoClient(mongoURI);
    
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");
        
        const db = client.db(dbName);
        
        // Get all collections
        const collections = await db.listCollections().toArray();
        console.log(`\n📋 Found ${collections.length} collections\n`);
        
        // Clear each collection
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            const collection = db.collection(collectionName);
            
            // Count documents before deletion
            const countBefore = await collection.countDocuments();
            
            if (countBefore > 0) {
                // Delete all documents
                const result = await collection.deleteMany({});
                console.log(`🗑️  ${collectionName}: Deleted ${result.deletedCount} documents`);
            } else {
                console.log(`⚪ ${collectionName}: Already empty`);
            }
        }
        
        console.log("\n✅ Database cleared successfully!");
        console.log("📌 Note: Collections and indexes are preserved");
        
    } catch (err) {
        console.error("❌ Error clearing database:", err);
    } finally {
        await client.close();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

// Run the script
clearDatabase();
