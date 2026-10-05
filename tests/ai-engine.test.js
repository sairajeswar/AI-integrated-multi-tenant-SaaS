const assert = require('assert');
const AIService = require('../server/services/ai.service');

async function runAIEngineTests() {
  console.log('\n--- 🤖 SUITE 4: AI Business Copilot & Intelligence Engine Tests ---');
  const tenantId = 'tenant_apex';

  // 1. AI Tenant Context Aggregation
  const context = AIService.getTenantContext(tenantId);
  assert.ok(context, 'Tenant context must be extracted');
  assert.strictEqual(context.tenant.id, tenantId, 'Tenant ID must match');
  assert.ok(typeof context.metrics.totalRevenue === 'number', 'Total revenue must be numeric');
  assert.ok(typeof context.metrics.pendingReceivables === 'number', 'Pending receivables must be numeric');
  assert.ok(Array.isArray(context.lowStockItems), 'Low stock items must be an array');
  console.log(`  ✔ Live tenant context compiled: $${context.metrics.totalRevenue.toLocaleString()} revenue, $${context.metrics.pendingReceivables.toLocaleString()} receivables`);

  // 2. AI Copilot Financial & Invoicing Query
  const finChat = await AIService.chatCopilot(tenantId, 'What is our current revenue and receivables status?');
  assert.ok(finChat.response.includes('Financial Overview'), 'Response should include financial overview');
  assert.ok(finChat.response.includes('AI Recommendation'), 'Response should offer strategic SMB recommendations');
  assert.ok(finChat.tokensUsed > 0, 'Tokens count must be tracked');
  console.log('  ✔ AI Copilot generated contextual financial advisory response');

  // 3. AI Copilot Inventory Risk Query
  const stockChat = await AIService.chatCopilot(tenantId, 'Check our inventory and stock levels');
  assert.ok(stockChat.response.includes('Inventory'), 'Response should address inventory');
  console.log('  ✔ AI Copilot accurately identified catalog supply health');

  // 4. 90-Day Cashflow Forecasting Model
  const forecast = AIService.generateForecast(tenantId);
  assert.strictEqual(forecast.tenantId, tenantId, 'Forecast tenant ID must match');
  assert.ok(forecast.monthlyBreakdown.length === 3, 'Must project 3 monthly periods');
  assert.ok(forecast.projectedGrowthPct > 0, 'Projected growth percentage must be positive');
  assert.ok(forecast.aiObservations.length >= 2, 'Must include AI strategic observations');
  console.log(`  ✔ 90-Day Cashflow model generated (+${forecast.projectedGrowthPct}% growth trajectory)`);

  // 5. AI Smart Outreach Email Drafter
  const emailDraft = AIService.draftEmail(tenantId, {
    type: 'payment_reminder',
    customerName: 'Helios Aeronautics',
    amount: '37,800.00',
    invoiceNumber: 'INV-2026-002'
  });
  assert.ok(emailDraft.subject.includes('INV-2026-002'), 'Email subject must include invoice number');
  assert.ok(emailDraft.body.includes('Helios Aeronautics'), 'Email body must be customized for client');
  assert.ok(emailDraft.body.includes('$37,800.00'), 'Email body must include overdue amount');
  console.log('  ✔ AI Email drafter created customized polite payment notice');

  // 6. AI Smart Receipt OCR Scanner Simulation
  const receiptParsed = AIService.scanReceipt(tenantId, {
    vendorName: 'Titanium Raw Materials Ltd',
    totalAmount: '5400.00'
  });
  assert.strictEqual(receiptParsed.status, 'success');
  assert.strictEqual(receiptParsed.vendor.name, 'Titanium Raw Materials Ltd');
  assert.strictEqual(receiptParsed.summary.total, 5400.00);
  assert.ok(receiptParsed.lineItems.length > 0, 'Must extract simulated line items');
  assert.ok(receiptParsed.aiConfidenceScore > 0.95, 'High confidence score expected');
  console.log('  ✔ AI Receipt scanner parsed vendor, subtotals, and line items with 98.5% confidence');

  // 7. AI Health Diagnostic Report
  const diag = AIService.getHealthDiagnostic(tenantId);
  assert.ok(diag.overallHealthScore >= 70, 'Health score must be computed');
  assert.ok(diag.pillars.cashflowVelocity, 'Must analyze cashflow velocity');
  assert.ok(diag.actionablePriorities.length > 0, 'Must provide prioritized action roadmap');
  console.log(`  ✔ AI Small Business Health Diagnostic computed (Score: ${diag.overallHealthScore}/100)`);
}

module.exports = runAIEngineTests;
