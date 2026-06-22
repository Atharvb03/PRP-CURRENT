/**
 * routes/files.js
 * Handles: S3 file upload URL generation, metadata save/fetch/delete, remarks, secure download URLs
 * Mounted at: /api/files
 */

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const multer  = require('multer');

const { getCollections }  = require('../db');
const { s3 }              = require('../s3');
const { requireRole }     = require('../middleware/auth');
const { sendEmail, fileUploadedEmail, remarkAddedEmail, phaseApprovedEmail } = require('../utils/emailService');
const { COLLECTION: FILE_COL, ALLOWED_EXTENSIONS, MAX_SIZE_MB, MIME_MAP } = require('../models/fileMetadata');
const { getAllowedPhases, PHASE_LABELS } = require('../constants/phases');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

// POST /generate-upload-url — mentee gets a pre-signed S3 PUT URL
router.post('/generate-upload-url', requireRole('mentee'), async (req, res) => {
  const { db, usersCollection, projectsCollection } = getCollections();
  const { fileName, fileType, section, menteeEmail } = req.body;
  if (!fileName || !section || !menteeEmail)
    return res.status(400).json({ success: false, message: 'fileName, section and menteeEmail are required' });

  const ext = fileName.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext))
    return res.status(400).json({ success: false, message: `File type .${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` });

  const resolvedContentType = (fileType && fileType !== 'application/octet-stream') ? fileType : (MIME_MAP[ext] || 'application/octet-stream');

  const assignment = await db.collection('assignments').findOne({ menteeEmail: menteeEmail.toLowerCase(), isArchived: { $ne: true } });
  if (!assignment) return res.status(403).json({ success: false, message: 'Your project is not yet assigned to a mentor.' });
  if (assignment.finalRemark) return res.status(403).json({ success: false, message: 'Your project has been finalised. Uploads are no longer accepted.' });

  const project = await projectsCollection.findOne({ menteeEmail: menteeEmail.toLowerCase(), isArchived: { $ne: true } });
  const duration = project?.duration || assignment?.duration || '6_months';
  const allowedPhases = getAllowedPhases(duration);
  if (!allowedPhases.includes(section))
    return res.status(400).json({ success: false, message: `This phase is not allowed for this project duration (${duration.replace('_', ' ')})` });

  const uniqueId = crypto.randomBytes(8).toString('hex');
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const s3Key = `uploads/${assignment._id}/${section}/${uniqueId}_${safeFileName}`;
  const params = { Bucket: process.env.S3_BUCKET_NAME, Key: s3Key, ContentType: resolvedContentType, Expires: 300 };

  try {
    const uploadUrl = s3.getSignedUrl('putObject', params);
    const objectUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(s3Key).replace(/%2F/g, '/')}`;
    res.json({ success: true, uploadUrl, s3Key, objectUrl, contentType: resolvedContentType });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate upload URL' });
  }
});

// POST /upload - backend-mediated S3 upload to avoid browser-to-S3 CORS failures
router.post('/upload', requireRole('mentee'), upload.single('file'), async (req, res) => {
  const { db, projectsCollection } = getCollections();
  const { section, menteeEmail } = req.body;
  const file = req.file;

  if (!file || !section || !menteeEmail)
    return res.status(400).json({ success: false, message: 'file, section and menteeEmail are required' });

  const normalizedEmail = menteeEmail.toLowerCase();
  if (req.userEmail !== normalizedEmail)
    return res.status(403).json({ success: false, message: 'You can only upload files for your own account' });

  const ext = file.originalname.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext))
    return res.status(400).json({ success: false, message: `File type .${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` });

  const resolvedContentType = (file.mimetype && file.mimetype !== 'application/octet-stream') ? file.mimetype : (MIME_MAP[ext] || 'application/octet-stream');

  try {
    const assignment = await db.collection('assignments').findOne({ menteeEmail: normalizedEmail, isArchived: { $ne: true } });
    if (!assignment) return res.status(403).json({ success: false, message: 'Your project is not yet assigned to a mentor.' });
    if (assignment.finalRemark) return res.status(403).json({ success: false, message: 'Your project has been finalised. Uploads are no longer accepted.' });

    const project = await projectsCollection.findOne({ menteeEmail: normalizedEmail, isArchived: { $ne: true } });
    const duration = project?.duration || assignment?.duration || '6_months';
    const allowedPhases = getAllowedPhases(duration);
    if (!allowedPhases.includes(section))
      return res.status(400).json({ success: false, message: `This phase is not allowed for this project duration (${duration.replace('_', ' ')})` });

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `uploads/${assignment._id}/${section}/${uniqueId}_${safeFileName}`;

    await s3.upload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: resolvedContentType,
    }).promise();

    const objectUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(s3Key).replace(/%2F/g, '/')}`;
    res.json({ success: true, s3Key, objectUrl, contentType: resolvedContentType });
  } catch (err) {
    console.error('S3 upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload file to S3' });
  }
});
// POST /save-metadata — save file info to DB after S3 upload
router.post('/save-metadata', requireRole('mentee'), async (req, res) => {
  const { db, usersCollection } = getCollections();
  const { fileName, s3Key, fileType, section, menteeEmail } = req.body;
  if (!fileName || !s3Key || !fileType || !section || !menteeEmail)
    return res.status(400).json({ success: false, message: 'All fields are required' });

  try {
    const assignment = await db.collection('assignments').findOne({ menteeEmail: menteeEmail.toLowerCase(), isArchived: { $ne: true } });
    if (!assignment) return res.status(403).json({ success: false, message: 'No assignment found' });

    const fileCol = db.collection(FILE_COL);
    const now = new Date();
    const finalDeadline = assignment.extendedDeadline ? new Date(assignment.extendedDeadline) : assignment.deadline ? new Date(assignment.deadline) : null;
    const isLate = finalDeadline ? now > finalDeadline : false;

    await fileCol.updateOne(
      { uploaded_by: menteeEmail.toLowerCase(), section, isArchived: { $ne: true } },
      { $set: { file_name: fileName, file_url: s3Key, file_type: fileType, section, project_id: assignment._id.toString(), uploaded_by: menteeEmail.toLowerCase(), remark: 'Pending Review', submittedAt: now, isLate, submissionStatus: isLate ? 'Late Submission' : 'Submitted', updatedAt: now }, $setOnInsert: { createdAt: now, isArchived: false } },
      { upsert: true }
    );

    res.json({ success: true, message: 'File metadata saved' });

    setImmediate(async () => {
      try {
        const mentee = await usersCollection.findOne({ email: menteeEmail.toLowerCase() });
        const mentor = await usersCollection.findOne({ email: assignment.mentorEmail });
        const phaseName = PHASE_LABELS[section] || section;
        if (mentor?.email) {
          const tpl = fileUploadedEmail({ menteeName: mentee?.name || menteeEmail, menteeEmail: menteeEmail.toLowerCase(), projectName: assignment.projectName || 'Your Project', phaseName });
          await sendEmail({ to: mentor.email, ...tpl });
        }
      } catch (e) { console.error('[Email] save-metadata trigger:', e.message); }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save metadata' });
  }
});

// POST /secure-url — generate pre-signed GET URL for file viewing
router.post('/secure-url', requireRole('mentee', 'mentor', 'hod', 'project_coordinator'), async (req, res) => {
  const { db } = getCollections();
  const { s3Key, menteeEmail, download, fileName } = req.body;
  if (!s3Key || !menteeEmail) return res.status(400).json({ success: false, message: 's3Key and menteeEmail are required' });

  try {
    const activeAssignment  = await db.collection('assignments').findOne({ menteeEmail: menteeEmail.toLowerCase(), isArchived: { $ne: true } });
    const archivedAssignment = await db.collection('assignments').findOne({ menteeEmail: menteeEmail.toLowerCase(), isArchived: true });
    const role  = req.userRole;
    const email = req.userEmail;

    if (role === 'mentee' && email !== menteeEmail.toLowerCase())
      return res.status(403).json({ success: false, message: 'You can only access your own files' });
    if (role === 'mentor') {
      const isAssigned = (activeAssignment?.mentorEmail === email) || (archivedAssignment?.mentorEmail === email);
      if (!isAssigned) return res.status(403).json({ success: false, message: 'You are not the assigned mentor for this mentee' });
    }

    const params = { Bucket: process.env.S3_BUCKET_NAME, Key: s3Key, Expires: role === 'mentee' ? 300 : 604800 };
    if (download) {
      const safeFileName = (fileName || s3Key.split('/').pop() || 'download').replace(/[^a-zA-Z0-9._-]/g, '_');
      params.ResponseContentDisposition = `attachment; filename="${safeFileName}"`;
    }
    const signedUrl = s3.getSignedUrl('getObject', params);
    res.json({ success: true, url: signedUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate secure URL' });
  }
});

// GET /metadata/:menteeEmail — fetch all file metadata for a mentee
router.get('/metadata/:menteeEmail', requireRole('mentee', 'mentor', 'hod', 'project_coordinator'), async (req, res) => {
  const { db, batchesCollection } = getCollections();
  const menteeEmail = req.params.menteeEmail.toLowerCase();
  const { projectName } = req.query;

  try {
    const activeAssignment   = await db.collection('assignments').findOne({ menteeEmail, isArchived: { $ne: true } });
    const archivedAssignments = await db.collection('assignments').find({ menteeEmail, isArchived: true }).toArray();
    const role  = req.userRole;
    const email = req.userEmail;

    if (role === 'mentee' && email !== menteeEmail) return res.status(403).json({ success: false, message: 'Access denied' });
    if (role === 'mentor') {
      const isAssigned = (activeAssignment?.mentorEmail === email) || archivedAssignments.some(a => a.mentorEmail === email);
      if (!isAssigned) return res.status(403).json({ success: false, message: 'You are not the assigned mentor for this mentee' });
    }

    const activeFiles = await db.collection(FILE_COL).find({ uploaded_by: menteeEmail, isArchived: { $ne: true } }).toArray();
    const archivedQuery = { uploaded_by: menteeEmail, isArchived: true };
    if (projectName) archivedQuery.archivedProjectName = projectName;
    const archivedFiles = await db.collection(FILE_COL).find(archivedQuery).sort({ archivedAt: -1, archivedProjectName: 1, section: 1 }).toArray();

    // Enrich archived files with batch name
    const batchIds = archivedAssignments.map(a => a.batchId).filter(Boolean);
    const batches  = batchIds.length > 0 ? await batchesCollection.find({ _id: { $in: batchIds } }).toArray() : [];
    const batchMap = Object.fromEntries(batches.map(b => [b._id.toString(), b.name]));
    const enrichedArchivedFiles = archivedFiles.map(f => {
      const match = archivedAssignments.find(a => a.projectName === f.archivedProjectName);
      return { ...f, batchName: match?.batchId ? batchMap[match.batchId.toString()] || null : null };
    });

    res.json({ success: true, data: activeFiles, archivedFiles: enrichedArchivedFiles, deadline: activeAssignment?.deadline || null, extendedDeadline: activeAssignment?.extendedDeadline || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch metadata' });
  }
});

// DELETE /metadata — mentee deletes a file record
router.delete('/metadata', requireRole('mentee'), async (req, res) => {
  const { db } = getCollections();
  const { menteeEmail, section } = req.body;
  if (!menteeEmail || !section) return res.status(400).json({ success: false, message: 'menteeEmail and section are required' });
  if (req.userEmail !== menteeEmail.toLowerCase()) return res.status(403).json({ success: false, message: 'You can only delete your own files' });
  try {
    const file = await db.collection(FILE_COL).findOne({ uploaded_by: menteeEmail.toLowerCase(), section });
    if (file?.isArchived) return res.status(403).json({ success: false, message: 'Archived files cannot be deleted.' });
    const assignment = await db.collection('assignments').findOne({ menteeEmail: menteeEmail.toLowerCase(), isArchived: { $ne: true } });
    if (assignment?.finalRemark) return res.status(403).json({ success: false, message: 'Your project has been finalised. Files cannot be deleted.' });
    await db.collection(FILE_COL).deleteOne({ uploaded_by: menteeEmail.toLowerCase(), section });
    res.json({ success: true, message: 'File metadata removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete metadata' });
  }
});

// PATCH /remark — mentor adds remark to a file
router.patch('/remark', requireRole('mentor'), async (req, res) => {
  const { db, usersCollection } = getCollections();
  const { menteeEmail, section, remark } = req.body;
  if (!menteeEmail || !section || !remark) return res.status(400).json({ success: false, message: 'menteeEmail, section and remark are required' });
  try {
    const assignment = await db.collection('assignments').findOne({ menteeEmail: menteeEmail.toLowerCase(), isArchived: { $ne: true } });
    if (!assignment || assignment.mentorEmail !== req.userEmail) return res.status(403).json({ success: false, message: 'You are not the assigned mentor for this mentee' });
    if (assignment.finalRemark) return res.status(403).json({ success: false, message: 'Project has been finalised. No further remarks can be added.' });
    const result = await db.collection(FILE_COL).updateOne({ uploaded_by: menteeEmail.toLowerCase(), section, isArchived: { $ne: true } }, { $set: { remark, updatedAt: new Date() } });
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'File not found for this section' });
    res.json({ success: true, message: 'Remark updated' });
    setImmediate(async () => {
      try {
        const mentee = await usersCollection.findOne({ email: menteeEmail.toLowerCase() });
        const phaseName = PHASE_LABELS[section] || section;
        await db.collection('notifications').insertOne({ recipientEmail: menteeEmail.toLowerCase(), recipientRole: 'mentee', message: `Your mentor added a remark on "${phaseName}": ${remark}`, read: false, createdAt: new Date() });
        if (mentee?.email) {
          await sendEmail({ to: mentee.email, ...remarkAddedEmail({ menteeName: mentee.name || menteeEmail, projectName: assignment.projectName || 'Your Project', phaseName, remark }) });
          if (remark.toLowerCase().includes('approved') || remark.toLowerCase().includes('approve'))
            await sendEmail({ to: mentee.email, ...phaseApprovedEmail({ menteeName: mentee.name || menteeEmail, projectName: assignment.projectName || 'Your Project', phaseName }) });
        }
      } catch (e) { console.error('[Email] remark trigger:', e.message); }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update remark' });
  }
});

module.exports = router;
