const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

const defaultSalt = 'silversalt2026';
const demoPasswordHash = hashPassword('demo123', defaultSalt);
const adminPasswordHash = hashPassword('admin123', defaultSalt);

const seedTenants = [
  {
    id: 'tenant_apex',
    name: 'Apex Precision Studio',
    slug: 'apex-precision',
    industry: 'Engineering & Design',
    currency: 'USD',
    plan: 'enterprise',
    cloud_region: 'us-east-1'
  },
  {
    id: 'tenant_silverline',
    name: 'Silverline Medical & Labs',
    slug: 'silverline-med',
    industry: 'Healthcare Services',
    currency: 'USD',
    plan: 'pro',
    cloud_region: 'eu-west-1'
  },
  {
    id: 'tenant_nova',
    name: 'Nova Global Freight',
    slug: 'nova-freight',
    industry: 'Supply Chain & Logistics',
    currency: 'USD',
    plan: 'starter',
    cloud_region: 'ap-southeast-1'
  }
];

const seedUsers = [
  {
    id: 'user_alex',
    email: 'alex@apexprecision.com',
    name: 'Alex Rivera',
    password_hash: adminPasswordHash,
    salt: defaultSalt,
    avatar_color: '#cbd5e1'
  },
  {
    id: 'user_elena',
    email: 'elena@silverline.med',
    name: 'Dr. Elena Vance',
    password_hash: demoPasswordHash,
    salt: defaultSalt,
    avatar_color: '#94a3b8'
  },
  {
    id: 'user_marcus',
    email: 'marcus@novafreight.com',
    name: 'Marcus Chen',
    password_hash: demoPasswordHash,
    salt: defaultSalt,
    avatar_color: '#e2e8f0'
  }
];

const seedMemberships = [
  { tenant_id: 'tenant_apex', user_id: 'user_alex', role: 'owner' },
  { tenant_id: 'tenant_silverline', user_id: 'user_alex', role: 'admin' }, // Cross-tenant membership test
  { tenant_id: 'tenant_silverline', user_id: 'user_elena', role: 'owner' },
  { tenant_id: 'tenant_nova', user_id: 'user_marcus', role: 'owner' }
];

const seedCustomers = [
  // Tenant Apex
  {
    id: 'cust_apex_1',
    tenant_id: 'tenant_apex',
    name: 'Quantum Dynamics Ltd',
    email: 'procurement@quantumdyn.io',
    company: 'Quantum Dynamics',
    phone: '+1 (555) 234-8901',
    status: 'active',
    deal_value: 48500.00,
    notes: 'Long-term titanium CNC milling contract. Renewal upcoming in Q4.'
  },
  {
    id: 'cust_apex_2',
    tenant_id: 'tenant_apex',
    name: 'Helios Aeronautics',
    email: 'contracts@heliosaero.space',
    company: 'Helios Aeronautics',
    phone: '+1 (555) 492-7711',
    status: 'opportunity',
    deal_value: 72000.00,
    notes: 'Submitting CAD prototype quote for lightweight carbon alloy brackets.'
  },
  {
    id: 'cust_apex_3',
    tenant_id: 'tenant_apex',
    name: 'Orion Labs Robotic Solutions',
    email: 'ops@orionlabs.tech',
    company: 'Orion Labs',
    phone: '+1 (555) 781-9920',
    status: 'lead',
    deal_value: 19500.00,
    notes: 'Expressed interest via website AI chatbot.'
  },
  // Tenant Silverline
  {
    id: 'cust_silver_1',
    tenant_id: 'tenant_silverline',
    name: 'Nordic Health Network',
    email: 'billing@nordichealth.se',
    company: 'Nordic Health Network',
    phone: '+46 8 123 4567',
    status: 'active',
    deal_value: 34200.00,
    notes: 'Monthly pathology diagnostic services and MRI telemetry sync.'
  },
  {
    id: 'cust_silver_2',
    tenant_id: 'tenant_silverline',
    name: 'BioGen Research Institute',
    email: 'lab-ops@biogen-inst.org',
    company: 'BioGen Institute',
    phone: '+44 20 7946 0192',
    status: 'opportunity',
    deal_value: 58000.00,
    notes: 'Clinical trial patient specimen sequencing agreement.'
  },
  // Tenant Nova
  {
    id: 'cust_nova_1',
    tenant_id: 'tenant_nova',
    name: 'Pacific Cold Storage Co.',
    email: 'fleet@pacificcold.com',
    company: 'Pacific Cold Storage',
    phone: '+65 6789 0123',
    status: 'active',
    deal_value: 62000.00,
    notes: 'Refrigerated container route from Singapore to Tokyo.'
  }
];

const seedInvoices = [
  {
    id: 'inv_apex_101',
    tenant_id: 'tenant_apex',
    customer_id: 'cust_apex_1',
    customer_name: 'Quantum Dynamics Ltd',
    invoice_number: 'INV-2026-001',
    issue_date: '2026-09-15',
    due_date: '2026-10-15',
    subtotal: 24000.00,
    tax_amount: 1920.00,
    total_amount: 25920.00,
    status: 'paid',
    items_json: JSON.stringify([
      { description: 'Precision CNC 5-Axis Milling (Alloy 7075)', quantity: 40, unit_price: 450, total: 18000 },
      { description: 'Surface Anodization & Laser Micro-Etching', quantity: 40, unit_price: 150, total: 6000 }
    ])
  },
  {
    id: 'inv_apex_102',
    tenant_id: 'tenant_apex',
    customer_id: 'cust_apex_2',
    customer_name: 'Helios Aeronautics',
    invoice_number: 'INV-2026-002',
    issue_date: '2026-10-01',
    due_date: '2026-10-31',
    subtotal: 35000.00,
    tax_amount: 2800.00,
    total_amount: 37800.00,
    status: 'pending',
    items_json: JSON.stringify([
      { description: 'Avionics Housing Enclosure 3D Metal Print', quantity: 10, unit_price: 2500, total: 25000 },
      { description: 'Stress-Strain Thermal Simulation Analysis', quantity: 1, unit_price: 10000, total: 10000 }
    ])
  },
  {
    id: 'inv_silver_201',
    tenant_id: 'tenant_silverline',
    customer_id: 'cust_silver_1',
    customer_name: 'Nordic Health Network',
    invoice_number: 'MED-2026-88',
    issue_date: '2026-09-20',
    due_date: '2026-10-20',
    subtotal: 12500.00,
    tax_amount: 1000.00,
    total_amount: 13500.00,
    status: 'pending',
    items_json: JSON.stringify([
      { description: 'Batch Diagnostic Panel Screening (x250)', quantity: 250, unit_price: 40, total: 10000 },
      { description: 'Automated AI Cytology Analysis Report', quantity: 1, unit_price: 2500, total: 2500 }
    ])
  }
];

const seedInventory = [
  // Tenant Apex
  {
    id: 'item_apex_1',
    tenant_id: 'tenant_apex',
    sku: 'AL-7075-BAR',
    name: 'Aerospace Grade Aluminum 7075 Bar',
    category: 'Raw Materials',
    quantity: 145,
    reorder_threshold: 30,
    unit_price: 185.00,
    cost_price: 95.00,
    status: 'in_stock'
  },
  {
    id: 'item_apex_2',
    tenant_id: 'tenant_apex',
    sku: 'TI-GR5-PLATE',
    name: 'Titanium Grade 5 Alloy Plate 12mm',
    category: 'Raw Materials',
    quantity: 8,
    reorder_threshold: 15,
    unit_price: 620.00,
    cost_price: 380.00,
    status: 'low_stock'
  },
  {
    id: 'item_apex_3',
    tenant_id: 'tenant_apex',
    sku: 'END-CARB-6MM',
    name: 'Solid Carbide 4-Flute End Mill 6mm',
    category: 'Tooling',
    quantity: 42,
    reorder_threshold: 20,
    unit_price: 45.00,
    cost_price: 22.00,
    status: 'in_stock'
  },
  // Tenant Silverline
  {
    id: 'item_silver_1',
    tenant_id: 'tenant_silverline',
    sku: 'REAG-PCR-V4',
    name: 'High-Throughput PCR Reagent Kit 500rxn',
    category: 'Lab Supplies',
    quantity: 12,
    reorder_threshold: 20,
    unit_price: 890.00,
    cost_price: 520.00,
    status: 'low_stock'
  },
  {
    id: 'item_silver_2',
    tenant_id: 'tenant_silverline',
    sku: 'SPEC-VIAL-STER',
    name: 'Cryogenic Specimen Vials (Pack of 500)',
    category: 'Consumables',
    quantity: 120,
    reorder_threshold: 40,
    unit_price: 125.00,
    cost_price: 65.00,
    status: 'in_stock'
  }
];

const seedCloudFiles = [
  {
    id: 'file_apex_1',
    tenant_id: 'tenant_apex',
    filename: 'Q3_Precision_Manufacturing_Report.pdf',
    file_size: 4892011,
    mime_type: 'application/pdf',
    s3_key: 'tenants/tenant_apex/reports/2026/Q3_Precision.pdf',
    bucket_name: 'silversaas-cloud-store-us-east-1',
    cloud_provider: 'AWS S3',
    sync_status: 'synced',
    uploaded_by: 'Alex Rivera'
  },
  {
    id: 'file_apex_2',
    tenant_id: 'tenant_apex',
    filename: 'CAD_Enclosure_Design_v2.step',
    file_size: 14205882,
    mime_type: 'application/step',
    s3_key: 'tenants/tenant_apex/cad/CAD_Enclosure_Design_v2.step',
    bucket_name: 'silversaas-cloud-store-us-east-1',
    cloud_provider: 'AWS S3',
    sync_status: 'synced',
    uploaded_by: 'Alex Rivera'
  },
  {
    id: 'file_silver_1',
    tenant_id: 'tenant_silverline',
    filename: 'Diagnostic_Panel_Validation_2026.pdf',
    file_size: 2981044,
    mime_type: 'application/pdf',
    s3_key: 'tenants/tenant_silverline/compliance/Diagnostic_Validation.pdf',
    bucket_name: 'silversaas-cloud-store-eu-west-1',
    cloud_provider: 'AWS S3',
    sync_status: 'synced',
    uploaded_by: 'Dr. Elena Vance'
  }
];

module.exports = {
  seedTenants,
  seedUsers,
  seedMemberships,
  seedCustomers,
  seedInvoices,
  seedInventory,
  seedCloudFiles,
  hashPassword,
  defaultSalt
};
