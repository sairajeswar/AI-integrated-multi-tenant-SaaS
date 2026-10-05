const crypto = require('crypto');
const config = require('../config');
const { getDb } = require('../db/database');

// URL-safe Base64 encode/decode
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// Sign and generate JWT token
function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + (config.JWT_EXPIRES_IN_HOURS * 3600);
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', config.JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Verify JWT token
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', config.JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch (err) {
    return null;
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === expectedHash;
}

// Authentication & Tenant isolation middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Missing bearer authorization token.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired authorization token.' });
  }

  req.user = payload;
  const db = getDb();

  // Tenant resolution:
  // 1. Header 'x-tenant-id' (explicit tenant context requested by client)
  // 2. Or token's current tenant context
  const requestedTenantId = req.headers['x-tenant-id'] || payload.tenantId;

  if (!requestedTenantId) {
    // If user has memberships, find the first one
    const firstMembership = db.prepare(`
      SELECT tenant_id, role FROM tenant_members WHERE user_id = ? LIMIT 1
    `).get(payload.id);

    if (firstMembership) {
      req.tenantId = firstMembership.tenant_id;
      req.tenantRole = firstMembership.role;
    } else {
      req.tenantId = null;
      req.tenantRole = null;
    }
  } else {
    // Verify membership in requested tenant
    const membership = db.prepare(`
      SELECT tm.role, t.name, t.slug, t.plan, t.cloud_region
      FROM tenant_members tm
      JOIN tenants t ON t.id = tm.tenant_id
      WHERE tm.tenant_id = ? AND tm.user_id = ?
    `).get(requestedTenantId, payload.id);

    if (!membership) {
      return res.status(403).json({
        error: `Tenant access forbidden. User is not a member of organization '${requestedTenantId}'.`
      });
    }

    req.tenantId = requestedTenantId;
    req.tenantRole = membership.role;
    req.tenantMeta = membership;
  }

  next();
}

// RBAC Role guard middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.tenantRole || !allowedRoles.includes(req.tenantRole)) {
      return res.status(403).json({
        error: `Insufficient permissions. Required role: [${allowedRoles.join(', ')}]. Current role: '${req.tenantRole || 'none'}'.`
      });
    }
    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  authenticateToken,
  requireRole
};
