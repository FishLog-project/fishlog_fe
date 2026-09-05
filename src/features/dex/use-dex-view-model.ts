import { useMemo, useState } from 'react';

import type {
  CatchRecord,
  DexDataSource,
  DexEntry,
  FishDetail,
  MyDex,
  RecentCatch,
} from '@/features/dex/dex-data';
import { useSection } from '@/lib/use-section';

export interface DexSpeciesViewModel {
  id: number;
  /** 잠금 카드는 이름을 감춘다 — 화면이 아니라 여기서 결정한다 */
  label: string;
  /** null이면 화면이 기본 그림을 쓴다 */
  imageUrl: string | null;
  caught: boolean;
  accessibilityLabel: string;
  /**
   * 검색이 훑는 텍스트 ("어종명 서식지").
   * 미획득 어종은 빈 문자열이라 어떤 검색어에도 안 걸린다 —
   * 화면에 이름이 '???'로 나오는데 이름으로 검색되면 정답을 흘리는 셈이라서다.
   */
  searchText: string;
}

export interface DexSpeciesDetailViewModel {
  name: string;
  /** "최대 크기 300cm". 서버가 값을 안 주면 null이고 그 줄을 그리지 않는다 */
  maxSizeLabel: string | null;
  /** null이면 화면이 기본 그림을 쓴다 */
  imageUrl: string | null;
  description: string;
  /** 기타어종은 서식지가 없어 null */
  habitatLabel: string | null;
  /** "잡은 횟수: 3회" */
  catchLabel: string;
  photos: readonly RecentCatch[];
}

export interface DexViewModel {
  species: readonly DexSpeciesViewModel[];
  collected: number;
  total: number;
  /** 0–100. 막대 폭은 이 값에서 유도한다 (숫자와 막대가 어긋나지 않게) */
  progressPercent: number;
}

/** 미획득 어종 카드에 이름 대신 넣는 문구 */
const LOCKED_LABEL = '???';

// 로더·매퍼는 모듈 레벨 상수라 참조가 안정적이다.
// (useSection 의존성에 들어가므로 렌더마다 새로 만들면 무한 재요청이 된다)

function loadMyDex(dataSource: DexDataSource) {
  return dataSource.getMyDex();
}

function toDexSpecies(entry: DexEntry): DexSpeciesViewModel {
  const habitat = entry.habitat ?? '';

  return {
    id: entry.id,
    label: entry.caught ? entry.name : LOCKED_LABEL,
    imageUrl: entry.imageUrl,
    caught: entry.caught,
    accessibilityLabel: entry.caught
      ? `${entry.name}${habitat ? `, 서식지 ${habitat}` : ''}`
      : '아직 잡지 못한 어종',
    searchText: entry.caught ? `${entry.name} ${habitat}`.trim() : '',
  };
}

function toDexViewModel(dex: MyDex): DexViewModel | null {
  if (dex.fishes.length === 0) return null;

  // 서버 값이 어긋나도(음수·초과) 화면이 깨지지 않게 범위를 눌러 둔다
  const total = Math.max(0, dex.totalCount);
  const collected = Math.min(Math.max(0, dex.caughtCount), total);

  return {
    species: dex.fishes.map(toDexSpecies),
    collected,
    total,
    progressPercent: total === 0 ? 0 : Math.round((collected / total) * 100),
  };
}

export function useDexViewModel(dataSource: DexDataSource) {
  const [query, setQuery] = useState('');
  const [state, retry] = useSection(dataSource, loadMyDex, toDexViewModel);

  const trimmedQuery = query.trim();

  /**
   * 검색은 이미 받아 둔 목록을 걸러 내기만 한다 (서버 왕복 없음).
   * 도감은 24종 규모라 클라이언트 필터로 충분하다.
   * 아직 목록을 못 받았으면 null — 화면이 로딩·오류를 그대로 보여준다.
   */
  const results = useMemo(() => {
    if (state.status !== 'ready') return null;
    if (trimmedQuery === '') return state.data.species;

    return state.data.species.filter((s) => s.searchText.includes(trimmedQuery));
  }, [state, trimmedQuery]);

  return {
    state,
    results,
    query,
    setQuery,
    retry,
    /** 검색 중에는 완성도 카드를 감춘다 (Figma "도감 검색" 634:1359) */
    isSearching: trimmedQuery !== '',
  };
}

/** 어종 정보와 내 인증 기록을 상세 카드 한 장으로 합친다 */
export function toDexSpeciesDetail(
  fish: FishDetail,
  record: CatchRecord,
): DexSpeciesDetailViewModel {
  return {
    name: fish.name,
    maxSizeLabel: fish.maxSizeCm === undefined ? null : `최대 크기 ${fish.maxSizeCm}cm`,
    imageUrl: fish.imageUrl,
    description: fish.description,
    habitatLabel: fish.habitat ? `주요 서식지: ${fish.habitat}` : null,
    catchLabel: `잡은 횟수: ${record.catchCount}회`,
    photos: record.recentCatches,
  };
}

interface DetailSource {
  dataSource: DexDataSource;
  fishId: number;
}

function loadDetail({ dataSource, fishId }: DetailSource) {
  return Promise.all([dataSource.getFish(fishId), dataSource.getCatchRecord(fishId)]);
}

function toDetail([fish, record]: [FishDetail, CatchRecord]) {
  return toDexSpeciesDetail(fish, record);
}

/**
 * 어종 상세 — 어종 정보(GET /api/fish/{id})와 내 인증 기록(GET /api/collections?fishId=)을
 * 함께 받아 합친다. 둘 중 하나만 실패해도 오류다.
 *
 * fishId가 바뀌어도 다시 받지 않는다. 쓰는 쪽이 key={fishId}로 컴포넌트를 새로 올린다.
 */
export function useDexDetailViewModel(dataSource: DexDataSource, fishId: number) {
  const source = useMemo(() => ({ dataSource, fishId }), [dataSource, fishId]);
  return useSection(source, loadDetail, toDetail);
}
