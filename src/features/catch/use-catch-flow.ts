import { useCallback, useEffect, useRef, useState } from 'react';

import type { CatchDataSource, ClassifyResponse } from '@/features/catch/catch-data';
import { toCustomSpeciesDetail, toDexSpeciesDetail } from '@/features/dex/use-dex-view-model';
import type { DexSpeciesDetailViewModel } from '@/features/dex/use-dex-view-model';

type CandidateStep = {
  step: 'candidates';
  photoUri: string;
  result: ClassifyResponse;
  selectedFishId: number | null;
};

type ErrorStep = {
  step: 'error';
  photoUri: string;
  /** empty: 후보가 하나도 없음 · failed: 분류 요청 실패 */
  reason: 'empty' | 'failed';
};

export type CatchStep =
  | { step: 'capture' }
  | { step: 'analyzing'; photoUri: string }
  | CandidateStep
  | ErrorStep
  | {
      step: 'result';
      photoUri: string;
      /** 직접 입력 경로는 등록 시점에 이름으로 찾는다 */
      fishId: number | null;
      fishName: string;
      manual: boolean;
      /** verify에 필수. 분류가 크기를 안 주면 null로 시작해 사용자가 입력한다 */
      sizeCm: number | null;
      location: string;
    }
  | {
      step: 'registered';
      detail: DexSpeciesDetailViewModel;
    };

export function useCatchFlow(dataSource: CatchDataSource) {
  const [state, setState] = useState<CatchStep>({ step: 'capture' });
  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  // 뒤로가기(취소)나 재시도 뒤에 늦게 도착한 응답을 버리기 위한 실행 번호
  const analysisRun = useRef(0);
  const registerRun = useRef(0);
  // 성공 직후 이전 onPress가 다시 실행돼도 같은 사진을 재등록하지 않는다.
  const registrationStatusRef = useRef<'idle' | 'saving' | 'saved'>('idle');
  const detailGeneration = useRef(0);
  // 토큰 회전은 진행 중 저장을 취소하지 않고, 이전 소스의 상세 보완만 무효화한다.
  useEffect(() => () => { detailGeneration.current += 1; }, [dataSource]);

  const analyze = useCallback(
    async (photoUri: string) => {
      const run = ++analysisRun.current;
      setState({ step: 'analyzing', photoUri });
      try {
        const result = await dataSource.classify(photoUri);
        if (run !== analysisRun.current) return;
        setState(
          result.candidates.length > 0
            ? { step: 'candidates', photoUri, result, selectedFishId: null }
            : { step: 'error', photoUri, reason: 'empty' },
        );
      } catch {
        if (run !== analysisRun.current) return;
        setState({ step: 'error', photoUri, reason: 'failed' });
      }
    },
    [dataSource],
  );

  const selectCandidate = useCallback((fishId: number) => {
    setState((current) =>
      current.step === 'candidates' ? { ...current, selectedFishId: fishId } : current,
    );
  }, []);

  const confirmCandidate = useCallback(() => {
    setState((current) => {
      if (current.step !== 'candidates') return current;
      const picked = current.result.candidates.find((c) => c.fishId === current.selectedFishId);
      return picked
        ? {
            step: 'result',
            photoUri: current.photoUri,
            fishId: picked.fishId,
            fishName: picked.name,
            manual: false,
            sizeCm: picked.sizeCm ?? null,
            location: '',
          }
        : current;
    });
  }, []);

  /** 후보에 정답이 없을 때 — 어종명을 직접 적는다 (Figma 인증 9) */
  const startManual = useCallback(() => {
    setState((current) =>
      current.step === 'candidates' || current.step === 'error'
        ? {
            step: 'result',
            photoUri: current.photoUri,
            fishId: null,
            fishName: '',
            manual: true,
            sizeCm: null,
            location: '',
          }
        : current,
    );
  }, []);

  const setFishName = useCallback((fishName: string) => {
    setState((current) =>
      current.step === 'result' && current.manual ? { ...current, fishName, fishId: null } : current,
    );
  }, []);

  const setSizeCm = useCallback((sizeCm: number) => {
    setState((current) => (current.step === 'result' ? { ...current, sizeCm } : current));
  }, []);

  const setLocation = useCallback((location: string) => {
    setState((current) => (current.step === 'result' ? { ...current, location } : current));
  }, []);

  /** 저장 결과까지만 기다린다. 후속 상세 조회는 완료 화면과 이동을 지연시키지 않는다. */
  const register = useCallback(async () => {
    if (
      state.step !== 'result' ||
      state.sizeCm === null ||
      !Number.isFinite(state.sizeCm) ||
      state.sizeCm <= 0 ||
      state.sizeCm > 300 ||
      state.fishName.trim() === '' ||
      state.fishName.trim().length > 30 ||
      state.location.trim().length > 100 ||
      state.photoUri.trim() === '' ||
      registrationStatusRef.current !== 'idle'
    )
      return;

    const { photoUri } = state;
    const location = state.location.trim();
    const name = state.fishName.trim();
    const size = state.sizeCm;
    const run = ++registerRun.current;
    const generation = detailGeneration.current;
    const updateDetail = (detail: DexSpeciesDetailViewModel) => {
      if (run !== registerRun.current || generation !== detailGeneration.current) return;
      setState((current) => current.step === 'registered' ? { ...current, detail } : current);
    };
    registrationStatusRef.current = 'saving';
    setRegistrationError(null);
    setRegistering(true);
    try {
      let fishId = state.fishId;
      if (fishId === null) {
        const species = await dataSource.listSpecies();
        if (run !== registerRun.current) return;
        fishId = species.find((s) => s.name === name)?.id ?? null;
      }

      if (fishId === null) {
        const verified = await dataSource.verifyCustom({
          fishName: name, size, photoUri, location: location || undefined,
        });
        if (run !== registerRun.current) return;
        // POST 성공으로 완료를 확정한다. 상세가 끝나지 않아도 저장 잠금을 풀 수 있다.
        registrationStatusRef.current = 'saved';
        setState({
          step: 'registered',
          detail: {
            custom: true,
            name: verified.fishName,
            imageUrl: null,
            description: '',
            maxSizeLabel: null,
            habitatLabel: verified.habitat ? `주요 서식지: ${verified.habitat}` : null,
            // POST는 누적 횟수를 주지 않는다. 조회 실패를 1회로 추측하지 않는다.
            catchLabel: null,
            photos: [{
              catchRecordId: verified.customCatchRecordId,
              imageUrl: verified.imageUrl,
              size: verified.size,
              location: verified.location,
              verifiedAt: verified.registeredAt,
            }],
          },
        });
        // custom ID는 일반 fish ID와 별개다. 후속 조회는 완료 화면만 보완한다.
        void Promise.resolve()
          .then(() => dataSource.getCustomFish(verified.customFishId))
          .then((record) => updateDetail(toCustomSpeciesDetail(record)))
          .catch(() => {});
        return;
      }

      const verified = await dataSource.verify({
        fishId,
        size,
        photoUri,
        location: location || undefined,
      });
      if (run !== registerRun.current) return;
      const record = {
        habitat: null,
        catchCount: verified.catchCount,
        recentCatches: [{
          catchRecordId: verified.catchRecordId,
          imageUrl: verified.imageUrl,
          size: verified.size,
          location: verified.location ?? (location || null),
          verifiedAt: 'verifiedAt' in verified && typeof verified.verifiedAt === 'string'
            ? verified.verifiedAt : new Date().toISOString(),
        }],
      };
      registrationStatusRef.current = 'saved';
      setState({
        step: 'registered',
        detail: toDexSpeciesDetail(
          {
            id: verified.fishId,
            name: verified.fishName,
            description: '',
            habitat: null,
            imageUrl: null,
            rarity: 'LOW',
          },
          record,
        ),
      });
      void Promise.resolve()
        .then(() => dataSource.getFish(verified.fishId))
        .then((fish) => updateDetail(toDexSpeciesDetail(fish, { ...record, habitat: fish.habitat })))
        .catch(() => {});
    } catch {
      if (run !== registerRun.current) return;
      setRegistrationError('도감에 등록하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (run === registerRun.current) {
        if (registrationStatusRef.current === 'saving') registrationStatusRef.current = 'idle';
        setRegistering(false);
      }
    }
  }, [dataSource, state]);

  /** 처음으로. 분석은 취소할 수 있지만 서버 저장 중에는 사진과 결과를 유지한다. */
  const retake = useCallback(() => {
    if (registrationStatusRef.current === 'saving') return;
    analysisRun.current += 1;
    registerRun.current += 1;
    registrationStatusRef.current = 'idle';
    setRegistering(false);
    setRegistrationError(null);
    setState({ step: 'capture' });
  }, []);

  return {
    state,
    registering,
    registrationError,
    analyze,
    selectCandidate,
    confirmCandidate,
    startManual,
    setFishName,
    setSizeCm,
    setLocation,
    register,
    retake,
  };
}
