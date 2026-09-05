import { useCallback, useRef, useState } from 'react';

import type { CatchDataSource, ClassifyResponse } from '@/features/catch/catch-data';
import { toDexSpeciesDetail } from '@/features/dex/use-dex-view-model';
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
      imageUrl: string;
      sizeCm: number;
      location: string;
      /** 도감에 없는 어종(기타어종)은 서버가 받지 않아 기기에만 남는다 */
      unsupported: boolean;
    };

export function useCatchFlow(dataSource: CatchDataSource) {
  const [state, setState] = useState<CatchStep>({ step: 'capture' });
  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  // 뒤로가기(취소)나 재시도 뒤에 늦게 도착한 응답을 버리기 위한 실행 번호
  const analysisRun = useRef(0);
  const registerRun = useRef(0);
  // 버튼 연타로 verify가 두 번 나가지 않게 state보다 먼저 잠근다
  const registeringRef = useRef(false);

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

  const register = useCallback(async () => {
    if (
      state.step !== 'result' ||
      state.sizeCm === null ||
      state.fishName.trim() === '' ||
      registeringRef.current
    )
      return;

    const { photoUri, location } = state;
    const name = state.fishName.trim();
    const size = state.sizeCm;
    const run = ++registerRun.current;
    registeringRef.current = true;
    setRegistrationError(null);
    setRegistering(true);
    try {
      let fishId = state.fishId;
      if (fishId === null) {
        const species = await dataSource.listSpecies().catch(() => []);
        if (run !== registerRun.current) return;
        fishId = species.find((s) => s.name === name)?.id ?? null;
      }

      // 도감 밖 어종은 서버 verify가 받을 fishId가 없다 — 화면 흐름만 끝까지 간다
      if (fishId === null) {
        setState({
          step: 'registered',
          detail: toDexSpeciesDetail({
            id: 0,
            name,
            description: '',
            habitat: '',
            collected: true,
            catchCount: 1,
          }),
          imageUrl: photoUri,
          sizeCm: size,
          location,
          unsupported: true,
        });
        return;
      }

      const verified = await dataSource.verify({
        fishId,
        size,
        photoUri,
        location: location || undefined,
      });
      if (run !== registerRun.current) return;
      // 등록은 이미 끝났다. 설명을 못 받아도 완료 화면으로 간다 — 다시 누르면 중복 등록이 된다
      const fish = await dataSource.getFish(verified.fishId).catch(() => null);
      if (run !== registerRun.current) return;
      setState({
        step: 'registered',
        detail: toDexSpeciesDetail({
          id: verified.fishId,
          name: verified.fishName,
          description: fish?.description ?? '',
          habitat: fish?.habitat ?? '',
          collected: true,
          catchCount: verified.catchCount,
        }),
        imageUrl: verified.imageUrl,
        sizeCm: verified.size,
        location: verified.location ?? location,
        unsupported: false,
      });
    } catch {
      if (run !== registerRun.current) return;
      setRegistrationError('도감에 등록하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (run === registerRun.current) {
        registeringRef.current = false;
        setRegistering(false);
      }
    }
  }, [dataSource, state]);

  /** 처음으로. 진행 중인 분석·등록 응답은 버린다 */
  const retake = useCallback(() => {
    analysisRun.current += 1;
    registerRun.current += 1;
    registeringRef.current = false;
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
