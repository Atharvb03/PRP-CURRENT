/**
 * routes/auth.js
 * Handles: signup, login, email verification, Google OAuth, profile completion, password reset, role availability
 */

const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const passport = require('passport');
const rateLimit = require('express-rate-limit');

const { getCollections } = require('../db');
const { generateToken }  = require('../utils/jwt');
const { verifyToken }    = require('../middleware/auth');
const { validateEmail, validatePassword } = require('../middleware/validation');
const { sendEmail, emailVerificationEmail, passwordResetOTPEmail } = require('../utils/emailService');
const { generateOTP, hashOTP, verifyOTP } = require('../utils/otpService');
const { COLLECTION: RESET_COL, OTP_EXPIRY_MINUTES, MAX_ATTEMPTS } = require('../models/passwordReset');
const { getRequestOrigin } = require('../config/cors');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  handler: (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', getRequestOrigin(req));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(429).json({ success: false, message: 'Too many authentication attempts, please try again later.' });
  },
});

// ── SIGNUP ────────────────────────────────────────────────────────────────────
router.post('/signup', authLimiter, async (req, res) => {
  const { getCollections: gc } = require('../db');
  const { db, usersCollection } = getCollections();
  try {
    const { name, email, password, role, rollNo, contactNo, inviteCode } = req.body;
    if (!name?.trim() || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'name, email, password and role are required' });
    if (!validateEmail(email))
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    if (!validatePassword(password))
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number' });

    const VALID_ROLES = ['mentee', 'mentor', 'project_coordinator', 'hod'];
    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role selected.' });

    if (role === 'mentor' && inviteCode?.trim() !== process.env.MENTOR_INVITE_CODE)
      return res.status(403).json({ success: false, message: 'Invalid invite code.' });
    if (role === 'project_coordinator' && inviteCode?.trim() !== process.env.COORD_CODE)
      return res.status(403).json({ success: false, message: 'Invalid invite code.' });
    if (role === 'hod') {
      const existingHOD = await usersCollection.findOne({ $or: [{ role: 'hod' }, { roles: 'hod' }] });
      if (existingHOD && inviteCode?.trim() !== process.env.HOD_CODE)
        return res.status(403).json({ success: false, message: 'HOD already exists. Contact administrator.' });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser    = await usersCollection.findOne({ email: normalizedEmail });
    const hashedPassword  = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    if (role === 'mentee') {
      if (existingUser) {
        if (!existingUser.isVerified) {
          const newToken = crypto.randomBytes(32).toString('hex');
          await usersCollection.updateOne({ email: normalizedEmail }, { $set: { verificationToken: newToken } });
          const verificationLink = `${process.env.FRONTEND_URL}/verify/${newToken}`;
          setImmediate(async () => {
            try {
              const tpl = emailVerificationEmail({ name: existingUser.name || name.trim(), verificationLink });
              await sendEmail({ to: normalizedEmail, ...tpl });
            } catch (e) { console.error('[Email] Re-send verification failed:', e.message); }
          });
          return res.status(200).json({ success: true, message: 'Account already exists but is not verified. A new verification email has been sent.', requiresVerification: true });
        }
        return res.status(400).json({ success: false, message: 'User already exists' });
      }
      await usersCollection.insertOne({ name: name.trim(), email: normalizedEmail, password: hashedPassword, role: 'mentee', roles: ['mentee'], rollNo: rollNo?.trim() || '', contactNo: contactNo?.toString().trim() || '', projectStatus: 'pending', isVerified: false, verificationToken, createdAt: new Date() });
      const verificationLink = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
      setImmediate(async () => {
        try {
          const tpl = emailVerificationEmail({ name: name.trim(), verificationLink });
          await sendEmail({ to: normalizedEmail, ...tpl });
        } catch (e) { console.error('[Email] Verification failed:', e.message); }
      });
      return res.status(201).json({ success: true, message: 'Account created! Please check your email to verify your account.', requiresVerification: true });
    }

    if (existingUser) {
      const passwordMatch = existingUser.password.startsWith('$2') ? await bcrypt.compare(password, existingUser.password) : existingUser.password === password;
      if (!passwordMatch) return res.status(400).json({ success: false, message: 'Email already registered with a different password.' });
      const currentRoles = existingUser.roles || [existingUser.role];
      if (currentRoles.includes(role)) return res.status(400).json({ success: false, message: `You are already registered as ${role}.` });
      await usersCollection.updateOne({ email: normalizedEmail }, { $addToSet: { roles: role } });
      const updatedRoles = [...currentRoles, role];
      const token = generateToken({ email: normalizedEmail, roles: updatedRoles, name: existingUser.name || '' }, role);
      return res.status(200).json({ success: true, message: `Role '${role}' added. Please re-login.`, token, roles: updatedRoles, requireReLogin: true });
    }

    await usersCollection.insertOne({ name: name.trim(), email: normalizedEmail, password: hashedPassword, role, roles: [role], isVerified: true, createdAt: new Date() });
    res.status(201).json({ success: true, message: 'Account created successfully. You can now log in.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  const { usersCollection } = getCollections();
  const { email, password, role } = req.body;
  const normalizedEmail = email.toLowerCase();
  try {
    const user = await usersCollection.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ success: false, message: 'User not found' });
    if (!user.password && user.authProvider === 'google')
      return res.status(400).json({ success: false, message: "This account uses Google Sign In. Please click 'Sign in with Google' instead.", googleOnly: true });

    let passwordValid = false;
    if (user.password.startsWith('$2')) passwordValid = await bcrypt.compare(password, user.password);
    else passwordValid = user.password === password;
    if (!passwordValid) return res.status(400).json({ success: false, message: 'Invalid password' });

    if (user.role === 'mentee' && user.isVerified === false)
      return res.status(403).json({ success: false, message: 'Please verify your email before logging in.', requiresVerification: true });

    const effectiveRoles = (user.roles?.length ? user.roles : null) || [user.role];
    if (role && !effectiveRoles.includes(role))
      return res.status(403).json({ success: false, message: `You are not registered as ${role}` });

    const staffRoles = effectiveRoles.filter(r => r !== 'mentee');
    const resolvedRole = role || (staffRoles.length > 0 ? staffRoles[0] : effectiveRoles[0]);
    const token = generateToken({ email: user.email, roles: effectiveRoles, name: user.name || '' }, resolvedRole);
    res.json({ success: true, token, role: resolvedRole, roles: effectiveRoles, name: user.name || '', email: user.email, userId: user._id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── EMAIL VERIFICATION ────────────────────────────────────────────────────────
router.get('/verify/:token', async (req, res) => {
  const { usersCollection } = getCollections();
  try {
    const user = await usersCollection.findOne({ verificationToken: req.params.token });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
    if (user.isVerified) return res.status(200).json({ success: true, message: 'Email already verified.', alreadyVerified: true });
    await usersCollection.updateOne({ _id: user._id }, { $set: { isVerified: true }, $unset: { verificationToken: '' } });
    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GOOGLE OAUTH ──────────────────────────────────────────────────────────────
const googleAuthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.get('/google/callback/test', (req, res) => {
  res.json({ success: true, message: 'Callback route is reachable', callbackURL: process.env.GOOGLE_CALLBACK_URL });
});

router.get('/google', googleAuthLimiter, (req, res, next) => {
  if (req.query.code && req.query.state && !req.query.role)
    return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=misconfigured_redirect`);
  const { role, accessCode } = req.query;
  const stateData = Buffer.from(JSON.stringify({ _prp: 'prp_v1', role: role || 'mentee', code: accessCode || null })).toString('base64');
  passport.authenticate('google', { scope: ['profile', 'email'], state: stateData, session: false })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=server_error`);
    if (!user) {
      const reason = info?.message === 'invalid_code' ? 'invalid_code' : 'google_auth_failed';
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=${reason}`);
    }
    try {
      const effectiveRoles = (user.roles?.length ? user.roles : null) || [user.role];
      const token = generateToken({ email: user.email, roles: effectiveRoles, name: user.name || '' }, user.role);
      if (user.needsProfile) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/callback#token=${token}&needsProfile=true&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`);
      }
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback#token=${token}&role=${user.role}&roles=${encodeURIComponent(JSON.stringify(effectiveRoles))}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`);
    } catch (tokenErr) {
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=server_error`);
    }
  })(req, res, next);
});

// ── PROFILE STATUS & COMPLETE PROFILE ────────────────────────────────────────
router.get('/auth/profile-status', verifyToken, async (req, res) => {
  const { usersCollection } = getCollections();
  try {
    const user = await usersCollection.findOne({ email: req.user.email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, needsProfile: !!user.needsProfile, role: user.role || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/auth/complete-profile', verifyToken, async (req, res) => {
  const { usersCollection } = getCollections();
  const { role, inviteCode, rollNo, contactNo } = req.body;
  const email = req.user?.email;
  if (!email) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const VALID_ROLES = ['mentee', 'mentor', 'project_coordinator', 'hod'];
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role selected.' });
  if (role === 'mentor' && inviteCode?.trim() !== process.env.MENTOR_INVITE_CODE) return res.status(403).json({ success: false, message: 'Invalid invite code for Mentor.' });
  if (role === 'project_coordinator' && inviteCode?.trim() !== process.env.COORD_CODE) return res.status(403).json({ success: false, message: 'Invalid invite code for Coordinator.' });
  if (role === 'hod' && inviteCode?.trim() !== process.env.HOD_CODE) return res.status(403).json({ success: false, message: 'Invalid invite code for HOD.' });
  try {
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (!user.needsProfile) return res.status(400).json({ success: false, message: 'Profile already completed.' });
    const update = { role, roles: [role], needsProfile: false };
    if (role === 'mentee') { update.rollNo = rollNo?.trim() || ''; update.contactNo = contactNo?.toString().trim() || ''; update.projectStatus = 'pending'; }
    await usersCollection.updateOne({ email: email.toLowerCase() }, { $set: update });
    const token = generateToken({ email: email.toLowerCase(), roles: [role], name: user.name || '' }, role);
    res.json({ success: true, role, token });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PASSWORD RESET ────────────────────────────────────────────────────────────
router.post('/password/forgot', async (req, res) => {
  const { db, usersCollection } = getCollections();
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
  const normalizedEmail = email.toLowerCase();
  try {
    const user = await usersCollection.findOne({ email: normalizedEmail });
    if (!user) return res.json({ success: true, message: 'If this email is registered, you will receive an OTP shortly.' });
    const resetCol = db.collection(RESET_COL);
    const existingReset = await resetCol.findOne({ email: normalizedEmail, expiresAt: { $gt: new Date() }, verified: false });
    if (existingReset) {
      const timeLeft = Math.ceil((existingReset.expiresAt - new Date()) / 1000 / 60);
      return res.status(429).json({ success: false, message: `An OTP was already sent. Please wait ${timeLeft} minute(s).` });
    }
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await resetCol.insertOne({ email: normalizedEmail, otp: hashedOTP, createdAt: new Date(), expiresAt, attempts: 0, verified: false });
    setImmediate(async () => {
      try {
        const tpl = passwordResetOTPEmail({ userName: user.name || normalizedEmail, otp });
        await sendEmail({ to: normalizedEmail, ...tpl });
      } catch (e) { console.error('[Email] Password reset OTP failed:', e.message); }
    });
    res.json({ success: true, message: 'OTP sent to your email. Valid for 5 minutes.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/password/verify-otp', authLimiter, async (req, res) => {
  const { db } = getCollections();
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  const normalizedEmail = email.toLowerCase();
  try {
    const resetCol = db.collection(RESET_COL);
    const resetDoc = await resetCol.findOne({ email: normalizedEmail, expiresAt: { $gt: new Date() }, verified: false });
    if (!resetDoc) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    if (resetDoc.attempts >= MAX_ATTEMPTS) {
      await resetCol.deleteOne({ _id: resetDoc._id });
      return res.status(403).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
    }
    if (!verifyOTP(otp, resetDoc.otp)) {
      await resetCol.updateOne({ _id: resetDoc._id }, { $inc: { attempts: 1 } });
      const attemptsLeft = MAX_ATTEMPTS - (resetDoc.attempts + 1);
      return res.status(400).json({ success: false, message: `Invalid OTP. ${attemptsLeft} attempt(s) remaining.` });
    }
    await resetCol.updateOne({ _id: resetDoc._id }, { $set: { verified: true } });
    res.json({ success: true, message: 'OTP verified successfully. You can now reset your password.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/password/reset', async (req, res) => {
  const { db, usersCollection } = getCollections();
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
  if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  const normalizedEmail = email.toLowerCase();
  try {
    const resetCol = db.collection(RESET_COL);
    const resetDoc = await resetCol.findOne({ email: normalizedEmail, expiresAt: { $gt: new Date() }, verified: true });
    if (!resetDoc) return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please verify OTP first.' });
    if (!verifyOTP(otp, resetDoc.otp)) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await usersCollection.updateOne({ email: normalizedEmail }, { $set: { password: hashedPassword } });
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'User not found' });
    await resetCol.deleteOne({ _id: resetDoc._id });
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── ROLE AVAILABILITY ─────────────────────────────────────────────────────────
router.get('/role-availability', async (req, res) => {
  const { usersCollection } = getCollections();
  try {
    const pcCount  = await usersCollection.countDocuments({ $or: [{ roles: 'project_coordinator' }, { role: 'project_coordinator', roles: { $exists: false } }] });
    const hodCount = await usersCollection.countDocuments({ $or: [{ roles: 'hod' }, { role: 'hod', roles: { $exists: false } }] });
    res.json({ success: true, data: { project_coordinator: { available: pcCount === 0, filled: pcCount > 0 }, hod: { available: hodCount === 0, filled: hodCount > 0 } } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
