# Database Data Management Scripts

This directory contains scripts for managing MongoDB data. All scripts preserve the database structure (collections, indexes, schemas) while removing documents.

## ⚠️ Important Warnings

- **These operations are IRREVERSIBLE**
- **Always backup your data before running these scripts**
- **Test in development environment first**
- **All scripts preserve collection structures and indexes**

## Available Scripts

### 1. Clear All Data (Complete Reset)

**File:** `clearAllData.js`

Removes ALL documents from ALL collections in the database.

```bash
cd backend
node clearAllData.js
```

**What it does:**
- Connects to MongoDB
- Lists all collections
- Deletes all documents from every collection
- Preserves collection structures and indexes
- Shows summary of deleted documents

**Use when:**
- Starting fresh with a clean database
- Resetting entire system for new academic year
- Testing from scratch

---

### 2. Clear Selective Data (Partial Reset)

**File:** `clearSelectiveData.js`

Removes documents from specific collections only.

```bash
cd backend
node clearSelectiveData.js
```

**Default collections cleared:**
- `users` - All user accounts
- `projects` - All project records
- `assignments` - All mentor-mentee assignments
- `file_metadata` - All file upload records
- `notifications` - All notifications
- `password_resets` - All password reset tokens

**Preserved by default:**
- `batches` - Academic year/batch data

**To customize:**
Edit the `COLLECTIONS_TO_CLEAR` array in the script:

```javascript
const COLLECTIONS_TO_CLEAR = [
  'users',
  'projects',
  // Add or remove collections as needed
];
```

**Use when:**
- Clearing user data but keeping academic year setup
- Removing test data while preserving configuration
- Selective cleanup for specific scenarios

---

### 3. Clear Database (Legacy)

**File:** `clearDatabase.js`

Original script that clears all data from the database.

```bash
cd backend
node clearDatabase.js
```

**Note:** Uses hardcoded database name `project_management`. Update if your database name is different.

---

## Common Scenarios

### Scenario 1: New Academic Year Setup

Keep batches, clear everything else:

```bash
# Edit clearSelectiveData.js to exclude 'batches'
node clearSelectiveData.js
```

### Scenario 2: Complete Fresh Start

Clear everything including batches:

```bash
node clearAllData.js
```

### Scenario 3: Remove Test Users Only

Edit `clearSelectiveData.js`:
```javascript
const COLLECTIONS_TO_CLEAR = ['users'];
```
Then run:
```bash
node clearSelectiveData.js
```

### Scenario 4: Clear Files and Notifications

Edit `clearSelectiveData.js`:
```javascript
const COLLECTIONS_TO_CLEAR = ['file_metadata', 'notifications'];
```
Then run:
```bash
node clearSelectiveData.js
```

---

## What Gets Preserved

All scripts preserve:
- ✅ Collection structures
- ✅ Database indexes
- ✅ Collection schemas
- ✅ Database configuration

Only documents (data) are deleted.

---

## Safety Checklist

Before running any script:

1. ✅ Backup your database
2. ✅ Verify you're connected to the correct database
3. ✅ Check the `.env` file for `MONGO_URI`
4. ✅ Test in development environment first
5. ✅ Inform team members if in shared environment
6. ✅ Document why you're clearing data

---

## Database Connection

All scripts use the MongoDB URI from your `.env` file:

```env
MONGO_URI=mongodb://localhost:27017/prp
```

Or fall back to default: `mongodb://localhost:27017/prp`

---

## Troubleshooting

### Script won't connect
- Check if MongoDB is running
- Verify `MONGO_URI` in `.env`
- Check network/firewall settings

### Permission errors
- Ensure MongoDB user has delete permissions
- Check authentication credentials

### Script hangs
- Check MongoDB connection
- Verify database name exists
- Look for network issues

---

## After Clearing Data

You'll need to:

1. **Create admin/HOD user** (if cleared users)
2. **Set up academic year** (if cleared batches)
3. **Reconfigure system settings** (if needed)
4. **Inform users** about the reset

---

## Example Output

```
============================================================
🧹 CLEAR ALL DATA SCRIPT
============================================================

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📋 Found 8 collections:

   - users
   - projects
   - assignments
   - file_metadata
   - notifications
   - password_resets
   - batches
   - sessions

⚠️  WARNING: This will delete ALL data from ALL collections!
⚠️  Collection structures and indexes will be preserved.

🗑️  users: Deleted 45 documents
🗑️  projects: Deleted 23 documents
🗑️  assignments: Deleted 18 documents
🗑️  file_metadata: Deleted 156 documents
🗑️  notifications: Deleted 89 documents
⚪ password_resets: Already empty
🗑️  batches: Deleted 2 documents
⚪ sessions: Already empty

============================================================
✅ Successfully deleted 333 documents total
✅ All collections are now empty
✅ Collection structures and indexes preserved
============================================================

🔌 Disconnected from MongoDB

✨ Data clearing completed successfully!
```

---

## Need Help?

- Check MongoDB logs for errors
- Verify database connection string
- Ensure MongoDB service is running
- Review script output for specific errors
