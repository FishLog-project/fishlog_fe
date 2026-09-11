/* global __r */
// Expo web 개발 서버를 연 브라우저 콘솔에서 이 파일을 실행한다.
(async () => {
  const modules = [...__r.getModules()];
  const requireModule = (name) => {
    const entry = modules.find(([, module]) => module.verboseName === name);
    if (!entry) throw new Error(`Metro module not loaded: ${name}`);
    return __r(entry[0]);
  };
  const { act, createElement } = requireModule('node_modules/react/index.js');
  const { createRoot } = requireModule('node_modules/react-dom/client.js');
  const { useSection } = requireModule('src/lib/use-section.ts');
  const container = document.createElement('div');
  const root = createRoot(container);
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let current;
  const load = (source) => source();
  const map = (value) => value;
  function Probe({ source }) {
    current = useSection(source, load, map);
    return null;
  }
  const render = (source) => act(async () => { root.render(createElement(Probe, { source })); });
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  try {
    await render(() => Promise.reject(new Error('expired token')));
    check(current[0].status === 'error', 'failed request must expose error');
    await render(() => Promise.resolve('new token'));
    check(current[0].data === 'new token', 'source change must recover from error');
    await render(() => Promise.resolve('other account'));
    check(current[0].data === 'other account', 'source change must discard previous account data');
    await render(() => Promise.resolve(null));
    check(current[0].status === 'empty', 'null mapping must expose empty');

    let finishOld;
    await render(() => new Promise((resolve) => { finishOld = resolve; }));
    check(current[0].status === 'loading', 'pending source must expose loading');
    await render(() => Promise.resolve('latest'));
    await act(async () => { finishOld('stale'); });
    check(current[0].data === 'latest', 'late response must not replace latest data');

    let attempts = 0;
    await render(() => ++attempts === 1
      ? Promise.reject(new Error('offline'))
      : Promise.resolve('retried'));
    await act(async () => { current[1](); });
    check(current[0].data === 'retried' && attempts === 2, 'retry must reload the same source');

    const requests = [];
    await render(() => new Promise((resolve, reject) => { requests.push({ resolve, reject }); }));
    check(requests.length === 1, 'mount must start one request');
    await act(async () => {
      current[1]();
      requests[0].resolve('before catch');
    });
    check(requests.length === 2, 'refresh during loading must start a new request');
    check(current[0].status === 'loading', 'pre-refresh data must not finish the current request');
    await act(async () => { requests[1].resolve('after catch'); });
    check(current[0].data === 'after catch', 'the refreshed response must be shown');

    await act(async () => { current[1](); });
    check(current[0].status === 'loading' && requests.length === 3, 'refresh after success must hide old data and reload');
    await act(async () => { current[1](); });
    check(requests.length === 4, 'a second pending refresh must start another request');
    await act(async () => { requests[3].resolve('newest'); });
    await act(async () => { requests[2].reject(new Error('old request failed')); });
    check(current[0].data === 'newest', 'a stale failure must not replace the refreshed data');
    console.info('useSection: source changes, empty, stale responses, retry and refresh while loading/ready passed');
  } finally {
    await act(async () => { root.unmount(); });
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  }
})();
