import type {
  CatchHistory,
  CatchHistoryDataSource,
  CatchHistoryRecord,
  CatchRecordType,
} from '@/features/catch/catch-history-data';
import { useSection } from '@/lib/use-section';

export interface CatchRecordItemViewModel {
  recordId: number;
  recordType: CatchRecordType;
  /** "감성돔 (32cm)" */
  label: string;
}

/** 날짜 하나에 묶인 인증 기록 (Figma 666:3649) */
export interface CatchRecordGroupViewModel {
  /** 같은 날짜를 다시 묶지 않도록 쓰는 키 (YYYY-MM-DD) */
  date: string;
  /** "2026년 7월 10일" */
  dateLabel: string;
  items: readonly CatchRecordItemViewModel[];
}

function loadHistory(dataSource: CatchHistoryDataSource) {
  return dataSource.getHistory();
}

/**
 * "2026-07-10T18:12:00" → ["2026-07-10", "2026년 7월 10일"].
 *
 * 서버가 KST 기준으로 내려주므로 문자열의 날짜 부분을 그대로 쓴다.
 * Date 로 파싱하면 기기 시간대에 따라 하루가 밀릴 수 있다.
 */
function toDateParts(recordedAt: string): readonly [string, string] | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(recordedAt);
  if (!matched) return null;

  const [, year, month, day] = matched;
  return [`${year}-${month}-${day}`, `${year}년 ${Number(month)}월 ${Number(day)}일`];
}

/** 20 → "20cm", 20.5 → "20.5cm" (서버가 double 이라 정수면 소수점을 떼어 낸다) */
function toSizeLabel(size: number): string {
  return `${Number.isInteger(size) ? size : Number(size.toFixed(1))}cm`;
}

function toItem(record: CatchHistoryRecord): CatchRecordItemViewModel {
  return {
    recordId: record.recordId,
    recordType: record.recordType,
    label: `${record.fishName} (${toSizeLabel(record.size)})`,
  };
}

/**
 * 인증 기록을 날짜별로 묶는다 (최신 날짜가 위).
 *
 * 서버 정렬을 믿지 않고 여기서 다시 정렬한다 — 계약에 정렬 보장이 없다.
 * 날짜를 못 읽는 기록은 묶을 자리가 없어 건너뛴다.
 */
function toGroups(history: CatchHistory): readonly CatchRecordGroupViewModel[] | null {
  if (history.records.length === 0) return null;

  const buckets = new Map<string, { dateLabel: string; records: CatchHistoryRecord[] }>();

  for (const record of history.records) {
    const parts = toDateParts(record.recordedAt);
    if (!parts) continue;

    const [date, dateLabel] = parts;
    const bucket = buckets.get(date) ?? { dateLabel, records: [] };
    bucket.records.push(record);
    buckets.set(date, bucket);
  }

  if (buckets.size === 0) return null;

  return [...buckets.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, bucket]) => ({
      date,
      dateLabel: bucket.dateLabel,
      items: bucket.records
        .slice()
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .map(toItem),
    }));
}

export function useCatchHistory(dataSource: CatchHistoryDataSource) {
  return useSection(dataSource, loadHistory, toGroups);
}
