import { useCallback, useEffect, useState } from 'react';

/** 화면의 한 섹션이 독립적으로 갖는 로딩·빈·오류·준비 상태 */
export type SectionState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error' }
  | { status: 'ready'; data: T };

type SectionLoader<Source, T> = (source: Source) => Promise<T>;
/** null을 돌려주면 'empty'로 넘어간다 (빈 배열·0건을 각 화면이 스스로 판단) */
type SectionMapper<T, ViewData> = (value: T) => ViewData | null;

/**
 * 섹션 하나의 로드→매핑→상태 전이를 담당한다.
 *
 * 마운트 시 한 번 로드하고, refresh마다 요청 세대를 바꿔 다시 읽는다.
 * 이미 로딩 중이어도 이전 요청의 응답은 버리고 최신 요청만 반영한다.
 *
 * ⚠️ `source`·`load`·`map`은 참조가 안정적이어야 한다. 렌더마다 새로 만들면
 *    effect 의존성이 흔들려 무한 재요청이 된다. (모듈 레벨 상수나 useMemo로 넘길 것)
 */
export function useSection<Source, T, ViewData>(
  source: Source,
  load: SectionLoader<Source, T>,
  map: SectionMapper<T, ViewData>,
) {
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<{
    source: Source;
    revision: number;
    state: SectionState<ViewData>;
  } | null>(null);
  const state: SectionState<ViewData> =
    loaded && loaded.source === source && loaded.revision === revision
      ? loaded.state
      : { status: 'loading' };

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (state.status !== 'loading') return;

    // 언마운트되면 늦게 도착한 응답을 버린다
    let stale = false;

    load(source)
      .then((value) => {
        if (stale) return;
        const viewData = map(value);
        setLoaded({
          source,
          revision,
          state: viewData === null ? { status: 'empty' } : { status: 'ready', data: viewData },
        });
      })
      .catch(() => {
        if (!stale) setLoaded({ source, revision, state: { status: 'error' } });
      });

    return () => {
      stale = true;
    };
  }, [state.status, source, revision, load, map]);

  return [state, refresh] as const;
}
