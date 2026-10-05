const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');
const {
  seedTenants,
  seedUsers,
  seedMemberships,
  seedCustomers,
  seedInvoices,
  seedInventory,
  seedCloudFiles
} = require('./seedData');

let activeDb = null;

function initializeDatabase(dbPath = config.DB_PATH) {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  
  // Pragmas for performance and data integrity
  db.exec('PRAGMA foreign_keys = ON;');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      industry TEXT,
      currency TEXT DEFAULT 'USD',
      plan TEXT DEFAULT 'pro',
      cloud_region TEXT DEFAULT 'us-east-1',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#cbd5e1',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenant_members (
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, user_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS crm_customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      status TEXT DEFAULT 'lead',
      deal_value REAL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      items_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      reorder_threshold INTEGER NOT NULL DEFAULT 10,
      unit_price REAL NOT NULL DEFAULT 0.0,
      cost_price REAL NOT NULL DEFAULT 0.0,
      status TEXT DEFAULT 'in_stock',
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cloud_files (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      s3_key TEXT NOT NULL,
      bucket_name TEXT NOT NULL,
      cloud_provider TEXT DEFAULT 'AWS S3',
      sync_status TEXT DEFAULT 'synced',
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cloud_audit_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      delivery_status TEXT DEFAULT 'delivered',
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      prompt_type TEXT NOT NULL,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 120,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Create indexes for ultra-fast tenant-isolated queries
    CREATE INDEX IF NOT EXISTS idx_crm_tenant ON crm_customers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory_items(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_cloud_tenant ON cloud_files(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ai_tenant ON ai_logs(tenant_id);
  `);

  // Seed default data if database is brand new
  const countRow = db.prepare('SELECT COUNT(*) as count FROM tenants').get();
  if (countRow.count === 0) {
    seedDatabase(db);
  }

  activeDb = db;
  return db;
}

function seedDatabase(db) {
  const now = new Date().toISOString();

  // Tenants
  const insertTenant = db.prepare(`
    INSERT INTO tenants (id, name, slug, industry, currency, plan, cloud_region, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of seedTenants) {
    insertTenant.run(t.id, t.name, t.slug, t.industry, t.currency, t.plan, t.cloud_region, now, now);
  }

  // Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, name, password_hash, salt, avatar_color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of seedUsers) {
    insertUser.run(u.id, u.email, u.name, u.password_hash, u.salt, u.avatar_color, now);
  }

  // Memberships
  const insertMember = db.prepare(`
    INSERT INTO tenant_members (tenant_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?)
  `);
  for (const m of seedMemberships) {
    insertMember.run(m.tenant_id, m.user_id, m.role, now);
  }

  // Customers
  const insertCustomer = db.prepare(`
    INSERT INTO crm_customers (id, tenant_id, name, email, company, phone, status, deal_value, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of seedCustomers) {
    insertCustomer.run(c.id, c.tenant_id, c.name, c.email, c.company, c.phone, c.status, c.deal_value, c.notes, now);
  }

  // Invoices
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, tenant_id, customer_id, customer_name, invoice_number, issue_date, due_date, subtotal, tax_amount, total_amount, status, items_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const inv of seedInvoices) {
    insertInvoice.run(
      inv.id, inv.tenant_id, inv.customer_id, inv.customer_name,
      inv.invoice_number, inv.issue_date, inv.due_date,
      inv.subtotal, inv.tax_amount, inv.total_amount,
      inv.status, inv.items_json, now
    );
  }

  // Inventory
  const insertItem = db.prepare(`
    INSERT INTO inventory_items (id, tenant_id, sku, name, category, quantity, reorder_threshold, unit_price, cost_price, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const it of seedInventory) {
    insertItem.run(
      it.id, it.tenant_id, it.sku, it.name, it.category,
      it.quantity, it.reorder_threshold, it.unit_price, it.cost_price,
      it.status, now
    );
  }

  // Cloud Files
  const insertFile = db.prepare(`
    INSERT INTO cloud_files (id, tenant_id, filename, file_size, mime_type, s3_key, bucket_name, cloud_provider, sync_status, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const f of seedCloudFiles) {
    insertFile.run(
      f.id, f.tenant_id, f.filename, f.file_size, f.mime_type,
      f.s3_key, f.bucket_name, f.cloud_provider, f.sync_status,
      f.uploaded_by, now
    );
  }

  // Initial cloud audit event
  const insertEvent = db.prepare(`
    INSERT INTO cloud_audit_events (id, tenant_id, event_type, payload_json, delivery_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertEvent.run(
    'evt_init_1',
    'tenant_apex',
    'cloud.system_initialized',
    JSON.stringify({ region: 'us-east-1', status: 'optimal', storage_quota: '100GB' }),
    'delivered',
    now
  );
}

function getDb() {
  if (!activeDb) {
    return initializeDatabase();
  }
  return activeDb;
}

module.exports = {
  initializeDatabase,
  getDb
};
