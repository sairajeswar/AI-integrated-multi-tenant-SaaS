const assert = require('assert');
const CloudService = require('../server/services/cloud.service');
const { getDb } = require('../server/db/database');

async function runCloudIntegrationTests() {
  console.log('\n--- ☁️ SUITE 5: Cloud Storage & Webhook Pub/Sub Tests ---');
  const tenantId = 'tenant_apex';

  // 1. Cloud Telemetry & Health Metrics
  const telemetry = CloudService.getCloudTelemetry(tenantId);
  assert.ok(telemetry.provider, 'Cloud provider must be defined');
  assert.ok(telemetry.activeRegion, 'Active cloud region must be defined');
  assert.strictEqual(telemetry.status, 'healthy');
  assert.ok(telemetry.latencyMs > 0, 'Latency must be reported');
  assert.ok(typeof telemetry.metrics.usedStorageMB === 'number', 'Used storage must be numeric');
  console.log(`  ✔ Cloud telemetry verified: ${telemetry.provider} [${telemetry.activeRegion}], Latency: ${telemetry.latencyMs}ms, Storage: ${telemetry.metrics.usedStorageMB} MB`);

  // 2. Presigned Upload URL Generation
  const presigned = CloudService.generatePresignedUploadUrl(tenantId, {
    filename: 'Architectural_CAD_Drawing.step',
    mimeType: 'application/step',
    fileSize: 12582912
  });

  assert.ok(presigned.presignedUploadUrl.includes('https://'), 'Must generate HTTPS URL');
  assert.ok(presigned.presignedUploadUrl.includes('X-Amz-Signature='), 'Must include cryptographic signature');
  assert.ok(presigned.s3Key.startsWith(`tenants/${tenantId}/storage/`), 'S3 key must enforce strict tenant prefix');
  assert.ok(new Date(presigned.expiresAt) > new Date(), 'Presigned URL must have future expiration');
  console.log('  ✔ S3 Presigned Upload URL generated with HMAC-SHA256 signature');

  // 3. Register Cloud File in Catalog
  const registered = CloudService.registerCloudFile(tenantId, {
    filename: presigned.filename,
    fileSize: presigned.fileSize,
    mimeType: presigned.mimeType,
    s3Key: presigned.s3Key,
    bucketName: presigned.bucket,
    userName: 'Alex Rivera'
  });

  assert.ok(registered.id, 'File ID must be assigned');
  assert.strictEqual(registered.tenant_id, tenantId, 'File must be attached to tenant');
  assert.strictEqual(registered.filename, presigned.filename);
  console.log(`  ✔ Cloud file registered in multi-tenant catalog (${registered.filename})`);

  // 4. Cloud Pub/Sub Webhook Dispatch & Event Stream
  const event = CloudService.dispatchCloudEvent(tenantId, 'invoice.paid', {
    invoiceNumber: 'INV-2026-TEST',
    amount: 14040.00,
    paidAt: new Date().toISOString()
  });

  assert.ok(event.eventId, 'Event ID must be generated');
  assert.strictEqual(event.eventType, 'invoice.paid');
  assert.strictEqual(event.status, 'delivered');

  const db = getDb();
  const loggedEvent = db.prepare('SELECT * FROM cloud_audit_events WHERE id = ?').get(event.eventId);
  assert.ok(loggedEvent, 'Event must be logged in database audit trail');
  assert.strictEqual(loggedEvent.tenant_id, tenantId);
  console.log('  ✔ Cloud Pub/Sub Webhook event dispatched and recorded in audit stream');

  // 5. Delete Cloud File
  const deleted = CloudService.deleteCloudFile(tenantId, registered.id);
  assert.strictEqual(deleted, true, 'File deletion must succeed');
  const check = db.prepare('SELECT id FROM cloud_files WHERE id = ?').get(registered.id);
  assert.strictEqual(check, undefined, 'File must no longer exist in catalog');
  console.log('  ✔ Cloud file removal and cleanup verified');
}

module.exports = runCloudIntegrationTests;
