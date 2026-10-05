# ⚡ AuraSilver SaaS — Multi-Tenant AI Platform for Small Business

> **Enterprise-grade, AI-Integrated Multi-Tenant Cloud Operating System for Small & Medium Businesses (SMBs)**  
> Crafted with an ultra-clean **Total Silver and White Theme** featuring polished metallic gradients, frosted glass, chrome accents, and pearlescent white backgrounds.

---

## 🌟 Key Features

### 🏢 1. True Multi-Tenant SaaS Architecture
- **Strict Cryptographic Data Isolation:** Every customer record, invoice, inventory item, AI query, cloud storage object, and audit log is strictly scoped by `tenant_id`.
- **Tenant Context Switcher:** Switch organizations on the fly with instantaneous JWT and session token refresh.
- **Role-Based Access Control (RBAC):** `Owner`, `Admin`, `Member`, and `Viewer` permission hierarchies with route guards.
- **Dynamic Tenant Provisioning:** Add new business organizations in seconds.

### 🎨 2. Total Silver & White Design System
- **Unique Aesthetic:** High-end brushed silver, platinum foils, frosted glass (`backdrop-filter: blur(12px)`), metallic specular highlights, and crisp pearlescent white backgrounds.
- **Accessible & High-Contrast:** Titanium and dark graphite typography (`#0f172a`, `#334155`) ensuring WCAG AAA legibility.
- **Dynamic SVG Vector Charts:** Custom-built zero-dependency silver gradient charts for cashflow and revenue velocity.

### 🔐 3. Full-Stack Authentication & Security
- **Salted Scrypt Password Hashing:** Cryptographically hardened passwords with random per-user salt.
- **HMAC-SHA256 JWT Tokens:** Tamper-proof, signed tokens with configurable expiration and tenant claim encoding.
- **Tenant Verification Middleware:** Prevents cross-tenant forged ID injections.

### 💼 4. Small Business Operational Hub
- **CRM & Client Pipeline:** Track leads, opportunities, deal values, and stage transitions (Lead ➔ Opportunity ➔ Active).
- **Smart Invoicing & Billing:** Generate invoices with automated tax rates, line-item totals, due-date tracking, and one-click "Mark as Paid".
- **Inventory & Supply Control:** Catalog items, SKU codes, automated safety buffer alerts, and instant stock counter adjustments (+/-).

### 🤖 5. Built-in AI Copilot & Business Intelligence
- **AI Business Assistant:** Context-aware conversational copilot that inspects live receivables, deal pipeline, and inventory status to recommend high-impact small business actions.
- **90-Day Predictive Cashflow Model:** Algorithmic forecasting with growth rate calculation and runway safety indicators.
- **AI Smart Email Drafter:** Auto-generates polite overdue payment notices, client proposals, and welcome emails with 1-click clipboard copy.
- **AI Smart Receipt & Expense OCR Scanner:** Simulates automated vendor, line items, and tax extraction.
- **AI Small Business Health Diagnostic:** Computes a comprehensive health score (0-100) across 4 pillars.

### ☁️ 6. Cloud Integration & Webhook Pub/Sub
- **AWS S3 / GCS Object Storage Connector:** Multi-tenant document browser with S3 Presigned Upload URL generation (`tenants/{tenant_id}/storage/...`) and 15-minute cryptographically signed expiration.
- **Cloud Pub/Sub Webhook Event Bus:** Emits and logs live business events (`invoice.paid`, `crm.customer_created`, `inventory.low_stock`).
- **Cloud Health & Multi-Region Telemetry:** Real-time roundtrip latency (20ms), storage quota meters, and instant cloud region switcher (`us-east-1`, `eu-west-1`, `ap-southeast-1`).

---

## 🚀 Quick Start Guide

### 1. Launch Platform
Double-click `start.bat` or run:

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Start server
npm start
```

Open your browser to: **`http://localhost:4000`**

---

## 🔑 Pre-Configured Demo Credentials (1-Click Login Available)

| Organization | User | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Apex Precision Studio** | Alex Rivera | `alex@apexprecision.com` | `admin123` | **Owner** |
| **Silverline Medical & Labs** | Dr. Elena Vance | `elena@silverline.med` | `demo123` | **Owner** |
| **Nova Global Freight** | Marcus Chen | `marcus@novafreight.com` | `demo123` | **Owner** |

*(You can also click **"Register New Business"** in the UI to provision your own tenant instantly).*

---

## 🧪 Automated Test Suite

Run the full suite of unit and integration tests:

```bash
npm test
```

### Test Coverage Highlights:
- **Suite 1:** Authentication & Token Security (Password scrypt hashing, JWT HMAC-SHA256, tampered token rejection).
- **Suite 2:** Multi-Tenant Data Isolation (Verifies zero data leakage between Apex and Silverline across CRM, Invoices, Inventory, and Cloud Files).
- **Suite 3:** Small Business CRM, Invoicing & Inventory (Calculations, status updates, safety threshold triggers).
- **Suite 4:** AI Business Copilot & Intelligence (Context extraction, 90-day cashflow forecast, receipt OCR, health diagnostic).
- **Suite 5:** Cloud Storage & Webhooks (Presigned URLs, tenant S3 keys, webhook audit logging).

---

## 📁 Project Structure

```
silver-saas-platform/
├── package.json               # Manifest & scripts
├── start.bat                  # 1-Click Windows launcher
├── README.md                  # Comprehensive platform documentation
├── server/
│   ├── index.js               # Express application entry point
│   ├── config.js              # Ports, JWT secrets, cloud configurations
│   ├── middleware/
│   │   └── auth.js            # JWT verification & tenant isolation guards
│   ├── db/
│   │   ├── database.js        # Native node:sqlite DatabaseSync connection
│   │   └── seedData.js        # Seed tenants, users, transactions
│   ├── services/
│   │   ├── ai.service.js      # Business AI Copilot & predictive engine
│   │   └── cloud.service.js   # Cloud storage presigned URLs & webhook bus
│   └── routes/
│       ├── auth.routes.js     # Register, Login, Me, Switch Tenant
│       ├── tenant.routes.js   # Tenant settings & RBAC team members
│       ├── crm.routes.js      # CRM customer pipeline endpoints
│       ├── invoice.routes.js  # Smart invoicing & billing calculations
│       ├── inventory.routes.js# Stock control & low-stock alerts
│       ├── ai.routes.js       # AI Copilot, forecast & OCR endpoints
│       └── cloud.routes.js    # Cloud telemetry, files & webhooks
├── public/
│   ├── index.html             # High-tech Silver & White UI layout
│   ├── css/
│   │   └── silver-theme.css   # Total silver and white design system
│   └── js/
│       ├── api.js             # REST client with JWT & tenant headers
│       ├── charts.js          # Dynamic SVG vector chart renderer
│       └── app.js             # Client SPA controller & reactive state
└── tests/
    ├── auth.test.js           # Security & token tests
    ├── tenant-isolation.test.js # Multi-tenant isolation integrity tests
    ├── crm-invoicing.test.js  # Business calculations & workflow tests
    ├── ai-engine.test.js      # AI Copilot & forecasting model tests
    ├── cloud-integration.test.js # Cloud storage & webhook event tests
    └── run-tests.js           # Master test runner
```

---

## 📄 License
MIT License. Built with ❤️ by Antigravity AI for modern small businesses.
