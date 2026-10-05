/**
 * SilverSaaS Master Automated Test Runner
 * Executes all unit, integration, multi-tenant isolation, AI, and cloud test suites
 */

const { initializeDatabase } = require('../server/db/database');
const runAuthTests = require('./auth.test');
const runTenantIsolationTests = require('./tenant-isolation.test');
const runCrmInvoicingTests = require('./crm-invoicing.test');
const runAIEngineTests = require('./ai-engine.test');
const runCloudIntegrationTests = require('./cloud-integration.test');

async function main() {
  console.log('================================================================');
  console.log('⚡ AuraSilver SaaS Platform - Automated Test Suite');
  console.log('✨ Theme: Total Silver & White Metallic Aesthetics');
  console.log('🏢 Multi-Tenant: Cryptographic Isolation & RBAC Active');
  console.log('================================================================');

  const startTime = Date.now();
  let passedSuites = 0;
  let failedSuites = 0;

  // Initialize test database
  initializeDatabase();

  const suites = [
    { name: 'Authentication & Security', runner: runAuthTests },
    { name: 'Multi-Tenant Data Isolation & RBAC', runner: runTenantIsolationTests },
    { name: 'CRM, Invoicing & Inventory', runner: runCrmInvoicingTests },
    { name: 'AI Copilot & Intelligence Engine', runner: runAIEngineTests },
    { name: 'Cloud Integration & Webhooks', runner: runCloudIntegrationTests }
  ];

  for (const suite of suites) {
    try {
      await suite.runner();
      passedSuites++;
    } catch (err) {
      failedSuites++;
      console.error(`\n❌ FAILED SUITE: ${suite.name}`);
      console.error(err);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log('\n================================================================');
  console.log(`🏁 TEST EXECUTION SUMMARY (${durationMs}ms)`);
  console.log(`✅ Passed Suites: ${passedSuites} / ${suites.length}`);
  console.log(`❌ Failed Suites: ${failedSuites} / ${suites.length}`);

  if (failedSuites === 0) {
    console.log('\n🎉 ALL TEST CASES PASSED WITH 100% SUCCESS RATE!');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error('\n⚠️ SOME TESTS FAILED. PLEASE REVIEW LOGS.');
    console.log('================================================================\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
