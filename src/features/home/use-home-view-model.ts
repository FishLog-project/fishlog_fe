import type {
  CollectionProgress,
  FishLogDataSource,
  FishSpecies,
  FishingSpot,
} from '@/features/home/home-data';
import { useSection, type SectionState } from '@/lib/use-section';

/** 홈의 각 섹션이 독립적으로 갖는 로딩·빈·오류·준비 상태 */
export type HomeSectionState<T> = SectionState<T>;

export interface FeaturedSlideViewModel {
  speciesId: string;
  /** 히어로 타이틀 — "광어 잡기 좋은 날!" */
  title: string;
}

export interface CollectionProgressViewModel {
  collected: number;
  total: number;
  /** 0–100. 진행바 폭은 이 값에서 유도한다 (숫자와 막대가 어긋나지 않게) */
  progressPercent: number;
}

export interface RecommendedSpotViewModel {
  id: string;
  rank: number;
  name: string;
  /** "3.2km" — 화면 표기용으로 포맷된 값 */
  distance: string;
  /** "광어, 멸치, 개복치" */
  species: string;
}

export interface HomeViewModel {
  featuredSpecies: HomeSectionState<readonly FeaturedSlideViewModel[]>;
  collectionProgress: HomeSectionState<CollectionProgressViewModel>;
  recommendedSpots: HomeSectionState<readonly RecommendedSpotViewModel[]>;
}

// 로더·매퍼는 모듈 레벨 상수라 참조가 안정적이다.
// (useSection 의존성에 들어가므로 렌더마다 새로 만들면 무한 재요청이 된다)

function loadFeaturedSpecies(dataSource: FishLogDataSource) {
  return dataSource.getFeaturedSpecies();
}

function toFeaturedSpeciesViewModel(
  species: readonly FishSpecies[],
): readonly FeaturedSlideViewModel[] | null {
  if (species.length === 0) return null;

  return species.map((s) => ({ speciesId: s.id, title: s.seasonalHeadline }));
}

function loadCollectionProgress(dataSource: FishLogDataSource) {
  return dataSource.getCollectionProgress();
}

function toCollectionProgressViewModel(
  progress: CollectionProgress,
): CollectionProgressViewModel {
  // 서버 값이 어긋나도(음수·초과) 화면이 깨지지 않게 범위를 눌러 둔다
  const total = Math.max(0, progress.totalSpeciesCount);
  const collected = Math.min(Math.max(0, progress.collectedSpeciesCount), total);

  return {
    collected,
    total,
    progressPercent: total === 0 ? 0 : Math.round((collected / total) * 100),
  };
}

function loadRecommendedSpots(dataSource: FishLogDataSource) {
  return dataSource.getRecommendedSpots(3);
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`;
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function toRecommendedSpotsViewModel(
  spots: readonly FishingSpot[],
): readonly RecommendedSpotViewModel[] | null {
  if (spots.length === 0) return null;

  return spots.slice(0, 3).map((spot, index) => ({
    id: spot.id,
    rank: index + 1,
    name: spot.name,
    distance: formatDistance(spot.distanceMeters),
    species: spot.species.join(', '),
  }));
}

export function useHomeViewModel(dataSource: FishLogDataSource) {
  const [featuredSpecies] = useSection(
    dataSource,
    loadFeaturedSpecies,
    toFeaturedSpeciesViewModel,
  );
  const [collectionProgress, retryCollectionProgress] = useSection(
    dataSource,
    loadCollectionProgress,
    toCollectionProgressViewModel,
  );
  const [recommendedSpots, retryRecommendedSpots] = useSection(
    dataSource,
    loadRecommendedSpots,
    toRecommendedSpotsViewModel,
  );

  const viewModel: HomeViewModel = {
    featuredSpecies,
    collectionProgress,
    recommendedSpots,
  };

  return { viewModel, retryCollectionProgress, retryRecommendedSpots };
}
