const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initializeDatabase } = require('./db/database');

const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const crmRoutes = require('./routes/crm.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const aiRoutes = require('./routes/ai.routes');
const cloudRoutes = require('./routes/cloud.routes');

const app = express();

// Initialize Database
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/cloud', cloudRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SilverSaaS Platform',
    version: '1.0.0',
    theme: 'Silver & White Platinum Edition',
    cloudProvider: config.CLOUD.DEFAULT_PROVIDER
  });
});

// Fallback for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API route ${req.method} ${req.path} not found.` });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Start listener only when run directly
if (require.main === module) {
  const server = app.listen(config.PORT, () => {
    console.log(`\n========================================================`);
    console.log(`✨ SilverSaaS Platform is running! ✨`);
    console.log(`🌐 Local URL: http://localhost:${config.PORT}`);
    console.log(`🎨 Theme: Total Silver & White Metallic Aesthetics`);
    console.log(`🏢 Multi-Tenant: Enabled (RBAC & Isolation)`);
    console.log(`🤖 AI Copilot & Cloud Engine: Online`);
    console.log(`========================================================\n`);
  });

  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
}

module.exports = app;
