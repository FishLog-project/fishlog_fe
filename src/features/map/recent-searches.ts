import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

/**
 * 최근 검색어.
 *
 * 서버에 검색 기록 API 가 없어 기기에만 남긴다.
 * 토큰과 같은 저장소(SecureStore)를 쓰는 건 민감해서가 아니라, 이 프로젝트가
 * 로컬 저장에 쓰는 수단이 이것뿐이기 때문이다 (AsyncStorage 미설치).
 */
const STORAGE_KEY = 'map.recentSearches';

/** 시안이 없어 정한 값 — 요청대로 5개까지만 남긴다 */
export const MAX_RECENT_SEARCHES = 5;

function parse(raw: string | null): readonly string[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    // 저장값이 깨졌으면 버리고 빈 목록으로 시작한다
    return [];
  }
}

export function useRecentSearches() {
  const [items, setItems] = useState<readonly string[]>([]);

  useEffect(() => {
    let alive = true;

    SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => {
        if (alive) setItems(parse(raw));
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  /** 저장 실패는 조용히 넘긴다 — 검색 자체를 막을 이유가 없다 */
  const persist = useCallback((next: readonly string[]) => {
    setItems(next);
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  /** 같은 말을 다시 검색하면 중복으로 쌓지 않고 맨 앞으로 올린다 */
  const add = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      if (trimmed === '') return;

      setItems((current) => {
        const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(
          0,
          MAX_RECENT_SEARCHES,
        );
        SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    },
    [],
  );

  const remove = useCallback(
    (keyword: string) => {
      persist(items.filter((item) => item !== keyword));
    },
    [items, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { items, add, remove, clear };
}
