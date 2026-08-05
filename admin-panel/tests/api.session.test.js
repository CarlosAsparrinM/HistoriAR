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

test('operaciones administrativas críticas usan ruta, método, cookie y CSRF esperados', async () => {
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return jsonResponse({ ok: true });
  };
  const api = new ApiService();
  api.setCsrfToken('csrf-value');

  await api.updateMonument('monument-1', { name: 'Nuevo nombre' });
  await api.deleteInstitution('institution-1');
  await api.updateUser('user-1', { status: 'Suspendido' });
  await api.activateModelVersion('monument-1', 'version-1');
  await api.reorderHistoricalData('monument-1', [{ id: 'entry-1', order: 0 }]);

  assert.deepEqual(calls.map(([, options]) => options.method), ['PUT', 'DELETE', 'PUT', 'POST', 'PUT']);
  assert.match(calls[0][0], /\/monuments\/monument-1$/);
  assert.match(calls[1][0], /\/institutions\/institution-1$/);
  assert.match(calls[2][0], /\/users\/user-1$/);
  assert.match(calls[3][0], /\/monuments\/monument-1\/model-versions\/version-1\/activate$/);
  assert.match(calls[4][0], /\/monuments\/monument-1\/historical-data\/reorder$/);
  for (const [, options] of calls) {
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers['X-CSRF-Token'], 'csrf-value');
  }
  assert.equal(calls[4][1].body, JSON.stringify({ items: [{ id: 'entry-1', order: 0 }] }));
});

test('publishing a historical entry preserves cookie, CSRF, and explicit status', async () => {
  let call;
  globalThis.fetch = async (...args) => {
    call = args;
    return jsonResponse({ ok: true });
  };
  const api = new ApiService();
  api.setCsrfToken('csrf-value');

  await api.updateHistoricalData('entry-1', {
    title: 'Reviewed entry',
    status: 'Disponible',
  });

  const [url, options] = call;
  assert.match(url, /\/historical-data\/entry-1$/);
  assert.equal(options.method, 'PUT');
  assert.equal(options.credentials, 'include');
  assert.equal(options.headers['X-CSRF-Token'], 'csrf-value');
  assert.equal(options.body.get('status'), 'Disponible');
});
