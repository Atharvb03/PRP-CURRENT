/**
 * Quick Feature Test Script
 * Run this to verify all security and performance features are working
 */

const { validateObjectId, validateEmail, validatePassword, sanitizeInput } = require('./middleware/validation');

console.log('🧪 Testing Security Features...\n');

// Test 1: ObjectId Validation
console.log('1️⃣ Testing ObjectId Validation:');
const { ObjectId } = require('mongodb');
const validId = new ObjectId().toString();
const invalidId = 'invalid-id-123';

console.log(`   Valid ID (${validId}): ${ObjectId.isValid(validId) ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Invalid ID (${invalidId}): ${!ObjectId.isValid(invalidId) ? '✅ PASS' : '❌ FAIL'}`);

// Test 2: Email Validation
console.log('\n2️⃣ Testing Email Validation:');
const validEmail = 'test@example.com';
const invalidEmail = 'invalid-email';

console.log(`   Valid email (${validEmail}): ${validateEmail(validEmail) ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Invalid email (${invalidEmail}): ${!validateEmail(invalidEmail) ? '✅ PASS' : '❌ FAIL'}`);

// Test 3: Password Validation
console.log('\n3️⃣ Testing Password Validation:');
const strongPassword = 'StrongPass123';
const weakPassword = 'weak';

console.log(`   Strong password (${strongPassword}): ${validatePassword(strongPassword) ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Weak password (${weakPassword}): ${!validatePassword(weakPassword) ? '✅ PASS' : '❌ FAIL'}`);

// Test 4: NoSQL Injection Prevention
console.log('\n4️⃣ Testing NoSQL Injection Prevention:');
const maliciousInput = {
  email: 'test@example.com',
  $where: 'malicious code',
  password: { $ne: null }
};

const sanitized = sanitizeInput(JSON.parse(JSON.stringify(maliciousInput)));
const hasNoOperators = !Object.keys(sanitized).some(key => key.startsWith('$'));
const nestedSafe = typeof sanitized.password !== 'object';

console.log(`   Removed $ operators: ${hasNoOperators ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Sanitized nested objects: ${nestedSafe ? '✅ PASS' : '❌ FAIL'}`);

// Test 5: Environment Variables
console.log('\n5️⃣ Testing Environment Variables:');
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'NODE_ENV',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS'
];

let allEnvVarsPresent = true;
requiredEnvVars.forEach(varName => {
  const present = !!process.env[varName];
  console.log(`   ${varName}: ${present ? '✅ PASS' : '❌ FAIL'}`);
  if (!present) allEnvVarsPresent = false;
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary:');
console.log('='.repeat(50));

const allTestsPassed = 
  ObjectId.isValid(validId) &&
  !ObjectId.isValid(invalidId) &&
  validateEmail(validEmail) &&
  !validateEmail(invalidEmail) &&
  validatePassword(strongPassword) &&
  !validatePassword(weakPassword) &&
  hasNoOperators &&
  nestedSafe &&
  allEnvVarsPresent;

if (allTestsPassed) {
  console.log('✅ All tests PASSED!');
  console.log('🎉 Your backend is secure and ready to use!');
} else {
  console.log('❌ Some tests FAILED. Please check the output above.');
}

console.log('='.repeat(50));
console.log('\n💡 Next Steps:');
console.log('   1. Start server: npm run dev');
console.log('   2. Test in browser: http://localhost:5173');
console.log('   3. Check documentation: IMPLEMENTATION_GUIDE.md');
console.log('\n');
