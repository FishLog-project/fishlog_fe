import type {
  CollectionProgress,
  FishLogDataSource,
  PopularSpot,
  SeasonalFish,
} from '@/features/home/home-data';
import { useSection, type SectionState } from '@/lib/use-section';

/** 섹션마다 독립적으로 갖는 상태 */
export type HomeSectionState<T> = SectionState<T>;

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

/** "추천 낚시 스팟 Top 3" — 서버도 3개까지만 주지만 화면의 개수는 여기서 정한다 */
const TOP_SPOTS = 3;

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
  return dataSource.getPopularSpots();
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

  return spots.slice(0, TOP_SPOTS).map((spot, index) => ({
    id: spot.id,
    rank: index + 1,
    name: spot.name,
    category: spot.category,
    distance: formatDistance(spot.distanceMeters),
    species: spot.majorFishes.slice(0, 3).join(', '),
  }));
}

export function useHomeViewModel(dataSource: FishLogDataSource) {
  const [featuredSpecies, retryFeaturedSpecies] = useSection(
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

  return { viewModel, retryFeaturedSpecies, retryCollectionProgress, retryRecommendedSpots };
}
