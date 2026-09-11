// Run: node scripts/check-auth-session.cjs
// Actual app modules; in-memory hooks/storage and intercepted HTTP only. No real account/API writes.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file, imports, timers = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', 'setTimeout', 'clearTimeout', outputText)((id) => {
    assert.ok(id in imports, `Unexpected import: ${id}`);
    return imports[id];
  }, module.exports, module, timers.setTimeout ?? ((...args) => {
    const timer = setTimeout(...args); timer.unref(); return timer;
  }), timers.clearTimeout ?? clearTimeout);
  return module.exports;
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
const response = (status, data, message = 'test response') => new Response(JSON.stringify({
  success: status >= 200 && status < 300, code: status, data, message,
}), { status });
const oldTokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
const freshTokens = { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' };
const otherTokens = { accessToken: 'other-access', refreshToken: 'other-refresh' };

function mount({ tokens = oldTokens, guest = false, http, storage = {}, timers } = {}) {
  const stored = new Map();
  if (tokens) stored.set('fishlog.session', JSON.stringify(tokens));
  if (guest) stored.set('fishlog.guest', '1');
  const requests = [];
  const fetch = async (url, options) => {
    const call = { path: new URL(url).pathname, url, ...options };
    requests.push(call);
    return http ? http(call) : response(401, null);
  };
  globalThis.fetch = fetch;
  const client = load('src/lib/api/client.ts', { 'expo/fetch': { fetch } }, timers);
  const result = load('src/lib/api/result.ts', { './client': client });
  const api = load('src/features/auth/api.ts', { '@/lib/api/client': client, '@/lib/api/result': result });
  const slots = [], effects = [];
  let cursor = 0;
  const memo = (factory, deps) => {
    const index = cursor++;
    if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
      slots[index] = { deps, value: factory() };
    }
    return slots[index].value;
  };
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => { throw Error('Unexpected useContext'); },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef: (initial) => memo(() => ({ current: initial }), []),
    useMemo: memo,
    useCallback: (callback, deps) => memo(() => callback, deps),
    useEffect: (effect, deps) => memo(() => { effects.push(effect); }, deps),
  };
  const auth = load('src/features/auth/auth-store.tsx', {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'expo-secure-store': {
      getItemAsync: async (key) => stored.get(key) ?? null,
      setItemAsync: async (key, value) => { stored.set(key, value); },
      deleteItemAsync: async (key) => { stored.delete(key); },
      ...storage,
    },
    './api': api, '@/lib/api/client': client,
  });
  const render = () => { cursor = 0; return auth.AuthProvider({ children: null }).props.value; };
  render();
  const cleanups = effects.splice(0).map((effect) => effect());
  return { render, stored, requests, client, api, unmount: () => cleanups.forEach((cleanup) => cleanup?.()) };
}

async function checkRecovery() {
  const pendingRefresh = deferred();
  const app = mount({ http: async (call) => {
    if (call.path === '/api/auth/refresh') return pendingRefresh.promise;
    return call.headers.Authorization === `Bearer ${freshTokens.accessToken}`
      ? response(200, { value: 'recovered' }) : response(401, null);
  } });
  await flush();
  const first = app.client.apiRequest('/first', { token: oldTokens.accessToken });
  const second = app.client.apiRequest('/second', { token: oldTokens.accessToken });
  await flush();
  assert.equal(app.requests.filter((call) => call.path === '/api/auth/refresh').length, 1);
  pendingRefresh.resolve(response(200, freshTokens));
  assert.deepEqual(await Promise.all([first, second]), [{ value: 'recovered' }, { value: 'recovered' }]);
  assert.equal(app.render().token, freshTokens.accessToken);
  assert.deepEqual(JSON.parse(app.stored.get('fishlog.session')), freshTokens);
  await app.client.apiRequest('/custom-followup', { token: oldTokens.accessToken });
  assert.equal(app.requests.at(-1).headers.Authorization, `Bearer ${freshTokens.accessToken}`, 'old dataSource in same session uses current token');
  const beforeChange = app.requests.length;
  await app.render().signIn(otherTokens);
  await assert.rejects(app.client.apiRequest('/custom-followup', { token: oldTokens.accessToken }), (error) => error.status === 401);
  assert.equal(app.requests.length, beforeChange, 'old dataSource must not send followup as another account');
  app.unmount();

  for (const failure of ['network', 500, 'malformed', 401]) {
    const state = mount({ http: (call) => {
      if (call.path !== '/api/auth/refresh') return response(401, null);
      if (failure === 'network') throw new TypeError('offline');
      return failure === 'malformed' ? response(200, { accessToken: '' }) : response(failure, null);
    } });
    await flush();
    await assert.rejects(state.client.apiRequest('/protected', { token: oldTokens.accessToken }));
    await flush();
    assert.equal(state.render().token, failure === 401 ? null : oldTokens.accessToken);
    assert.equal(state.stored.has('fishlog.session'), failure !== 401, 'only invalid refresh deletes persisted session');
    assert.equal(state.requests.filter((call) => call.path === '/protected').length, 1);
    state.unmount();
  }
  const noRefresh = mount({ tokens: { accessToken: 'access-only', refreshToken: null } });
  await flush();
  await assert.rejects(noRefresh.client.apiRequest('/protected', { token: 'access-only' }));
  await flush();
  assert.equal(noRefresh.render().token, null);
  assert.equal(noRefresh.render().canEnterApp, false);
  assert.equal(noRefresh.requests.length, 1);
  noRefresh.unmount();
  const stillUnauthorized = mount({ http: (call) => response(call.path === '/api/auth/refresh' ? 200 : 401, freshTokens) });
  await flush();
  await assert.rejects(stillUnauthorized.client.apiRequest('/protected', { token: oldTokens.accessToken }));
  await flush();
  assert.equal(stillUnauthorized.requests.length, 3, 'one request, one refresh, one retry only');
  assert.equal(stillUnauthorized.render().token, null);
  stillUnauthorized.unmount();
  let refreshAttempts = 0;
  const recoveredLater = mount({ http: (call) => {
    if (call.path === '/api/auth/refresh') return ++refreshAttempts === 1
      ? response(503, null) : response(200, freshTokens);
    return response(call.headers.Authorization === `Bearer ${freshTokens.accessToken}` ? 200 : 401, { ok: true });
  } });
  await flush();
  await assert.rejects(recoveredLater.client.apiRequest('/retry', { token: oldTokens.accessToken }));
  assert.deepEqual(await recoveredLater.client.apiRequest('/retry', { token: oldTokens.accessToken }), { ok: true });
  assert.equal(refreshAttempts, 2, 'temporary failure must release single-flight for a later retry');
  recoveredLater.unmount();
  console.log('PASS recovery: single-flight, token aliases, invalid/offline/5xx separation, one retry, cross-account followup blocked');
}

async function checkSessionRaces() {
  for (const transition of ['logout', 'login', 'guest']) {
    const refresh = deferred();
    const app = mount({ http: (call) => call.path === '/api/auth/refresh'
      ? refresh.promise : response(call.path === '/api/auth/logout' ? 200 : 401, null) });
    await flush();
    const outcome = app.client.apiRequest('/protected', { token: oldTokens.accessToken }).catch((error) => error);
    await flush();
    const changing = transition === 'logout' ? app.render().signOut()
      : transition === 'login' ? app.render().signIn(otherTokens) : app.render().continueAsGuest();
    assert.equal(app.render().token, transition === 'login' ? otherTokens.accessToken : null, 'local transition is immediate');
    refresh.resolve(response(200, freshTokens));
    await changing;
    assert.equal((await outcome).status, 401);
    await flush();
    assert.equal(app.render().token, transition === 'login' ? otherTokens.accessToken : null);
    assert.equal(app.render().isGuest, transition === 'guest');
    assert.equal(app.stored.has('fishlog.session'), transition === 'login');
    if (transition === 'login') assert.deepEqual(JSON.parse(app.stored.get('fishlog.session')), otherTokens);
    assert.equal(app.requests.filter((call) => call.path === '/protected').length, 1, 'stale refresh must not retry');
    app.unmount();
  }
  for (const transition of ['logout', 'login']) {
    const completed = deferred();
    const app = mount({ http: (call) => call.path === '/late-data' ? completed.promise : response(200, null) });
    await flush();
    const outcome = app.client.apiRequest('/late-data', { token: oldTokens.accessToken }).catch((error) => error);
    await (transition === 'logout' ? app.render().signOut() : app.render().signIn(otherTokens));
    completed.resolve(response(200, { private: 'old account' }));
    assert.equal((await outcome).status, 401, 'late success must not publish old account data');
    app.unmount();
  }
  const restore = deferred();
  const startup = mount({ storage: { getItemAsync: async (key) => key === 'fishlog.session' ? restore.promise : null } });
  const changed = startup.render().signIn(otherTokens);
  restore.resolve(JSON.stringify(oldTokens));
  await changed; await flush();
  assert.equal(startup.render().token, otherTokens.accessToken, 'late SecureStore restore cannot replace a new login');
  startup.unmount();
  console.log('PASS session races: logout/new login/guest reject stale refresh and late 200; late bootstrap read ignored');
}

async function checkStorageAndAuthOrder() {
  const write = deferred();
  let app;
  app = mount({ tokens: null, http: () => response(200, null), storage: {
    setItemAsync: async (key, value) => {
      if (key === 'fishlog.session' && JSON.parse(value).accessToken === oldTokens.accessToken) await write.promise;
      app.stored.set(key, value);
    },
  } });
  await flush();
  const firstWrite = app.render().signIn(oldTokens);
  await flush();
  const logout = app.render().signOut();
  const newLogin = app.render().signIn(otherTokens);
  assert.equal(app.render().token, otherTokens.accessToken);
  write.resolve();
  await Promise.all([firstWrite, logout, newLogin]);
  assert.deepEqual(JSON.parse(app.stored.get('fishlog.session')), otherTokens, 'last session wins even when the first write finishes late');
  await app.render().continueAsGuest();
  assert.equal(app.stored.has('fishlog.session'), false);
  assert.equal(app.stored.get('fishlog.guest'), '1');
  app.unmount();

  const refresh = deferred();
  const order = mount({ http: (call) => call.path === '/api/auth/refresh' ? refresh.promise : response(200, otherTokens) });
  await flush();
  const rotating = order.api.refresh(oldTokens.refreshToken);
  const leaving = order.api.logout(oldTokens.accessToken);
  const signingIn = order.api.login('test@example.invalid', 'not-a-real-password');
  await flush();
  assert.deepEqual(order.requests.map((call) => call.path), ['/api/auth/refresh']);
  refresh.resolve(response(200, freshTokens));
  await Promise.all([rotating, leaving, signingIn]);
  assert.deepEqual(order.requests.map((call) => call.path), ['/api/auth/refresh', '/api/auth/logout', '/api/auth/login']);
  assert.equal(order.requests[1].headers.Authorization, `Bearer ${oldTokens.accessToken}`, 'logout never substitutes or refreshes its captured token');
  order.unmount();
  console.log('PASS ordering: delayed SecureStore writes settle in order; refresh/logout/login HTTP operations serialize');
}

async function checkMultipartAndAbort() {
  const form = new FormData();
  form.append('image', new Blob(['photo bytes'], { type: 'image/jpeg' }), 'catch.jpg');
  const app = mount({ http: async (call) => {
    if (call.path === '/api/auth/refresh') return response(200, freshTokens);
    assert.equal(await call.body.get('image').text(), 'photo bytes');
    return response(call.headers.Authorization === `Bearer ${freshTokens.accessToken}` ? 200 : 401, { saved: true });
  } });
  await flush();
  assert.deepEqual(await app.client.apiRequest('/verify', { method: 'POST', token: oldTokens.accessToken, body: form }), { saved: true });
  const uploads = app.requests.filter((call) => call.path === '/verify');
  assert.equal(uploads.length, 2);
  assert.ok(uploads.every((call) => call.body === form && call.headers['Content-Type'] === undefined));
  app.unmount();
  for (const failure of ['network', 503]) {
    const failed = mount({ http: () => { if (failure === 'network') throw Error('offline'); return response(failure, null); } });
    await flush();
    await assert.rejects(failed.client.apiRequest('/verify', { method: 'POST', token: oldTokens.accessToken, body: form }));
    assert.equal(failed.requests.length, 1, 'ambiguous upload failures must never auto-replay');
    failed.unmount();
  }
  const refresh = deferred();
  const aborted = mount({ http: (call) => call.path === '/api/auth/refresh' ? refresh.promise
    : response(call.headers.Authorization === `Bearer ${freshTokens.accessToken}` ? 200 : 401, { ok: true }) });
  await flush();
  const controller = new AbortController();
  const cancelled = aborted.client.apiRequest('/cancelled', { token: oldTokens.accessToken, signal: controller.signal }).catch((error) => error);
  const live = aborted.client.apiRequest('/live', { token: oldTokens.accessToken });
  await flush();
  controller.abort();
  refresh.resolve(response(200, freshTokens));
  assert.equal((await cancelled).name, 'AbortError');
  assert.deepEqual(await live, { ok: true }, 'one caller abort must not cancel shared refresh');
  assert.equal(aborted.requests.filter((call) => call.path === '/cancelled').length, 1);
  aborted.unmount();
  console.log('PASS multipart/abort: same photo replays only on 401; no network/5xx replay; cancelled caller does not retry');
}

async function checkTimeouts() {
  const timers = new Map();
  let sequence = 0;
  let expectedTimeout = 30_000;
  const app = mount({ timers: {
    setTimeout: (callback, ms) => { assert.equal(ms, expectedTimeout); const id = ++sequence; timers.set(id, callback); return id; },
    clearTimeout: (id) => timers.delete(id),
  }, http: (call) => {
    if (call.path === '/api/auth/login') return response(200, otherTokens);
    return new Promise((_, reject) => call.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }));
  } });
  await flush();
  const signingOut = app.api.logout(oldTokens.accessToken);
  const signingIn = app.api.login('test@example.invalid', 'not-a-real-password');
  await flush();
  assert.deepEqual(app.requests.map((call) => call.path), ['/api/auth/logout']);
  [...timers.values()][0]();
  await signingOut;
  assert.equal((await signingIn).ok, true, 'timed-out auth request must release the auth queue');
  assert.equal(timers.size, 0);
  const controller = new AbortController();
  const waiting = app.client.apiRequest('/wait', { signal: controller.signal }).catch((error) => error);
  await flush();
  controller.abort();
  assert.equal((await waiting).name, 'AbortError');
  assert.equal(timers.size, 0);
  const timedOut = app.client.apiRequest('/timeout').catch((error) => error);
  await flush();
  [...timers.values()][0]();
  assert.equal((await timedOut).status, 408);
  assert.equal(timers.size, 0);
  expectedTimeout = 120_000;
  const form = new FormData();
  form.append('image', new Blob(['photo bytes']), 'catch.jpg');
  const uploading = app.client.apiRequest('/verify', { method: 'POST', body: form }).catch((error) => error);
  await flush();
  [...timers.values()][0]();
  assert.equal((await uploading).status, 408);
  assert.equal(app.requests.filter((call) => call.path === '/verify').length, 1, 'timed-out upload must not replay');
  assert.equal(timers.size, 0);
  app.unmount();
  console.log('PASS deadlines: 30-second requests, 120-second uploads without replay, abort cleanup, auth queue recovers');
}

async function main() {
  const originalFetch = globalThis.fetch;
  try {
    const boot = mount();
    await flush();
    assert.equal(boot.requests.length, 0, 'boot restores local tokens without an unnecessary refresh');
    assert.equal(boot.render().token, oldTokens.accessToken, 'offline boot must retain the stored session');
    assert.equal(JSON.parse(boot.stored.get('fishlog.session')).refreshToken, oldTokens.refreshToken);
    boot.unmount();
    await checkRecovery();
    await checkSessionRaces();
    await checkStorageAndAuthOrder();
    await checkMultipartAndAbort();
    await checkTimeouts();
    console.log('auth session checks passed');
  } finally { globalThis.fetch = originalFetch; }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
