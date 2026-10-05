const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const AIService = require('../services/ai.service');

router.use(authenticateToken);

/**
 * POST /api/ai/copilot
 * Interactive SMB Business Assistant Chat
 */
router.post('/copilot', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message prompt is required.' });
  }

  try {
    const result = await AIService.chatCopilot(req.tenantId, message, history);

    // Save interaction log to database
    const db = getDb();
    const logId = 'ai_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO ai_logs (id, tenant_id, user_id, prompt_type, query, response, tokens_used, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(logId, req.tenantId, req.user.id, 'copilot', message, result.response, result.tokensUsed || 140, now);

    res.json(result);
  } catch (err) {
    console.error('AI Copilot error:', err);
    res.status(500).json({ error: 'Failed to process AI Copilot request: ' + err.message });
  }
});

/**
 * GET /api/ai/forecast
 * Generate 90-day AI cashflow and revenue predictive forecast
 */
router.get('/forecast', (req, res) => {
  try {
    const forecast = AIService.generateForecast(req.tenantId);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: 'Forecast calculation failed: ' + err.message });
  }
});

/**
 * POST /api/ai/draft-email
 * Generate tailored professional client email drafts
 */
router.post('/draft-email', (req, res) => {
  const { type, customerName, amount, invoiceNumber, customPrompt } = req.body;
  try {
    const draft = AIService.draftEmail(req.tenantId, {
      type,
      customerName,
      amount,
      invoiceNumber,
      customPrompt
    });
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: 'Email drafting failed: ' + err.message });
  }
});

/**
 * POST /api/ai/receipt-scan
 * Extract line items, vendor, taxes from document receipt
 */
router.post('/receipt-scan', (req, res) => {
  const { textSample, vendorName, totalAmount } = req.body;
  try {
    const parsed = AIService.scanReceipt(req.tenantId, {
      textSample,
      vendorName,
      totalAmount
    });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Receipt scan failed: ' + err.message });
  }
});

/**
 * GET /api/ai/health-diagnostic
 * Comprehensive AI Small Business Health Diagnostic Report
 */
router.get('/health-diagnostic', (req, res) => {
  try {
    const report = AIService.getHealthDiagnostic(req.tenantId);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Health diagnostic failed: ' + err.message });
  }
});

/**
 * GET /api/ai/logs
 * Retrieve recent AI tenant history
 */
router.get('/logs', (req, res) => {
  const db = getDb();
  const logs = db.prepare(`
    SELECT id, prompt_type, query, response, tokens_used, created_at
    FROM ai_logs
    WHERE tenant_id = ?
    ORDER BY created_at DESC LIMIT 20
  `).all(req.tenantId);

  res.json({ logs });
});

module.exports = router;
