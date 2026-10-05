const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const CloudService = require('../services/cloud.service');

router.use(authenticateToken);

/**
 * GET /api/cloud/telemetry
 * Retrieve cloud health, multi-region status, storage metrics, and webhook logs
 */
router.get('/telemetry', (req, res) => {
  try {
    const telemetry = CloudService.getCloudTelemetry(req.tenantId);
    res.json(telemetry);
  } catch (err) {
    res.status(500).json({ error: 'Cloud telemetry retrieval failed: ' + err.message });
  }
});

/**
 * GET /api/cloud/files
 * List all cloud-stored files for current tenant
 */
router.get('/files', (req, res) => {
  const db = getDb();
  const files = db.prepare('SELECT * FROM cloud_files WHERE tenant_id = ? ORDER BY created_at DESC').all(req.tenantId);
  res.json({ files });
});

/**
 * POST /api/cloud/presigned-upload
 * Request presigned direct upload URL (S3 / GCS API standard)
 */
router.post('/presigned-upload', (req, res) => {
  const { filename, mimeType, fileSize } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required to generate presigned upload URL.' });
  }

  try {
    const presignedData = CloudService.generatePresignedUploadUrl(req.tenantId, {
      filename,
      mimeType,
      fileSize
    });
    res.json(presignedData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate presigned URL: ' + err.message });
  }
});

/**
 * POST /api/cloud/files
 * Register completed file into tenant cloud repository
 */
router.post('/files', (req, res) => {
  const { filename, fileSize, mimeType, s3Key, bucketName } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required.' });
  }

  try {
    const file = CloudService.registerCloudFile(req.tenantId, {
      filename,
      fileSize,
      mimeType,
      s3Key,
      bucketName,
      userName: req.user.name
    });
    res.status(201).json({ message: 'File registered to cloud store.', file });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register cloud file: ' + err.message });
  }
});

/**
 * DELETE /api/cloud/files/:id
 * Delete file from cloud storage
 */
router.delete('/files/:id', requireRole('owner', 'admin'), (req, res) => {
  const { id } = req.params;
  const success = CloudService.deleteCloudFile(req.tenantId, id);
  if (!success) {
    return res.status(404).json({ error: 'File not found or permission denied.' });
  }
  res.json({ message: 'Cloud file removed successfully.' });
});

/**
 * POST /api/cloud/test-webhook
 * Trigger test pub/sub webhook event
 */
router.post('/test-webhook', (req, res) => {
  const { eventType = 'cloud.test_ping' } = req.body;
  const event = CloudService.dispatchCloudEvent(req.tenantId, eventType, {
    initiatedBy: req.user.name,
    clientIp: req.ip || '127.0.0.1',
    note: 'Manual cloud webhook ping test from dashboard'
  });
  res.json({ message: 'Cloud webhook event dispatched.', event });
});

/**
 * POST /api/cloud/switch-region
 * Update cloud replication region
 */
router.post('/switch-region', requireRole('owner', 'admin'), (req, res) => {
  const { region } = req.body;
  const valid = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
  if (!valid.includes(region)) {
    return res.status(400).json({ error: `Invalid region. Must be one of: ${valid.join(', ')}` });
  }

  const db = getDb();
  db.prepare('UPDATE tenants SET cloud_region = ?, updated_at = ? WHERE id = ?').run(
    region,
    new Date().toISOString(),
    req.tenantId
  );

  CloudService.dispatchCloudEvent(req.tenantId, 'cloud.region_migrated', {
    newRegion: region,
    updatedBy: req.user.name
  });

  res.json({ message: `Cloud storage primary region updated to ${region}.`, region });
});

module.exports = router;
