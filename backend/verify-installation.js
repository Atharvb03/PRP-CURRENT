/**
 * Installation Verification Script
 * Checks if all required packages and configurations are in place
 */

require('dotenv').config();

console.log('\n🔍 Verifying Installation...\n');
console.log('='.repeat(60));

let allGood = true;

// Check 1: Required packages
console.log('\n📦 Checking Required Packages:');
const requiredPackages = [
  'helmet',
  'express-rate-limit',
  'express',
  'mongodb',
  'bcryptjs',
  'jsonwebtoken'
];

requiredPackages.forEach(pkg => {
  try {
    require.resolve(pkg);
    console.log(`   ✅ ${pkg}`);
  } catch (e) {
    console.log(`   ❌ ${pkg} - NOT INSTALLED`);
    allGood = false;
  }
});

// Check 2: New middleware files
console.log('\n📁 Checking New Files:');
const fs = require('fs');
const requiredFiles = [
  './middleware/validation.js',
  './middleware/errorHandler.js',
  './config/indexes.js'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allGood = false;
  }
});

// Check 3: Environment variables
console.log('\n🔐 Checking Environment Variables:');
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'NODE_ENV',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS'
];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName} = ${varName.includes('SECRET') || varName.includes('KEY') ? '***' : process.env[varName]}`);
  } else {
    console.log(`   ❌ ${varName} - NOT SET`);
    allGood = false;
  }
});

// Check 4: Test validation functions
console.log('\n🧪 Testing Validation Functions:');
try {
  const { validateEmail, validatePassword } = require('./middleware/validation');
  
  const emailTest = validateEmail('test@example.com');
  console.log(`   ${emailTest ? '✅' : '❌'} Email validation`);
  
  const passwordTest = validatePassword('StrongPass123');
  console.log(`   ${passwordTest ? '✅' : '❌'} Password validation`);
  
  if (!emailTest || !passwordTest) allGood = false;
} catch (e) {
  console.log(`   ❌ Validation functions error: ${e.message}`);
  allGood = false;
}

// Summary
console.log('\n' + '='.repeat(60));
if (allGood) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('\n🎉 Installation successful! Your backend is ready.');
  console.log('\n📝 Next steps:');
  console.log('   1. Start server: npm run dev');
  console.log('   2. Server will run on: http://localhost:5000');
  console.log('   3. Check logs for: "✅ Database indexes created successfully"');
  console.log('\n📚 Documentation:');
  console.log('   - INSTALLATION_SUCCESS.md - Quick start guide');
  console.log('   - IMPLEMENTATION_GUIDE.md - Detailed implementation');
  console.log('   - FIXES_SUMMARY.md - All fixes applied');
  console.log('   - DEPLOYMENT_CHECKLIST.md - Production deployment');
} else {
  console.log('❌ SOME CHECKS FAILED!');
  console.log('\n🔧 Please fix the issues above and run this script again.');
  console.log('\n💡 Common fixes:');
  console.log('   - Missing packages: npm install helmet express-rate-limit --legacy-peer-deps');
  console.log('   - Missing .env vars: Copy from .env.example');
  console.log('   - Missing files: Check if all new files were created');
}
console.log('='.repeat(60) + '\n');

process.exit(allGood ? 0 : 1);
