/**
 * Verify database state after clearing
 */

const { MongoClient } = require("mongodb");
require("dotenv").config();

const mongoURI = "mongodb://127.0.0.1:27017";
const dbName = "project_management";

async function verifyDatabase() {
    const client = new MongoClient(mongoURI);
    
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB\n");
        
        const db = client.db(dbName);
        
        // Get all collections
        const collections = await db.listCollections().toArray();
        console.log("📊 Database Status:\n");
        console.log("═".repeat(50));
        
        let totalDocuments = 0;
        
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            totalDocuments += count;
            
            const status = count === 0 ? "✅ Empty" : `⚠️  ${count} documents`;
            console.log(`${collectionName.padEnd(25)} ${status}`);
        }
        
        console.log("═".repeat(50));
        console.log(`\nTotal documents: ${totalDocuments}`);
        console.log(`Total collections: ${collections.length}`);
        
        if (totalDocuments === 0) {
            console.log("\n✅ All data cleared successfully!");
        } else {
            console.log("\n⚠️  Some data still exists");
        }
        
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
    }
}

verifyDatabase();
