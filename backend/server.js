/**
 * server-new.js — New lean entry point using split route files.
 *
 * HOW TO USE:
 *   1. Test this new structure:  node server-new.js
 *   2. If everything works, rename:
 *      - server.js     → server-old.js  (backup)
 *      - server-new.js → server.js
 *
 * WHAT CHANGED vs old server.js:
 *   - All routes moved to routes/ folder (auth, files, mentee, assignments, batches, coordinator, dashboard)
 *   - DB connection shared via db.js
 *   - S3 client shared via s3.js
 *   - This file only: connects DB, initializes passport, starts server
 *
 * HOW TO RUN (same as before):
 *   npm start        → runs this file via "start": "node server.js" in package.json
 *   npm run dev      → nodemon server.js
 */

require('dotenv').config();
const { connectDB }      = require('./db');
const { createIndexes }  = require('./config/indexes');
const { initDeadlineReminder } = require('./jobs/deadlineReminder');
const app = require('./app');

const PORT = process.env.PORT || 5000;

async function start() {
  // Connect to MongoDB — this also initializes passport and indexes
  const { db, usersCollection } = await connectDB();

  // Initialize Passport Google OAuth strategy with DB access
  require('./config/passport')(usersCollection);

  // Create DB indexes for performance
  await createIndexes(db);

  // Start deadline reminder cron job
  initDeadlineReminder(db, usersCollection);

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    console.log(`📁 Routes: auth | files | mentee | assignments | batches | coordinator | dashboard`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
