const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const CloudService = require('../services/cloud.service');

router.use(authenticateToken);

/**
 * GET /api/crm/customers
 * List customers scoped strictly to the current tenant
 */
router.get('/customers', (req, res) => {
  const { status, search } = req.query;
  const db = getDb();

  let query = 'SELECT * FROM crm_customers WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY created_at DESC';
  const customers = db.prepare(query).all(...params);

  res.json({ customers });
});

/**
 * GET /api/crm/pipeline-summary
 * Get CRM pipeline statistics
 */
router.get('/pipeline-summary', (req, res) => {
  const db = getDb();
  const customers = db.prepare('SELECT status, deal_value FROM crm_customers WHERE tenant_id = ?').all(req.tenantId);

  const breakdown = {
    lead: { count: 0, value: 0 },
    opportunity: { count: 0, value: 0 },
    active: { count: 0, value: 0 },
    churned: { count: 0, value: 0 }
  };

  let totalPipelineValue = 0;

  for (const c of customers) {
    const val = Number(c.deal_value) || 0;
    totalPipelineValue += val;
    const st = c.status || 'lead';
    if (breakdown[st]) {
      breakdown[st].count++;
      breakdown[st].value += val;
    }
  }

  res.json({
    totalAccounts: customers.length,
    totalPipelineValue,
    breakdown
  });
});

/**
 * POST /api/crm/customers
 * Add customer (Requires at least member role)
 */
router.post('/customers', requireRole('owner', 'admin', 'member'), (req, res) => {
  const { name, email, company, phone, status, deal_value, notes } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Customer name and email are required.' });
  }

  const id = 'cust_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const db = getDb();

  db.prepare(`
    INSERT INTO crm_customers (id, tenant_id, name, email, company, phone, status, deal_value, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.tenantId,
    name,
    email,
    company || '',
    phone || '',
    status || 'lead',
    Number(deal_value) || 0.0,
    notes || '',
    now
  );

  CloudService.dispatchCloudEvent(req.tenantId, 'crm.customer_created', {
    customerId: id,
    name,
    company
  });

  const created = db.prepare('SELECT * FROM crm_customers WHERE id = ?').get(id);
  res.status(201).json({ message: 'Customer added successfully.', customer: created });
});

/**
 * PUT /api/crm/customers/:id
 * Update customer
 */
router.put('/customers/:id', requireRole('owner', 'admin', 'member'), (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const customer = db.prepare('SELECT * FROM crm_customers WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found in current organization.' });
  }

  const { name, email, company, phone, status, deal_value, notes } = req.body;

  db.prepare(`
    UPDATE crm_customers
    SET name = ?, email = ?, company = ?, phone = ?, status = ?, deal_value = ?, notes = ?
    WHERE id = ? AND tenant_id = ?
  `).run(
    name !== undefined ? name : customer.name,
    email !== undefined ? email : customer.email,
    company !== undefined ? company : customer.company,
    phone !== undefined ? phone : customer.phone,
    status !== undefined ? status : customer.status,
    deal_value !== undefined ? Number(deal_value) : customer.deal_value,
    notes !== undefined ? notes : customer.notes,
    id,
    req.tenantId
  );

  const updated = db.prepare('SELECT * FROM crm_customers WHERE id = ?').get(id);
  res.json({ message: 'Customer updated.', customer: updated });
});

/**
 * DELETE /api/crm/customers/:id
 * Delete customer (Owner or Admin only)
 */
router.delete('/customers/:id', requireRole('owner', 'admin'), (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const customer = db.prepare('SELECT * FROM crm_customers WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  db.prepare('DELETE FROM crm_customers WHERE id = ? AND tenant_id = ?').run(id, req.tenantId);
  res.json({ message: 'Customer deleted successfully.' });
});

module.exports = router;
