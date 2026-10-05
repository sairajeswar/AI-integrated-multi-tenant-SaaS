const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const CloudService = require('../services/cloud.service');

router.use(authenticateToken);

/**
 * GET /api/inventory
 * List inventory items for current tenant
 */
router.get('/', (req, res) => {
  const { lowStockOnly, category } = req.query;
  const db = getDb();

  let query = 'SELECT * FROM inventory_items WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (lowStockOnly === 'true') {
    query += ' AND quantity <= reorder_threshold';
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY name ASC';
  const items = db.prepare(query).all(...params);

  res.json({ items });
});

/**
 * GET /api/inventory/alerts
 * Summary of stock alerts
 */
router.get('/alerts', (req, res) => {
  const db = getDb();
  const lowStock = db.prepare(`
    SELECT * FROM inventory_items
    WHERE tenant_id = ? AND quantity <= reorder_threshold
    ORDER BY quantity ASC
  `).all(req.tenantId);

  const totalCatalogItems = db.prepare('SELECT COUNT(*) as count FROM inventory_items WHERE tenant_id = ?').get(req.tenantId);

  res.json({
    totalItems: totalCatalogItems.count,
    lowStockCount: lowStock.length,
    alerts: lowStock
  });
});

/**
 * POST /api/inventory
 * Add inventory item
 */
router.post('/', requireRole('owner', 'admin', 'member'), (req, res) => {
  const {
    sku,
    name,
    category,
    quantity = 0,
    reorder_threshold = 10,
    unit_price = 0,
    cost_price = 0
  } = req.body;

  if (!sku || !name) {
    return res.status(400).json({ error: 'SKU and item name are required.' });
  }

  const db = getDb();
  const existingSku = db.prepare('SELECT id FROM inventory_items WHERE tenant_id = ? AND sku = ?').get(req.tenantId, sku);
  if (existingSku) {
    return res.status(409).json({ error: `An item with SKU '${sku}' already exists in your inventory.` });
  }

  const id = 'item_' + crypto.randomBytes(6).toString('hex');
  const qty = Number(quantity) || 0;
  const thresh = Number(reorder_threshold) || 10;
  const status = qty === 0 ? 'out_of_stock' : (qty <= thresh ? 'low_stock' : 'in_stock');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO inventory_items (id, tenant_id, sku, name, category, quantity, reorder_threshold, unit_price, cost_price, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.tenantId,
    sku,
    name,
    category || 'General',
    qty,
    thresh,
    Number(unit_price) || 0,
    Number(cost_price) || 0,
    status,
    now
  );

  const created = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
  res.status(201).json({ message: 'Inventory item added.', item: created });
});

/**
 * PUT /api/inventory/:id
 * Update inventory item or adjust stock
 */
router.put('/:id', requireRole('owner', 'admin', 'member'), (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
  if (!item) {
    return res.status(404).json({ error: 'Inventory item not found.' });
  }

  const { sku, name, category, quantity, reorder_threshold, unit_price, cost_price } = req.body;

  const targetQty = quantity !== undefined ? Number(quantity) : item.quantity;
  const targetThreshold = reorder_threshold !== undefined ? Number(reorder_threshold) : item.reorder_threshold;
  const targetStatus = targetQty === 0 ? 'out_of_stock' : (targetQty <= targetThreshold ? 'low_stock' : 'in_stock');

  db.prepare(`
    UPDATE inventory_items
    SET sku = ?, name = ?, category = ?, quantity = ?, reorder_threshold = ?, unit_price = ?, cost_price = ?, status = ?
    WHERE id = ? AND tenant_id = ?
  `).run(
    sku !== undefined ? sku : item.sku,
    name !== undefined ? name : item.name,
    category !== undefined ? category : item.category,
    targetQty,
    targetThreshold,
    unit_price !== undefined ? Number(unit_price) : item.unit_price,
    cost_price !== undefined ? Number(cost_price) : item.cost_price,
    targetStatus,
    id,
    req.tenantId
  );

  if (targetStatus === 'low_stock') {
    CloudService.dispatchCloudEvent(req.tenantId, 'inventory.low_stock', {
      sku: item.sku,
      name: item.name,
      remaining: targetQty,
      threshold: targetThreshold
    });
  }

  const updated = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
  res.json({ message: 'Inventory item updated.', item: updated });
});

/**
 * DELETE /api/inventory/:id
 * Remove item
 */
router.delete('/:id', requireRole('owner', 'admin'), (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  db.prepare('DELETE FROM inventory_items WHERE id = ? AND tenant_id = ?').run(id, req.tenantId);
  res.json({ message: 'Inventory item deleted.' });
});

module.exports = router;
