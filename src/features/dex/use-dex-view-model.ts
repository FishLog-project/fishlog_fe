import { useMemo, useState } from 'react';

import type { DexDataSource, DexSpecies } from '@/features/dex/dex-data';
import { useSection } from '@/lib/use-section';

export interface DexSpeciesViewModel {
  id: string;
  /** 잠금 카드는 이름을 감춘다 — 화면이 아니라 여기서 결정한다 */
  label: string;
  collected: boolean;
  accessibilityLabel: string;
  /**
   * 검색이 훑는 텍스트 ("어종명 서식지").
   * 미획득 어종은 빈 문자열이라 어떤 검색어에도 안 걸린다 —
   * 화면에 이름이 '???'로 나오는데 이름으로 검색되면 정답을 흘리는 셈이라서다.
   */
  searchText: string;
  /**
   * 상세 카드에 띄울 내용. 미획득 어종은 null이다 —
   * 이름·설명·서식지가 곧 정답이라 잠금 카드에서는 아예 들려 보내지 않는다.
   */
  detail: DexSpeciesDetailViewModel | null;
}

export interface DexSpeciesDetailViewModel {
  name: string;
  description: string;
  /** "주요 서식지: 강" */
  habitatLabel: string;
  /** "잡은 횟수: 3회" */
  catchLabel: string;
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

function loadSpecies(dataSource: DexDataSource) {
  return dataSource.getSpecies();
}

function toDexViewModel(species: readonly DexSpecies[]): DexViewModel | null {
  if (species.length === 0) return null;

  const collected = species.filter((s) => s.collected).length;

  return {
    species: species.map((s) => ({
      id: s.id,
      label: s.collected ? s.name : LOCKED_LABEL,
      collected: s.collected,
      accessibilityLabel: s.collected
        ? `${s.name}, 서식지 ${s.habitat}`
        : '아직 잡지 못한 어종',
      searchText: s.collected ? `${s.name} ${s.habitat}` : '',
      detail: s.collected
        ? {
            name: s.name,
            description: s.description,
            habitatLabel: `주요 서식지: ${s.habitat}`,
            catchLabel: `잡은 횟수: ${s.catchCount}회`,
          }
        : null,
    })),
    collected,
    total: species.length,
    progressPercent: Math.round((collected / species.length) * 100),
  };
}

export function useDexViewModel(dataSource: DexDataSource) {
  const [query, setQuery] = useState('');
  const [state, retry] = useSection(dataSource, loadSpecies, toDexViewModel);

  const trimmedQuery = query.trim();

  /**
   * 검색은 이미 받아 둔 목록을 걸러 내기만 한다 (서버 왕복 없음).
   * 도감은 50종 규모라 클라이언트 필터로 충분하다.
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
    /** 검색 중에는 완성도 카드를 감춘다 (Figma "도감 검색" 323:1212) */
    isSearching: trimmedQuery !== '',
  };
}
