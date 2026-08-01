import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { ApiService } from '../src/services/api.js';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

beforeEach(() => {
  globalThis.window = { dispatchEvent() {} };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});

test('adminLogin usa credenciales por cookie y conserva solo CSRF en memoria', async () => {
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return jsonResponse({
      user: { id: 'admin-1', role: 'admin' },
      csrfToken: 'csrf-value',
    });
  };
  const api = new ApiService();

  const result = await api.adminLogin('admin@example.com', 'Password9');

  assert.equal(calls[0][1].credentials, 'include');
  assert.equal(calls[0][1].headers.Authorization, undefined);
  assert.equal(api.csrfToken, 'csrf-value');
  assert.equal(result.token, undefined);
});

test('request agrega CSRF solo a metodos mutables y siempre incluye cookies', async () => {
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return jsonResponse({ ok: true });
  };
  const api = new ApiService();
  api.setCsrfToken('csrf-value');

  await api.request('/monuments/admin');
  await api.request('/monuments', { method: 'POST', body: '{}' });

  assert.equal(calls[0][1].credentials, 'include');
  assert.equal(calls[0][1].headers['X-CSRF-Token'], undefined);
  assert.equal(calls[1][1].credentials, 'include');
  assert.equal(calls[1][1].headers['X-CSRF-Token'], 'csrf-value');
  assert.equal(calls[1][1].headers.Authorization, undefined);
});

test('adminLogout acepta 204 y borra el CSRF mantenido en memoria', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 204, json: async () => null });
  const api = new ApiService();
  api.setCsrfToken('csrf-value');

  await api.adminLogout();

  assert.equal(api.csrfToken, null);
});

test('getAdminSession restaura usuario y renueva el CSRF mantenido en memoria', async () => {
  let requestOptions;
  globalThis.fetch = async (_url, options) => {
    requestOptions = options;
    return jsonResponse({ user: { id: 'admin-1', role: 'admin' }, csrfToken: 'renewed-csrf' });
  };
  const api = new ApiService();

  const session = await api.getAdminSession();

  assert.equal(requestOptions.method, 'GET');
  assert.equal(requestOptions.credentials, 'include');
  assert.equal(session.user.role, 'admin');
  assert.equal(api.csrfToken, 'renewed-csrf');
});

test('un 401 limpia CSRF y notifica la expiracion sin recargar la pagina', async () => {
  const events = [];
  globalThis.window = { dispatchEvent: (event) => events.push(event.type) };
  globalThis.fetch = async () => jsonResponse({ message: 'expired' }, 401);
  const api = new ApiService();
  api.setCsrfToken('stale-csrf');

  await assert.rejects(() => api.request('/monuments/admin'), /Sesi/);

  assert.equal(api.csrfToken, null);
  assert.deepEqual(events, ['historiar:session-expired']);
});
