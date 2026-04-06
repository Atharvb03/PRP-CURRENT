/**
 * db.js — Shared MongoDB connection and collection references.
 * All route files import from here instead of declaring their own connections.
 *
 * Usage in route files:
 *   const { getDb, getCollections } = require('../db');
 *   const { db, usersCollection, projectsCollection, batchesCollection } = getCollections();
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const client = new MongoClient(mongoURI);

let db, usersCollection, projectsCollection, batchesCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('project_management');
    usersCollection   = db.collection('users');
    projectsCollection = db.collection('projects');
    batchesCollection  = db.collection('batches');
    console.log('✅ Connected to MongoDB');
    return { db, usersCollection, projectsCollection, batchesCollection };
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

function getDb() {
  if (!db) throw new Error('DB not initialized. Call connectDB() first.');
  return db;
}

function getCollections() {
  if (!db) throw new Error('DB not initialized. Call connectDB() first.');
  return { db, usersCollection, projectsCollection, batchesCollection };
}

// Handle connection errors after initial connect
client.on('error', (err) => { console.error('❌ MongoDB error:', err); process.exit(1); });
client.on('close', () => { console.error('❌ MongoDB connection closed'); process.exit(1); });

module.exports = { connectDB, getDb, getCollections, client };
