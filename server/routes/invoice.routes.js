const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const CloudService = require('../services/cloud.service');

router.use(authenticateToken);

/**
 * GET /api/invoices
 * List all invoices for active tenant
 */
router.get('/', (req, res) => {
  const { status } = req.query;
  const db = getDb();

  let query = 'SELECT * FROM invoices WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY issue_date DESC, created_at DESC';
  const invoices = db.prepare(query).all(...params);

  const formatted = invoices.map(inv => ({
    ...inv,
    items: JSON.parse(inv.items_json || '[]')
  }));

  res.json({ invoices: formatted });
});

/**
 * GET /api/invoices/financial-metrics
 * Aggregated financials for invoicing dashboard
 */
router.get('/financial-metrics', (req, res) => {
  const db = getDb();
  const invoices = db.prepare('SELECT status, subtotal, tax_amount, total_amount FROM invoices WHERE tenant_id = ?').all(req.tenantId);

  let totalRevenue = 0;
  let pendingReceivables = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const inv of invoices) {
    if (inv.status === 'paid') {
      totalRevenue += Number(inv.total_amount) || 0;
      paidCount++;
    } else {
      pendingReceivables += Number(inv.total_amount) || 0;
      pendingCount++;
    }
  }

  res.json({
    totalRevenue,
    pendingReceivables,
    totalInvoices: invoices.length,
    paidCount,
    pendingCount,
    collectionRatePct: invoices.length > 0 ? +((paidCount / invoices.length) * 100).toFixed(1) : 0
  });
});

/**
 * GET /api/invoices/:id
 * Retrieve specific invoice
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found in current organization.' });
  }

  res.json({
    ...invoice,
    items: JSON.parse(invoice.items_json || '[]')
  });
});

/**
 * POST /api/invoices
 * Create new invoice
 */
router.post('/', requireRole('owner', 'admin', 'member'), (req, res) => {
  const {
    customer_name,
    customer_id,
    invoice_number,
    issue_date,
    due_date,
    items,
    tax_rate = 0.08
  } = req.body;

  if (!customer_name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  const itemsList = Array.isArray(items) && items.length > 0 ? items : [
    { description: 'Standard Consulting / Professional Service', quantity: 1, unit_price: 1500, total: 1500 }
  ];

  let subtotal = 0;
  for (const item of itemsList) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    item.total = +(qty * price).toFixed(2);
    subtotal += item.total;
  }

  const taxAmount = +(subtotal * Number(tax_rate)).toFixed(2);
  const totalAmount = +(subtotal + taxAmount).toFixed(2);

  const id = 'inv_' + crypto.randomBytes(6).toString('hex');
  const invNumber = invoice_number || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];
  const dueStr = due_date || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

  const db = getDb();
  db.prepare(`
    INSERT INTO invoices (id, tenant_id, customer_id, customer_name, invoice_number, issue_date, due_date, subtotal, tax_amount, total_amount, status, items_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.tenantId,
    customer_id || null,
    customer_name,
    invNumber,
    issue_date || todayStr,
    dueStr,
    subtotal,
    taxAmount,
    totalAmount,
    'pending',
    JSON.stringify(itemsList),
    now
  );

  CloudService.dispatchCloudEvent(req.tenantId, 'invoice.created', {
    invoiceId: id,
    invoiceNumber: invNumber,
    customerName: customer_name,
    totalAmount
  });

  const created = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  res.status(201).json({
    message: 'Invoice created successfully.',
    invoice: {
      ...created,
      items: itemsList
    }
  });
});

/**
 * PATCH /api/invoices/:id/status
 * Update invoice payment status
 */
router.patch('/:id/status', requireRole('owner', 'admin', 'member'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['draft', 'pending', 'paid', 'overdue'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  db.prepare('UPDATE invoices SET status = ? WHERE id = ? AND tenant_id = ?').run(status, id, req.tenantId);

  // Cloud event dispatch
  CloudService.dispatchCloudEvent(req.tenantId, `invoice.${status}`, {
    invoiceId: id,
    invoiceNumber: invoice.invoice_number,
    customerName: invoice.customer_name,
    amount: invoice.total_amount
  });

  res.json({
    message: `Invoice status updated to ${status}.`,
    id,
    status
  });
});

/**
 * DELETE /api/invoices/:id
 * Delete invoice
 */
router.delete('/:id', requireRole('owner', 'admin'), (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  db.prepare('DELETE FROM invoices WHERE id = ? AND tenant_id = ?').run(id, req.tenantId);
  res.json({ message: 'Invoice removed.' });
});

module.exports = router;
