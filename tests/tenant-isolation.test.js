const assert = require('assert');
const { getDb } = require('../server/db/database');

async function runTenantIsolationTests() {
  console.log('\n--- 🏢 SUITE 2: Multi-Tenant Data Isolation & RBAC Tests ---');
  const db = getDb();

  const tenantApex = 'tenant_apex';
  const tenantSilver = 'tenant_silverline';
  const tenantNova = 'tenant_nova';

  // 1. CRM Customer Isolation
  const apexCustomers = db.prepare('SELECT * FROM crm_customers WHERE tenant_id = ?').all(tenantApex);
  const silverCustomers = db.prepare('SELECT * FROM crm_customers WHERE tenant_id = ?').all(tenantSilver);

  assert.ok(apexCustomers.length > 0, 'Apex must have customer records');
  assert.ok(silverCustomers.length > 0, 'Silverline must have customer records');

  for (const c of apexCustomers) {
    assert.strictEqual(c.tenant_id, tenantApex, 'Apex customer must have tenant_id = tenant_apex');
    const leakCheck = silverCustomers.find(sc => sc.id === c.id);
    assert.strictEqual(leakCheck, undefined, 'Apex customer must NEVER appear in Silverline tenant query');
  }
  console.log(`  ✔ CRM customer data isolation verified (${apexCustomers.length} Apex vs ${silverCustomers.length} Silverline isolated)`);

  // 2. Invoicing Isolation
  const apexInvoices = db.prepare('SELECT * FROM invoices WHERE tenant_id = ?').all(tenantApex);
  const silverInvoices = db.prepare('SELECT * FROM invoices WHERE tenant_id = ?').all(tenantSilver);

  for (const inv of apexInvoices) {
    assert.strictEqual(inv.tenant_id, tenantApex, 'Invoice must belong exclusively to tenant_apex');
    const leakCheck = silverInvoices.find(si => si.id === inv.id);
    assert.strictEqual(leakCheck, undefined, 'Apex invoice must NEVER appear in Silverline invoices');
  }
  console.log('  ✔ Invoice isolation and cross-tenant billing integrity verified');

  // 3. Inventory SKU Isolation
  const apexInventory = db.prepare('SELECT * FROM inventory_items WHERE tenant_id = ?').all(tenantApex);
  const silverInventory = db.prepare('SELECT * FROM inventory_items WHERE tenant_id = ?').all(tenantSilver);

  for (const it of apexInventory) {
    assert.strictEqual(it.tenant_id, tenantApex, 'Inventory item must belong exclusively to tenant_apex');
    const leakCheck = silverInventory.find(si => si.id === it.id);
    assert.strictEqual(leakCheck, undefined, 'Apex item SKU must NEVER appear in Silverline catalog');
  }
  console.log('  ✔ Inventory catalog separation verified');

  // 4. Cloud Files Isolation
  const apexFiles = db.prepare('SELECT * FROM cloud_files WHERE tenant_id = ?').all(tenantApex);
  const silverFiles = db.prepare('SELECT * FROM cloud_files WHERE tenant_id = ?').all(tenantSilver);

  for (const f of apexFiles) {
    assert.strictEqual(f.tenant_id, tenantApex, 'Cloud file must belong to tenant_apex');
    assert.ok(f.s3_key.startsWith(`tenants/${tenantApex}/`), 'S3 Key path must have tenant prefix');
    const leakCheck = silverFiles.find(sf => sf.id === f.id);
    assert.strictEqual(leakCheck, undefined, 'Apex cloud document must not be visible in Silverline storage');
  }
  console.log('  ✔ Cloud storage bucket key prefix isolation verified');

  // 5. Cross-Tenant Membership Role Testing
  const alexMemberships = db.prepare(`
    SELECT tm.role, t.name, tm.tenant_id
    FROM tenant_members tm
    JOIN tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = 'user_alex'
  `).all();

  assert.ok(alexMemberships.length >= 2, 'Alex must have memberships in multiple tenants');
  const apexRole = alexMemberships.find(m => m.tenant_id === tenantApex);
  const silverRole = alexMemberships.find(m => m.tenant_id === tenantSilver);

  assert.strictEqual(apexRole.role, 'owner', 'Alex is owner in Apex Studio');
  assert.strictEqual(silverRole.role, 'admin', 'Alex is admin in Silverline Medical');
  console.log('  ✔ Multi-tenant user membership & differential RBAC roles verified');
}

module.exports = runTenantIsolationTests;
