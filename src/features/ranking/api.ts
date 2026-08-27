/**
 * 랭킹 API.
 * 스펙: https://api.fishlog.xyz/v3/api-docs
 */
import { apiRequest } from '@/lib/api/client';
import { type Fail, toFail } from '@/lib/api/result';

/** 순위를 매기는 기준 */
export type RankingMetric = 'COMPLETION' | 'SIZE';

/**
 * 순위 한 줄.
 *
 * 기준에 따라 채워지는 값이 다르다. 서버가 쓰지 않는 필드는 null로 내려주므로
 * 화면은 metric을 보고 어떤 값을 읽을지 정한다.
 */
export type RankingEntry = {
  /** 기록이 없으면 null */
  rank: number | null;
  userId: number;
  nickname: string;
  /** COMPLETION 전용 — 인증한 어종 수 */
  caughtCount: number | null;
  /** COMPLETION 전용 — 도감 완성도(%) */
  completionRate: number | null;
  /** SIZE 전용 — 잡은 어종의 최대 크기(cm) */
  maxSize: number | null;
};

export type Ranking = {
  metric: RankingMetric;
  /** COMPLETION 전용 — 완성도의 분모가 되는 전체 어종 수 */
  totalFishCount: number | null;
  /** 토큰을 함께 보냈을 때만 채워진다 (비로그인은 null) */
  me: RankingEntry | null;
  rankings: RankingEntry[];
};

export type RankingResult = { ok: true; data: Ranking } | Fail<'unauthorized'>;

const PATHS: Record<RankingMetric, string> = {
  COMPLETION: '/api/rankings/completion',
  SIZE: '/api/rankings/size',
};

/**
 * 랭킹 조회. GET /api/rankings/{completion|size}
 *
 * 목록 자체는 공개라 토큰 없이도 부를 수 있다. 토큰을 함께 보내면 서버가
 * 내 순위(`me`)를 같이 계산해 준다 — 게스트는 토큰이 없으므로 me가 null이다.
 * 토큰을 보냈는데 무효하면 401이다(아예 안 보낸 경우는 401이 아니다).
 */
export async function getRanking(
  metric: RankingMetric,
  token: string | null,
): Promise<RankingResult> {
  try {
    const data = await apiRequest<Ranking>(PATHS[metric], { token });
    return { ok: true, data };
  } catch (e) {
    return toFail(e, {
      401: {
        reason: 'unauthorized',
        message: '로그인 정보가 만료됐어요. 다시 로그인해 주세요.',
      },
    });
  }
}
