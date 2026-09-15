/**
 * 낚시 인증 기록 데이터 인터페이스 + fixture 어댑터.
 *
 * 타입은 서버 응답 모양을 그대로 따른다. GET /api/collections/records
 * 도감 어종(DEX)과 직접 등록한 기타 어종(CUSTOM)이 한 목록에 섞여 내려온다.
 */

export type CatchRecordType = 'DEX' | 'CUSTOM';

export interface CatchHistoryRecord {
  recordId: number;
  recordType: CatchRecordType;
  fishId: number;
  fishName: string;
  /** cm */
  size: number;
  imageUrl: string;
  location: string | null;
  /** ISO datetime */
  recordedAt: string;
}

export interface CatchHistory {
  totalCount: number;
  dexCount: number;
  customCount: number;
  records: readonly CatchHistoryRecord[];
}

export interface CatchHistoryDataSource {
  getHistory(): Promise<CatchHistory>;
}

export type CatchHistoryFixtureScenario = 'ready' | 'empty' | 'error';

/** [어종, 크기(cm), 인증 시각] — 시안처럼 하루에 여러 건이 쌓이도록 흩어 둔다 */
const SEED: readonly (readonly [string, number, string])[] = [
  ['감성돔', 32, '2026-07-10T18:12:00'],
  ['우럭', 24, '2026-07-10T15:40:00'],
  ['광어', 41, '2026-07-10T09:05:00'],
  ['볼락', 18, '2026-07-09T20:31:00'],
  ['참돔', 37, '2026-07-09T17:22:00'],
  ['고등어', 26, '2026-07-09T11:48:00'],
  ['전갱이', 21, '2026-07-09T08:15:00'],
  ['붕어', 29, '2026-07-03T14:02:00'],
  ['배스', 35, '2026-07-01T19:44:00'],
  ['잉어', 52, '2026-07-01T16:20:00'],
  ['메기', 44, '2026-07-01T12:37:00'],
  ['뚱어', 20, '2026-07-01T07:59:00'],
];

const records: readonly CatchHistoryRecord[] = SEED.map(
  ([fishName, size, recordedAt], index) => ({
    recordId: index + 1,
    // 마지막 한 건만 직접 등록한 기타 어종이다
    recordType: index === SEED.length - 1 ? 'CUSTOM' : 'DEX',
    fishId: index + 1,
    fishName,
    size,
    imageUrl: '',
    location: index % 3 === 0 ? '땡땡저수지' : null,
    recordedAt,
  }),
);

const history: CatchHistory = {
  totalCount: records.length,
  dexCount: records.filter((record) => record.recordType === 'DEX').length,
  customCount: records.filter((record) => record.recordType === 'CUSTOM').length,
  records,
};

export function createFixtureCatchHistoryDataSource(
  scenario: CatchHistoryFixtureScenario = 'ready',
): CatchHistoryDataSource {
  if (scenario === 'error') {
    return { getHistory: () => Promise.reject(new Error('fixture: history error')) };
  }

  if (scenario === 'empty') {
    return {
      getHistory: () =>
        Promise.resolve({ totalCount: 0, dexCount: 0, customCount: 0, records: [] }),
    };
  }

  return { getHistory: () => Promise.resolve(history) };
}
