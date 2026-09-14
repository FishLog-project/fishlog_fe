import type { RankingEntry, RankingMetric } from './api';

/** 아직 기록이 없어 보여줄 수치가 없을 때 */
const BLANK = '-';

/**
 * 목록 오른쪽에 붙는 값.
 *
 * 크기는 서버가 cm로 내려준다(Swagger `maxSize`). 시안에는 m로 적힌 칸이 있지만
 * 단위를 섞으면 카드("최대 크기 38cm")와 어긋나므로 cm로 통일한다.
 */
export function formatRankValue(entry: RankingEntry, metric: RankingMetric): string {
  if (metric === 'COMPLETION') {
    return entry.completionRate === null ? BLANK : `${entry.completionRate}%`;
  }
  return entry.maxSize === null ? BLANK : `${entry.maxSize}cm`;
}

/** "나의 순위" 카드의 보조 문구 */
export function formatMyRankMeta(
  entry: RankingEntry,
  metric: RankingMetric,
  totalFishCount: number | null,
): string {
  if (metric === 'COMPLETION') {
    if (entry.caughtCount === null || entry.completionRate === null) {
      return '아직 인증한 어종이 없어요';
    }
    const total = totalFishCount === null ? BLANK : totalFishCount;
    return `${entry.caughtCount}/${total}종 (${entry.completionRate}%)`;
  }
  return entry.maxSize === null ? '아직 인증한 어종이 없어요' : `최대 크기 ${entry.maxSize}cm`;
}
