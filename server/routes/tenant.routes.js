const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * GET /api/tenants/current
 * Return active tenant details
 */
router.get('/current', (req, res) => {
  const db = getDb();
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.tenantId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found.' });
  }

  res.json({
    tenant,
    currentRole: req.tenantRole
  });
});

/**
 * GET /api/tenants/members
 * List all members of the active tenant
 */
router.get('/members', (req, res) => {
  const db = getDb();
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, tm.role, tm.created_at
    FROM tenant_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.tenant_id = ?
    ORDER BY tm.created_at ASC
  `).all(req.tenantId);

  res.json({ members });
});

/**
 * POST /api/tenants/members
 * Add or invite member (Only Owner or Admin can add members)
 */
router.post('/members', requireRole('owner', 'admin'), (req, res) => {
  const { email, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Member email is required.' });
  }

  const validRoles = ['admin', 'member', 'viewer'];
  const targetRole = validRoles.includes(role) ? role : 'member';

  const db = getDb();
  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ error: 'User with this email does not exist in the platform. They must register first.' });
  }

  const existingMember = db.prepare('SELECT * FROM tenant_members WHERE tenant_id = ? AND user_id = ?').get(req.tenantId, user.id);
  if (existingMember) {
    return res.status(409).json({ error: 'User is already a member of this tenant.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO tenant_members (tenant_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?)
  `).run(req.tenantId, user.id, targetRole, now);

  res.status(201).json({
    message: `User ${user.email} added with role '${targetRole}'.`,
    member: { id: user.id, name: user.name, email: user.email, role: targetRole }
  });
});

/**
 * PUT /api/tenants/current
 * Update tenant settings (Only Owner or Admin)
 */
router.put('/current', requireRole('owner', 'admin'), (req, res) => {
  const { name, industry, cloud_region, plan } = req.body;
  const db = getDb();
  const now = new Date().toISOString();

  const current = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.tenantId);
  if (!current) {
    return res.status(404).json({ error: 'Tenant not found.' });
  }

  db.prepare(`
    UPDATE tenants
    SET name = ?, industry = ?, cloud_region = ?, plan = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name || current.name,
    industry || current.industry,
    cloud_region || current.cloud_region,
    plan || current.plan,
    now,
    req.tenantId
  );

  const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.tenantId);
  res.json({ message: 'Tenant settings updated.', tenant: updated });
});

/**
 * POST /api/tenants
 * Create an additional tenant organization for the current user
 */
router.post('/', (req, res) => {
  const { name, industry, cloud_region } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Organization name is required.' });
  }

  const db = getDb();
  const tenantId = 'tenant_' + crypto.randomBytes(6).toString('hex');
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30) + '-' + crypto.randomBytes(2).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tenants (id, name, slug, industry, currency, plan, cloud_region, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tenantId, name, slug, industry || 'Small Business', 'USD', 'pro', cloud_region || 'us-east-1', now, now);

  db.prepare(`
    INSERT INTO tenant_members (tenant_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?)
  `).run(tenantId, req.user.id, 'owner', now);

  res.status(201).json({
    message: 'New organization created successfully.',
    tenant: { id: tenantId, name, slug, role: 'owner' }
  });
});

module.exports = router;
