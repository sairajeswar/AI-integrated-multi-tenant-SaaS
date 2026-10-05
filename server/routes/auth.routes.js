const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db/database');
const {
  generateToken,
  hashPassword,
  verifyPassword,
  authenticateToken
} = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Creates a new user and provisions their first multi-tenant business organization
 */
router.post('/register', (req, res) => {
  const { email, name, password, organizationName, industry } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password are required.' });
  }

  const db = getDb();
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const userId = 'user_' + crypto.randomBytes(8).toString('hex');
  const tenantName = organizationName || `${name}'s Enterprises`;
  const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
  const tenantId = 'tenant_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  const { hash, salt } = hashPassword(password);

  try {
    // 1. Create User
    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt, avatar_color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email.toLowerCase().trim(), name, hash, salt, '#cbd5e1', now);

    // 2. Create Tenant
    db.prepare(`
      INSERT INTO tenants (id, name, slug, industry, currency, plan, cloud_region, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(tenantId, tenantName, slug, industry || 'Small Business', 'USD', 'pro', 'us-east-1', now, now);

    // 3. Assign Owner role
    db.prepare(`
      INSERT INTO tenant_members (tenant_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?)
    `).run(tenantId, userId, 'owner', now);

    // 4. Seed initial default welcome data for the new tenant
    db.prepare(`
      INSERT INTO crm_customers (id, tenant_id, name, email, company, phone, status, deal_value, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'cust_' + crypto.randomBytes(6).toString('hex'),
      tenantId,
      'Silverline Beta Client',
      'hello@silversaas-client.com',
      'Beta Client Co',
      '+1 (555) 019-2831',
      'active',
      12500.00,
      'Initial sample customer generated upon tenant provisioning.',
      now
    );

    const token = generateToken({
      id: userId,
      email: email.toLowerCase().trim(),
      name,
      tenantId,
      role: 'owner'
    });

    res.status(201).json({
      message: 'Account and organization provisioned successfully.',
      token,
      user: { id: userId, email: email.toLowerCase().trim(), name },
      tenant: { id: tenantId, name: tenantName, slug, role: 'owner' }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create user and tenant: ' + err.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns active tenant list
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isValid = verifyPassword(password, user.salt, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Fetch all tenants where user is a member
  const memberships = db.prepare(`
    SELECT t.id, t.name, t.slug, t.industry, t.plan, t.cloud_region, tm.role
    FROM tenant_members tm
    JOIN tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = ?
    ORDER BY tm.created_at ASC
  `).all(user.id);

  if (memberships.length === 0) {
    return res.status(403).json({ error: 'User does not belong to any active organization.' });
  }

  const activeTenant = memberships[0];

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: activeTenant.id,
    role: activeTenant.role
  });

  res.json({
    message: 'Authentication successful.',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarColor: user.avatar_color
    },
    activeTenant,
    availableTenants: memberships
  });
});

/**
 * GET /api/auth/me
 * Returns current authenticated profile and tenant context
 */
router.get('/me', authenticateToken, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);

  const memberships = db.prepare(`
    SELECT t.id, t.name, t.slug, t.industry, t.plan, t.cloud_region, tm.role
    FROM tenant_members tm
    JOIN tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = ?
  `).all(req.user.id);

  const currentTenant = memberships.find(m => m.id === req.tenantId) || memberships[0];

  res.json({
    user,
    currentTenant,
    role: req.tenantRole,
    availableTenants: memberships
  });
});

/**
 * POST /api/auth/switch-tenant
 * Switches tenant context and issues an updated JWT token
 */
router.post('/switch-tenant', authenticateToken, (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: 'Target tenantId is required.' });
  }

  const db = getDb();
  const membership = db.prepare(`
    SELECT t.id, t.name, t.slug, t.industry, t.plan, t.cloud_region, tm.role
    FROM tenant_members tm
    JOIN tenants t ON t.id = tm.tenant_id
    WHERE tm.tenant_id = ? AND tm.user_id = ?
  `).get(tenantId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'You are not a registered member of this organization.' });
  }

  const token = generateToken({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    tenantId: membership.id,
    role: membership.role
  });

  res.json({
    message: `Switched tenant context to ${membership.name}.`,
    token,
    activeTenant: membership
  });
});

module.exports = router;
