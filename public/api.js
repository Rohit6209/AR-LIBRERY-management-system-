// api.js — A.R. Library Frontend API Layer
// Place this file in your project folder and include it BEFORE the main script

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api'; // same server in production

// ══ Generic fetch wrapper ══════════════════════════════════════
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Server error');
    return data;
  } catch (err) {
    console.error('API Error:', err.message);
    throw err;
  }
}

// ══ MEMBERS ═══════════════════════════════════════════════════
const API = {

  // Health check
  async health() {
    return apiFetch('/health');
  },

  // Members
  async getMembers() {
    const r = await apiFetch('/members');
    return r.data || [];
  },
  async getMember(id) {
    const r = await apiFetch('/members/' + id);
    return r.data;
  },
  async addMember(data) {
    return apiFetch('/members', { method: 'POST', body: data });
  },
  async updateMember(id, data) {
    return apiFetch('/members/' + id, { method: 'PUT', body: data });
  },
  async deleteMember(id, adminPassword) {
    return apiFetch('/members/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },
  async getSeatsMap() {
    const r = await apiFetch('/members/seats/map');
    return r.data || [];
  },
  async autoExpire() {
    return apiFetch('/members/auto-expire', { method: 'POST' });
  },

  // Fee Structure
  async getFeeStructure() {
    const r = await apiFetch('/fees/structure/all');
    // Convert array to object format expected by frontend
    const fs = {};
    (r.data || []).forEach(row => {
      if (!fs[row.plan]) fs[row.plan] = {};
      fs[row.plan][row.shift] = Number(row.amount);
    });
    return fs;
  },
  async updateFeeStructure(plan, shift, amount) {
    return apiFetch('/fees/structure/update', {
      method: 'PUT',
      body: { plan, shift, amount }
    });
  },

  // Fee Records
  async getFeeRecords(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    const r = await apiFetch('/fees' + (q ? '?' + q : ''));
    return r.data || [];
  },
  async collectFee(data) {
    return apiFetch('/fees', { method: 'POST', body: data });
  },
  async deleteFeeRecord(id, adminPassword) {
    return apiFetch('/fees/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },
  async getDues() {
    const r = await apiFetch('/fees/dues/list');
    return r.data || [];
  },

  // Attendance
  async getAttendance(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    const r = await apiFetch('/attendance' + (q ? '?' + q : ''));
    return r.data || [];
  },
  async checkIn(data) {
    return apiFetch('/attendance/checkin', { method: 'POST', body: data });
  },
  async checkOut(data) {
    return apiFetch('/attendance/checkout', { method: 'POST', body: data });
  },
  async deleteAttendance(id) {
    return apiFetch('/attendance/' + id, { method: 'DELETE' });
  },

  // Notices
  async getNotices() {
    const r = await apiFetch('/notices');
    return r.data || [];
  },
  async addNotice(data) {
    return apiFetch('/notices', { method: 'POST', body: data });
  },
  async deleteNotice(id, adminPassword) {
    return apiFetch('/notices/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },

  // Expenses
  async getExpenses(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    const r = await apiFetch('/expenses' + (q ? '?' + q : ''));
    return r.data || [];
  },
  async addExpense(data) {
    return apiFetch('/expenses', { method: 'POST', body: data });
  },
  async deleteExpense(id, adminPassword) {
    return apiFetch('/expenses/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },

  // Employees & Salary
  async getEmployees() {
    const r = await apiFetch('/salary/employees');
    return r.data || [];
  },
  async addEmployee(data) {
    return apiFetch('/salary/employees', { method: 'POST', body: data });
  },
  async deleteEmployee(id, adminPassword) {
    return apiFetch('/salary/employees/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
  },
  async getSalaryRecords(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    const r = await apiFetch('/salary/records' + (q ? '?' + q : ''));
    return r.data || [];
  },
  async paySalary(data) {
    return apiFetch('/salary/pay', { method: 'POST', body: data });
  },

  // Dashboard & Reports
  async getDashboard() {
    const r = await apiFetch('/reports/dashboard');
    return r.data || {};
  },
  async getPL(month) {
    const q = month ? '?month=' + encodeURIComponent(month) : '';
    const r = await apiFetch('/reports/pl' + q);
    return r.data || {};
  },

  // Backup & Restore
  async getBackup() {
    const r = await apiFetch('/reports/backup');
    return r.data || {};
  },
  async restoreBackup(data, adminPassword) {
    return apiFetch('/reports/restore', {
      method: 'POST',
      body: data,
      headers: { 'x-admin-password': adminPassword }
    });
  }
};

window.AR_API = API;
console.log('✅ A.R. Library API layer loaded — connected to', API_BASE);
                                 

// ══ SETTINGS ══════════════════════════════════════════════════
Object.assign(window.AR_API, {
  async getSettings() {
    const r = await apiFetch('/settings');
    return r.data || {};
  },
  async saveSetting(key, value, adminPassword) {
    return apiFetch('/settings/' + key, {
      method: 'PUT',
      body: { value },
      headers: { 'x-admin-password': adminPassword }
    });
  },
  async saveSettings(settings, adminPassword) {
    return apiFetch('/settings', {
      method: 'PUT',
      body: settings,
      headers: { 'x-admin-password': adminPassword }
    });
  }
});
