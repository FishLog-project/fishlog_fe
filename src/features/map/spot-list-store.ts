import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type { SpotDataSource, SpotSummary } from '@/features/map/spot-data';

/**
 * 지도·검색이 함께 쓰는 스팟 목록 캐시.
 *
 * GET /api/spots(92건)를 한 번 받아 두고, 화면이 다시 마운트되거나 토큰이 회전해도
 * 다시 받지 않는다. 서버를 다시 부르는 건 새로고침(refresh)했을 때뿐이다.
 * 목록의 isFavorite 은 계정마다 달라서 로그인 세션이 바뀌면 캐시를 버린다.
 */
export type SpotListState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      spots: readonly SpotSummary[];
      /** 받아 둔 목록을 보여 주는 채로 다시 받는 중 */
      refreshing: boolean;
      /** 새로고침이 실패했다. 목록은 이전 것을 그대로 둔다 */
      refreshFailed: boolean;
    };

type Entry = { sessionKey: string; request: number; state: SpotListState };

const LOADING: SpotListState = { status: 'loading' };

let entry: Entry | null = null;
let lastRequest = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: Entry) {
  entry = next;
  listeners.forEach((listener) => listener());
}

function isBusy(sessionKey: string) {
  if (entry?.sessionKey !== sessionKey) return false;
  const { state } = entry;
  return state.status === 'loading' || (state.status === 'ready' && state.refreshing);
}

function fetchSpots(dataSource: SpotDataSource, sessionKey: string) {
  const request = ++lastRequest;
  const previous = entry?.sessionKey === sessionKey && entry.state.status === 'ready' ? entry.state : null;

  commit({
    sessionKey,
    request,
    state: previous ? { ...previous, refreshing: true, refreshFailed: false } : LOADING,
  });

  // 늦게 도착한 응답이 더 최근 요청(다른 세션·새로고침)을 덮지 않게 한다
  dataSource.getSpots().then(
    (spots) => {
      if (entry?.request !== request) return;
      commit({
        sessionKey,
        request,
        state: { status: 'ready', spots, refreshing: false, refreshFailed: false },
      });
    },
    () => {
      if (entry?.request !== request) return;
      commit({
        sessionKey,
        request,
        state: previous ? { ...previous, refreshing: false, refreshFailed: true } : { status: 'error' },
      });
    },
  );
}

/**
 * @param sessionKey 로그인 세션을 구분하는 값. 바뀌면 캐시를 버리고 새로 받는다.
 */
export function useSpotList(dataSource: SpotDataSource, sessionKey: string) {
  const state = useSyncExternalStore(subscribe, () =>
    entry?.sessionKey === sessionKey ? entry.state : LOADING,
  );

  // 이 세션의 목록이 없을 때만 받는다. 첫 로드가 실패했으면 다시 들어올 때 한 번 더 시도한다.
  useEffect(() => {
    if (isBusy(sessionKey)) return;
    if (entry?.sessionKey === sessionKey && entry.state.status !== 'error') return;
    fetchSpots(dataSource, sessionKey);
  }, [dataSource, sessionKey]);

  const refresh = useCallback(() => {
    if (!isBusy(sessionKey)) fetchSpots(dataSource, sessionKey);
  }, [dataSource, sessionKey]);

  return [state, refresh] as const;
}
