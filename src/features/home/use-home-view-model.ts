import { useCallback, useEffect, useState } from 'react';

import type {
  CollectionProgress,
  FishLogDataSource,
  PopularSpot,
  SeasonalFish,
} from '@/features/home/home-data';

/** 섹션마다 독립적으로 갖는 상태 */
export type HomeSectionState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; reason: 'unauthorized' | 'unknown' }
  | { status: 'ready'; data: T };

export interface FeaturedSlideViewModel {
  /** 헤드라인은 BE에 없어 어종 이름으로 조합한다 */
  title: string;
  /** null이면 앱에 넣어 둔 기본 그림을 쓴다 */
  imageUrl: string | null;
}

export interface CollectionProgressViewModel {
  collected: number;
  total: number;
  /** 0–100. 진행바 폭을 이 값에서 유도해 숫자와 막대가 어긋나지 않게 한다 */
  progressPercent: number;
}

export interface RecommendedSpotViewModel {
  id: number;
  rank: number;
  name: string;
  /** 추천 스팟 슬라이드의 대표 사진을 고르는 기준 */
  category: PopularSpot['category'];
  /** "3.2km". 거리를 아직 계산하지 못했으면 null */
  distance: string | null;
  species: string;
}

export interface HomeViewModel {
  featuredSpecies: HomeSectionState<FeaturedSlideViewModel>;
  collectionProgress: HomeSectionState<CollectionProgressViewModel>;
  recommendedSpots: HomeSectionState<readonly RecommendedSpotViewModel[]>;
}

type DataSourceLoader<T> = (dataSource: FishLogDataSource) => Promise<T>;
type SectionMapper<T, ViewData> = (value: T) => ViewData | null;

/**
 * 섹션 하나의 로드→매핑→상태 전이.
 * loading이 곧 "로드 시작" 신호라, 재시도는 loading으로 되돌리기만 하면 된다.
 */
function useSection<T, ViewData>(
  dataSource: FishLogDataSource,
  load: DataSourceLoader<T>,
  map: SectionMapper<T, ViewData>,
) {
  // 결과에 데이터소스를 묶어 둔다. 토큰이 바뀌어 데이터소스가 새로 오면 실패했던 섹션만
  // 다시 부르고, 이미 받은 데이터는 그대로 둔다(앱 시작 시 토큰 갱신마다 깜빡이지 않게).
  const [loaded, setLoaded] = useState<{
    source: FishLogDataSource;
    state: HomeSectionState<ViewData>;
  } | null>(null);
  const state: HomeSectionState<ViewData> =
    loaded && (loaded.source === dataSource || loaded.state.status !== 'error')
      ? loaded.state
      : { status: 'loading' };

  const refresh = useCallback(() => setLoaded(null), []);

  useEffect(() => {
    if (state.status !== 'loading') return;

    // 언마운트되면 늦게 도착한 응답을 버린다
    let stale = false;

    load(dataSource)
      .then((value) => {
        if (stale) return;
        const viewData = map(value);
        setLoaded({
          source: dataSource,
          state: viewData === null ? { status: 'empty' } : { status: 'ready', data: viewData },
        });
      })
      .catch((e) => {
        if (stale) return;
        setLoaded({
          source: dataSource,
          state: {
            status: 'error',
            reason: e?.reason === 'unauthorized' ? 'unauthorized' : 'unknown',
          },
        });
      });

    return () => {
      stale = true;
    };
  }, [state.status, dataSource, load, map]);

  return [state, refresh] as const;
}

// 로더·매퍼는 useSection 의존성에 들어가므로 모듈 레벨에 둔다
// (렌더마다 새로 만들면 무한 재요청이 된다)

function loadSeasonalFish(dataSource: FishLogDataSource) {
  return dataSource.getSeasonalFish();
}

function toFeaturedSlideViewModel(
  fish: readonly SeasonalFish[],
): FeaturedSlideViewModel | null {
  // 캐러셀의 추천 어종 슬라이드는 한 장이라 첫 건만 쓴다
  if (fish.length === 0) return null;

  return { title: `${fish[0].name} 잡기 좋은 날!`, imageUrl: fish[0].imageUrl };
}

function loadCollectionProgress(dataSource: FishLogDataSource) {
  return dataSource.getCollectionProgress();
}

function toCollectionProgressViewModel(
  progress: CollectionProgress,
): CollectionProgressViewModel {
  // 서버 값이 어긋나도(음수·초과) 화면이 깨지지 않게 범위를 눌러 둔다
  const total = Math.max(0, progress.totalCount);
  const collected = Math.min(Math.max(0, progress.caughtCount), total);

  return {
    collected,
    total,
    progressPercent: total === 0 ? 0 : Math.round((collected / total) * 100),
  };
}

function loadPopularSpots(dataSource: FishLogDataSource) {
  return dataSource.getPopularSpots(3);
}

function formatDistance(distanceMeters: number | undefined): string | null {
  if (distanceMeters === undefined) return null;
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`;
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function toRecommendedSpotsViewModel(
  spots: readonly PopularSpot[],
): readonly RecommendedSpotViewModel[] | null {
  if (spots.length === 0) return null;

  return spots.slice(0, 3).map((spot, index) => ({
    id: spot.id,
    rank: index + 1,
    name: spot.name,
    category: spot.category,
    distance: formatDistance(spot.distanceMeters),
    species: spot.majorFishes.slice(0, 3).join(', '),
  }));
}

export function useHomeViewModel(dataSource: FishLogDataSource) {
  const [featuredSpecies] = useSection(
    dataSource,
    loadSeasonalFish,
    toFeaturedSlideViewModel,
  );
  const [collectionProgress, retryCollectionProgress] = useSection(
    dataSource,
    loadCollectionProgress,
    toCollectionProgressViewModel,
  );
  const [recommendedSpots, retryRecommendedSpots] = useSection(
    dataSource,
    loadPopularSpots,
    toRecommendedSpotsViewModel,
  );

  const viewModel: HomeViewModel = {
    featuredSpecies,
    collectionProgress,
    recommendedSpots,
  };

  return { viewModel, retryCollectionProgress, retryRecommendedSpots };
}
