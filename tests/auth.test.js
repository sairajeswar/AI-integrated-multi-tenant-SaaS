const assert = require('assert');
const { initializeDatabase } = require('../server/db/database');
const { generateToken, verifyToken, hashPassword, verifyPassword } = require('../server/middleware/auth');
const AIService = require('../server/services/ai.service');

async function runAuthTests() {
  console.log('\n--- 🔑 SUITE 1: Authentication & Token Security Tests ---');
  
  // 1. Password Hashing and Verification
  const rawPass = 'UltraSecureMetallicPass2026!';
  const { hash, salt } = hashPassword(rawPass);
  
  assert.ok(hash && hash.length > 32, 'Password hash must be generated');
  assert.ok(salt && salt.length > 8, 'Salt must be generated');
  assert.strictEqual(verifyPassword(rawPass, salt, hash), true, 'Password verification must succeed with correct password');
  assert.strictEqual(verifyPassword('WrongPassword', salt, hash), false, 'Password verification must reject incorrect password');
  console.log('  ✔ Password hashing (scrypt) & salt verification passed');

  // 2. JWT Token Signing and Verification
  const userPayload = {
    id: 'user_test_99',
    email: 'test@silversaas.io',
    name: 'Test Executive',
    tenantId: 'tenant_apex',
    role: 'owner'
  };

  const token = generateToken(userPayload);
  assert.ok(token && token.split('.').length === 3, 'JWT must have 3 segments (header.payload.signature)');
  
  const decoded = verifyToken(token);
  assert.strictEqual(decoded.id, userPayload.id, 'Decoded user ID must match');
  assert.strictEqual(decoded.tenantId, userPayload.tenantId, 'Decoded tenant ID must match');
  assert.strictEqual(decoded.role, userPayload.role, 'Decoded role must match');
  assert.ok(decoded.exp > Math.floor(Date.now() / 1000), 'Token must have future expiration');
  console.log('  ✔ JWT creation, HMAC-SHA256 signature, and decoding verified');

  // 3. Tampered Token Rejection
  const parts = token.split('.');
  const tamperedPayload = Buffer.from(JSON.stringify({ ...userPayload, role: 'superadmin' })).toString('base64');
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  const tamperedDecoded = verifyToken(tamperedToken);
  assert.strictEqual(tamperedDecoded, null, 'Tampered token must be strictly rejected');
  console.log('  ✔ Tampered token cryptographically rejected');

  // 4. Invalid Token String Rejection
  assert.strictEqual(verifyToken('invalid.garbage.token'), null, 'Malformed token must return null');
  assert.strictEqual(verifyToken(''), null, 'Empty token must return null');
  console.log('  ✔ Malformed token handling verified');
}

module.exports = runAuthTests;
