// api.js - Fetch wrapper with auth cookie

const API = {
  async get(path) {
    const r = await fetch('/api' + path, { credentials: 'include' });
    if (r.status === 401) { window.location.href = '/login'; return null; }
    if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.detail || r.statusText); }
    return r.json();
  },

  async post(path, body) {
    const r = await fetch('/api' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (r.status === 401) { window.location.href = '/login'; return null; }
    if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.detail || r.statusText); }
    return r.json();
  },

  async put(path, body) {
    const r = await fetch('/api' + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (r.status === 401) { window.location.href = '/login'; return null; }
    if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.detail || r.statusText); }
    return r.json();
  },

  async del(path) {
    const r = await fetch('/api' + path, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (r.status === 401) { window.location.href = '/login'; return null; }
    if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.detail || r.statusText); }
    return r.json();
  },
};
