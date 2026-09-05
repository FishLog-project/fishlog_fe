/**
 * 낚시 인증 데이터 인터페이스 + fixture 어댑터.
 *
 * 도감(`dex-data.ts`)과 같은 방식이다. 화면은 CatchDataSource만 알고,
 * 서버 구현이 나오면 갈아끼운다. 요청·응답 타입은 fishlog_be DTO 모양을
 * 그대로 따른다 (BaseResponse<T>의 data 부분). ID는 number, 이미지는 imageUrl.
 */

import {
  createFixtureDexDataSource,
  recordFixtureCatch,
} from '@/features/dex/dex-data';

/** POST /api/collections/classify 응답의 후보 한 종 (Top-3) */
export interface ClassifyCandidate {
  rank: number;
  fishId: number;
  name: string;
  imageUrl: string | null;
  /** 0~1 */
  confidence: number;
  /** 분류 API는 크기를 주지 않는다. fixture만 채우고, 없으면 결과 화면에서 입력받는다 */
  sizeCm?: number;
}

/** POST /api/collections/classify 응답 */
export interface ClassifyResponse {
  modelVersion: string;
  /** true여도 후보는 그대로 온다. guide(재촬영 권고)를 후보 위에 보여준다 */
  uncertain: boolean;
  guide: string;
  candidates: readonly ClassifyCandidate[];
}

/** POST /api/collections/verify 요청 (multipart) */
export interface VerifyRequest {
  fishId: number;
  /** cm. 필수 — 분류가 크기를 안 주므로 결과 화면에서 확인·입력받는다 */
  size: number;
  /** image 필드로 올릴 기기 로컬 경로 */
  photoUri: string;
  /** 최대 100자 */
  location?: string;
}

/** POST /api/collections/verify 응답 */
export interface VerifyResponse {
  catchRecordId: number;
  fishId: number;
  fishName: string;
  imageUrl: string;
  size: number;
  location: string | null;
  firstCatch: boolean;
  catchCount: number;
}

export interface SpeciesOption {
  id: number;
  name: string;
}

/** GET /api/fish/{id} 응답 중 등록 완료 카드가 쓰는 부분 (imageUrl·rarity는 생략) */
export interface FishDetailResponse {
  id: number;
  name: string;
  description: string;
  habitat: string;
}

export interface CatchDataSource {
  /** 촬영 사진으로 어종 후보를 받는다 */
  classify(photoUri: string): Promise<ClassifyResponse>;
  /** 어종·크기·사진을 도감에 등록한다 */
  verify(request: VerifyRequest): Promise<VerifyResponse>;
  /** 등록 완료 카드의 설명·서식지 */
  getFish(fishId: number): Promise<FishDetailResponse>;
  /** 직접 입력한 어종명을 도감 fishId로 맞추는 데 쓴다 */
  listSpecies(): Promise<readonly SpeciesOption[]>;
}

/**
 * fixture 시나리오 (`/catch?fixture=…`).
 * - ready: 후보 3종
 * - uncertain: 같은 후보 + uncertain·guide (재촬영 권고 문구)
 * - fail: 분류가 첫 번째만 실패한다 (실패 → 재시도 → 성공)
 * - slow: 분류가 오래 걸린다 (분석 중 뒤로가기 취소 확인용)
 * - register-fail: 등록이 첫 번째만 실패한다 (실패 → 재시도 → 성공)
 */
export const CATCH_FIXTURE_SCENARIOS = [
  'ready',
  'uncertain',
  'fail',
  'slow',
  'register-fail',
] as const;
export type CatchFixtureScenario = (typeof CATCH_FIXTURE_SCENARIOS)[number];

/** 분석이 오래 걸리는 것처럼 보이게 하는 지연 */
const CLASSIFY_DELAY_MS = 1800;
const SLOW_CLASSIFY_DELAY_MS = 8000;
const VERIFY_DELAY_MS = 600;

function resolveAfter<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function rejectAfter(message: string, ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms),
  );
}

/** Figma 인증 3(689:2264)의 후보 3종. fishId는 도감 fixture의 id다 */
const CANDIDATES: readonly ClassifyCandidate[] = [
  { rank: 1, fishId: 1, name: '광어', imageUrl: null, confidence: 0.72, sizeCm: 20 },
  { rank: 2, fishId: 11, name: '도다리', imageUrl: null, confidence: 0.18, sizeCm: 18 },
  { rank: 3, fishId: 12, name: '가자미', imageUrl: null, confidence: 0.1, sizeCm: 22 },
];

const UNCERTAIN_GUIDE =
  '사진이 흐려 확신이 낮아요. 물고기가 잘 보이게 다시 촬영하면 더 정확해져요.';

export function createFixtureCatchDataSource(
  scenario: CatchFixtureScenario = 'ready',
): CatchDataSource {
  let failNextClassify = scenario === 'fail';
  let failNextVerify = scenario === 'register-fail';
  const dex = createFixtureDexDataSource();

  return {
    classify() {
      if (failNextClassify) {
        failNextClassify = false;
        return rejectAfter('어종 분류 fixture가 실패했습니다.', CLASSIFY_DELAY_MS);
      }
      return resolveAfter(
        {
          modelVersion: 'fixture',
          uncertain: scenario === 'uncertain',
          guide: scenario === 'uncertain' ? UNCERTAIN_GUIDE : '',
          candidates: CANDIDATES,
        },
        scenario === 'slow' ? SLOW_CLASSIFY_DELAY_MS : CLASSIFY_DELAY_MS,
      );
    },
    async verify({ fishId, size, photoUri, location }) {
      if (failNextVerify) {
        failNextVerify = false;
        await rejectAfter('도감 등록 fixture가 실패했습니다.', VERIFY_DELAY_MS);
      }
      // 서버였다면 verify가 DB를 바꾸는 자리 — 도감 fixture에 획득·횟수를 반영한다
      const recorded = recordFixtureCatch(fishId);
      if (!recorded) throw new Error('도감에 없는 어종입니다.');
      return resolveAfter(
        {
          catchRecordId: Date.now(),
          fishId,
          fishName: recorded.name,
          // 서버는 업로드된 이미지 URL을 준다. fixture는 로컬 경로를 그대로 돌려준다
          imageUrl: photoUri,
          size,
          location: location ?? null,
          firstCatch: recorded.firstCatch,
          catchCount: recorded.catchCount,
        },
        VERIFY_DELAY_MS,
      );
    },
    async getFish(fishId) {
      const found = (await dex.getSpecies()).find((s) => s.id === fishId);
      if (!found) throw new Error('어종 정보를 찾지 못했습니다.');
      const { id, name, description, habitat } = found;
      return { id, name, description, habitat };
    },
    async listSpecies() {
      return (await dex.getSpecies()).map(({ id, name }) => ({ id, name }));
    },
  };
}
