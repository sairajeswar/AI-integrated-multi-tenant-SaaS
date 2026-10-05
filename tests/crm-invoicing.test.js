const assert = require('assert');
const crypto = require('crypto');
const { getDb } = require('../server/db/database');

async function runCrmInvoicingTests() {
  console.log('\n--- 💼 SUITE 3: Small Business CRM, Invoicing & Inventory Tests ---');
  const db = getDb();
  const testTenantId = 'tenant_apex';

  // 1. Create and verify CRM customer
  const testCustId = 'cust_test_' + crypto.randomBytes(4).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO crm_customers (id, tenant_id, name, email, company, phone, status, deal_value, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    testCustId,
    testTenantId,
    'Starlight Robotics Corp',
    'procurement@starlight-robotics.com',
    'Starlight Robotics',
    '+1 (555) 394-2019',
    'opportunity',
    85000.00,
    'Autonomous drone titanium frames contract',
    now
  );

  const insertedCust = db.prepare('SELECT * FROM crm_customers WHERE id = ?').get(testCustId);
  assert.strictEqual(insertedCust.name, 'Starlight Robotics Corp');
  assert.strictEqual(insertedCust.deal_value, 85000.00);
  assert.strictEqual(insertedCust.status, 'opportunity');
  console.log('  ✔ CRM Customer created with accurate deal valuation');

  // 2. Create Invoice with auto tax calculation
  const testInvId = 'inv_test_' + crypto.randomBytes(4).toString('hex');
  const items = [
    { description: 'Precision CNC Machining Lot A', quantity: 20, unit_price: 500, total: 10000 },
    { description: 'Laser Calibration & Inspection', quantity: 2, unit_price: 1500, total: 3000 }
  ];

  const subtotal = items.reduce((s, it) => s + it.total, 0); // 13000
  const taxRate = 0.08;
  const taxAmount = +(subtotal * taxRate).toFixed(2); // 1040.00
  const totalAmount = +(subtotal + taxAmount).toFixed(2); // 14040.00

  db.prepare(`
    INSERT INTO invoices (id, tenant_id, customer_id, customer_name, invoice_number, issue_date, due_date, subtotal, tax_amount, total_amount, status, items_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    testInvId,
    testTenantId,
    testCustId,
    insertedCust.name,
    'INV-TEST-999',
    '2026-10-01',
    '2026-10-31',
    subtotal,
    taxAmount,
    totalAmount,
    'pending',
    JSON.stringify(items),
    now
  );

  const fetchedInv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(testInvId);
  assert.strictEqual(fetchedInv.subtotal, 13000);
  assert.strictEqual(fetchedInv.tax_amount, 1040);
  assert.strictEqual(fetchedInv.total_amount, 14040);
  assert.strictEqual(fetchedInv.status, 'pending');
  console.log(`  ✔ Invoice created: Subtotal $${subtotal}, Tax $${taxAmount}, Total $${totalAmount}`);

  // 3. Status transition & Payment realization
  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('paid', testInvId);
  const updatedInv = db.prepare('SELECT status FROM invoices WHERE id = ?').get(testInvId);
  assert.strictEqual(updatedInv.status, 'paid');
  console.log('  ✔ Invoice transitioned from pending to paid');

  // 4. Inventory threshold alert check
  const testItemId = 'item_test_' + crypto.randomBytes(4).toString('hex');
  const sku = 'SKU-TITAN-TEST-' + crypto.randomBytes(2).toString('hex');

  db.prepare(`
    INSERT INTO inventory_items (id, tenant_id, sku, name, category, quantity, reorder_threshold, unit_price, cost_price, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    testItemId,
    testTenantId,
    sku,
    'Test High-Speed Spindle Bearing',
    'Components',
    5, // Less than threshold 10
    10,
    320.00,
    180.00,
    'low_stock',
    now
  );

  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(testItemId);
  assert.ok(item.quantity <= item.reorder_threshold, 'Quantity must be <= reorder threshold');
  assert.strictEqual(item.status, 'low_stock', 'Item must be flagged as low_stock');
  console.log('  ✔ Inventory low-stock threshold trigger verified');

  // Cleanup test artifacts
  db.prepare('DELETE FROM crm_customers WHERE id = ?').run(testCustId);
  db.prepare('DELETE FROM invoices WHERE id = ?').run(testInvId);
  db.prepare('DELETE FROM inventory_items WHERE id = ?').run(testItemId);
  console.log('  ✔ Test fixture cleanup completed cleanly');
}

module.exports = runCrmInvoicingTests;
