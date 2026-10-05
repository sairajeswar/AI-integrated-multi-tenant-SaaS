/**
 * SilverSaaS API Client
 * Manages JWT tokens, multi-tenant headers, and API operations
 */

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('silversaas_token') || null;
    this.tenantId = localStorage.getItem('silversaas_tenant_id') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('silversaas_token', token);
    } else {
      localStorage.removeItem('silversaas_token');
    }
  }

  setTenantId(tenantId) {
    this.tenantId = tenantId;
    if (tenantId) {
      localStorage.setItem('silversaas_tenant_id', tenantId);
    } else {
      localStorage.removeItem('silversaas_tenant_id');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : endpoint;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);

    if (response.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    this.setToken(data.token);
    if (data.activeTenant) {
      this.setTenantId(data.activeTenant.id);
    }
    return data;
  }

  async register(payload) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: payload
    });
    this.setToken(data.token);
    if (data.tenant) {
      this.setTenantId(data.tenant.id);
    }
    return data;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async switchTenant(tenantId) {
    const data = await this.request('/api/auth/switch-tenant', {
      method: 'POST',
      body: { tenantId }
    });
    this.setToken(data.token);
    this.setTenantId(tenantId);
    return data;
  }

  logout() {
    this.setToken(null);
    this.setTenantId(null);
    window.dispatchEvent(new CustomEvent('auth:logged_out'));
  }

  // Tenants
  async getCurrentTenant() {
    return this.request('/api/tenants/current');
  }

  async getTenantMembers() {
    return this.request('/api/tenants/members');
  }

  async addTenantMember(email, role) {
    return this.request('/api/tenants/members', {
      method: 'POST',
      body: { email, role }
    });
  }

  async updateTenantSettings(payload) {
    return this.request('/api/tenants/current', {
      method: 'PUT',
      body: payload
    });
  }

  async createTenant(name, industry, cloud_region) {
    return this.request('/api/tenants', {
      method: 'POST',
      body: { name, industry, cloud_region }
    });
  }

  // CRM
  async getCustomers(query = {}) {
    const params = new URLSearchParams(query).toString();
    return this.request(`/api/crm/customers?${params}`);
  }

  async getPipelineSummary() {
    return this.request('/api/crm/pipeline-summary');
  }

  async createCustomer(payload) {
    return this.request('/api/crm/customers', {
      method: 'POST',
      body: payload
    });
  }

  async updateCustomer(id, payload) {
    return this.request(`/api/crm/customers/${id}`, {
      method: 'PUT',
      body: payload
    });
  }

  async deleteCustomer(id) {
    return this.request(`/api/crm/customers/${id}`, {
      method: 'DELETE'
    });
  }

  // Invoices
  async getInvoices(status = '') {
    const q = status ? `?status=${status}` : '';
    return this.request(`/api/invoices${q}`);
  }

  async getFinancialMetrics() {
    return this.request('/api/invoices/financial-metrics');
  }

  async createInvoice(payload) {
    return this.request('/api/invoices', {
      method: 'POST',
      body: payload
    });
  }

  async updateInvoiceStatus(id, status) {
    return this.request(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      body: { status }
    });
  }

  async deleteInvoice(id) {
    return this.request(`/api/invoices/${id}`, {
      method: 'DELETE'
    });
  }

  // Inventory
  async getInventory(query = {}) {
    const params = new URLSearchParams(query).toString();
    return this.request(`/api/inventory?${params}`);
  }

  async getInventoryAlerts() {
    return this.request('/api/inventory/alerts');
  }

  async createInventoryItem(payload) {
    return this.request('/api/inventory', {
      method: 'POST',
      body: payload
    });
  }

  async updateInventoryItem(id, payload) {
    return this.request(`/api/inventory/${id}`, {
      method: 'PUT',
      body: payload
    });
  }

  async deleteInventoryItem(id) {
    return this.request(`/api/inventory/${id}`, {
      method: 'DELETE'
    });
  }

  // AI
  async chatCopilot(message, history = []) {
    return this.request('/api/ai/copilot', {
      method: 'POST',
      body: { message, history }
    });
  }

  async getAIForecast() {
    return this.request('/api/ai/forecast');
  }

  async draftEmail(payload) {
    return this.request('/api/ai/draft-email', {
      method: 'POST',
      body: payload
    });
  }

  async scanReceipt(payload) {
    return this.request('/api/ai/receipt-scan', {
      method: 'POST',
      body: payload
    });
  }

  async getHealthDiagnostic() {
    return this.request('/api/ai/health-diagnostic');
  }

  // Cloud
  async getCloudTelemetry() {
    return this.request('/api/cloud/telemetry');
  }

  async getCloudFiles() {
    return this.request('/api/cloud/files');
  }

  async getPresignedUploadUrl(filename, mimeType, fileSize) {
    return this.request('/api/cloud/presigned-upload', {
      method: 'POST',
      body: { filename, mimeType, fileSize }
    });
  }

  async registerCloudFile(payload) {
    return this.request('/api/cloud/files', {
      method: 'POST',
      body: payload
    });
  }

  async deleteCloudFile(id) {
    return this.request(`/api/cloud/files/${id}`, {
      method: 'DELETE'
    });
  }

  async testCloudWebhook(eventType) {
    return this.request('/api/cloud/test-webhook', {
      method: 'POST',
      body: { eventType }
    });
  }

  async switchCloudRegion(region) {
    return this.request('/api/cloud/switch-region', {
      method: 'POST',
      body: { region }
    });
  }
}

window.api = new ApiClient();
