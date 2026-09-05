import { Asset } from 'expo-asset';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppDialog,
  PrimaryButton,
  Screen,
  ScreenHeader,
  ScreenState,
  TextField,
} from '@/components/common';
import { Brand, Components, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { createApiCatchDataSource } from '@/features/catch/catch-api';
import {
  CATCH_FIXTURE_SCENARIOS,
  createFixtureCatchDataSource,
} from '@/features/catch/catch-data';
import type { ClassifyResponse } from '@/features/catch/catch-data';
import { useCatchFlow } from '@/features/catch/use-catch-flow';
import type { CatchStep } from '@/features/catch/use-catch-flow';
import { SpeciesDetailCard } from '@/features/dex/components/species-detail-dialog';
import type { DexSpeciesDetailViewModel } from '@/features/dex/use-dex-view-model';
import { USE_FIXTURE } from '@/lib/data-source-mode';

const CATCH = Components.catch;
const DEX = Components.dex;

const SHUTTER = require('@/assets/images/catch/shutter.svg');
const ANALYSIS_ILLUSTRATION = require('@/assets/images/catch/analysis-fishing.png');
const CANDIDATE_ART = require('@/assets/images/catch/candidate-flatfish.png');
const PENCIL = require('@/assets/images/catch/pencil.svg');

/** 헤더 타이틀 — 인증 1~3은 "인증하기", 4~5는 "인증 결과" (Figma 634:3117 / 634:3151) */
const TITLE: Record<CatchStep['step'], string> = {
  capture: '물고기 인증하기',
  analyzing: '물고기 인증하기',
  candidates: '물고기 인증하기',
  error: '물고기 인증하기',
  result: '물고기 인증 결과',
  registered: '물고기 인증 결과',
};

/** 결과 화면에서 눌러서 고치는 값 */
type EditableFact = 'name' | 'size' | 'location';

/** 최종 Figma의 촬영 → 분석 → 후보 선택 → 결과 확인 → 등록 완료 흐름 (634:3106 ~ 634:3158). */
export default function CatchScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { fixture } = useLocalSearchParams<{ fixture?: string | string[] }>();
  const fixtureParam = Array.isArray(fixture) ? fixture[0] : fixture;
  const scenario = CATCH_FIXTURE_SCENARIOS.find((s) => s === fixtureParam) ?? 'ready';
  // 시뮬레이터처럼 카메라가 없을 때 fixture 파라미터가 있으면 번들 그림을 촬영 사진으로 쓴다
  const fixturePhotoUri =
    __DEV__ && fixtureParam ? Asset.fromModule(CANDIDATE_ART).uri : undefined;
  const dataSource = useMemo(
    () => (USE_FIXTURE ? createFixtureCatchDataSource(scenario) : createApiCatchDataSource(token)),
    [scenario, token],
  );
  const flow = useCatchFlow(dataSource);
  const { state, registering } = flow;

  const leaveRegistered = () => router.replace('/home');
  const onBack =
    state.step === 'capture'
      ? undefined
      : state.step === 'registered'
        ? leaveRegistered
        : flow.retake;

  if (!USE_FIXTURE && token === null) {
    return (
      <Screen edges={['top', 'bottom']} header={<ScreenHeader title={TITLE.capture} showBack />}>
        <View style={styles.loginWrap}>
          <ScreenState
            variant="empty"
            title="로그인하면 물고기를 인증할 수 있어요"
            description="인증한 물고기는 도감에 기록돼요."
            actionLabel="로그인하기"
            onAction={() => router.push('/auth/login')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      edgeToEdge
      header={
        <ScreenHeader
          title={TITLE[state.step]}
          showBack
          backDisabled={registering}
          onBack={onBack}
        />
      }>
      {state.step === 'capture' ? (
        <CaptureStep fixturePhotoUri={fixturePhotoUri} onCaptured={flow.analyze} />
      ) : state.step === 'analyzing' ? (
        <AnalyzingStep />
      ) : state.step === 'candidates' ? (
        <CandidateStep
          result={state.result}
          selectedFishId={state.selectedFishId}
          onSelect={flow.selectCandidate}
          onConfirm={flow.confirmCandidate}
          onRetake={flow.retake}
          onManual={flow.startManual}
        />
      ) : state.step === 'error' ? (
        <>
          <AnalyzingStep />
          <NoMatchDialog visible reason="failed" onRetake={flow.retake} onManual={flow.startManual} />
        </>
      ) : state.step === 'result' ? (
        <ResultStep
          photoUri={state.photoUri}
          fishName={state.fishName}
          manual={state.manual}
          sizeCm={state.sizeCm}
          location={state.location}
          registering={registering}
          registrationError={flow.registrationError}
          onNameChange={flow.setFishName}
          onSizeChange={flow.setSizeCm}
          onLocationChange={flow.setLocation}
          onRegister={flow.register}
          onRetake={flow.retake}
        />
      ) : (
        <RegisteredStep
          detail={state.detail}
          imageUrl={state.imageUrl}
          sizeCm={state.sizeCm}
          location={state.location}
          onDex={() => router.replace('/dex')}
          onHome={leaveRegistered}
        />
      )}
    </Screen>
  );
}

function StepCopy({ lines }: { lines: readonly string[] }) {
  return (
    <View style={styles.copy}>
      {lines.map((line) => (
        <Text key={line} style={styles.copyLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

/** 인증 1 (634:3106) — 카메라 미리보기와 셔터. 카메라를 못 쓰면 사진 보관함으로 대신한다. */
function CaptureStep({
  fixturePhotoUri,
  onCaptured,
}: {
  fixturePhotoUri?: string;
  onCaptured: (uri: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [mountFailed, setMountFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraAvailable =
    !fixturePhotoUri && permission?.granted === true && !mountFailed;
  const canCapture = Boolean(fixturePhotoUri) || (cameraAvailable && cameraReady);

  const requestCameraAccess = async () => {
    setError(null);
    try {
      if (permission && !permission.granted && !permission.canAskAgain) {
        await Linking.openSettings();
        return;
      }
      await requestPermission();
    } catch {
      setError('카메라 설정을 열지 못했어요. 설정 앱에서 권한을 확인해 주세요.');
    }
  };

  /** 권한 거부·시뮬레이터처럼 카메라를 못 쓸 때의 대체 경로 */
  const pickFromLibrary = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!picked.canceled) onCaptured(picked.assets[0].uri);
    } catch {
      setError('사진을 불러오지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    if (busy || !canCapture) return;
    if (fixturePhotoUri) {
      onCaptured(fixturePhotoUri);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) onCaptured(photo.uri);
    } catch {
      setError('촬영하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const status = mountFailed
    ? '카메라를 열지 못했어요'
    : !permission
      ? '카메라를 준비하고 있어요'
      : permission.canAskAgain
        ? '카메라 권한이 필요해요'
        : '카메라 권한이 꺼져 있어요';

  return (
    <View style={styles.page}>
      <StepCopy
        lines={[
          '잡은 물고기가 잘 보이게 촬영해 주세요',
          'AI가 물고기를 분석한 뒤 도감에 등록해요',
        ]}
      />

      <View style={styles.captureBody}>
        <View style={styles.preview}>
          {fixturePhotoUri ? (
            <Image
              source={{ uri: fixturePhotoUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : cameraAvailable ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
              onMountError={() => setMountFailed(true)}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>{status}</Text>
              {!permission?.granted ? (
                <Pressable
                  hitSlop={8}
                  accessibilityRole="button"
                  onPress={requestCameraAccess}>
                  <Text style={styles.placeholderLink}>
                    {permission && !permission.canAskAgain
                      ? '설정에서 권한 허용하기'
                      : '카메라 권한 허용하기'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={pickFromLibrary}>
                <Text style={styles.placeholderLink}>사진 보관함에서 선택하기</Text>
              </Pressable>
            </View>
          )}
          {error ? <Text style={styles.cameraError}>{error}</Text> : null}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.shutter,
            (!canCapture || busy) && styles.disabledControl,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="촬영하기"
          accessibilityState={{ disabled: !canCapture || busy, busy }}
          disabled={!canCapture || busy}
          onPress={takePhoto}>
          <Image source={SHUTTER} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Pressable>
      </View>
    </View>
  );
}

/** 인증 2 (634:3124) — 분석 중 일러스트 위에 안내 문구가 얹힌다. */
function AnalyzingStep() {
  return (
    <View style={styles.page}>
      <Image
        source={ANALYSIS_ILLUSTRATION}
        style={styles.analysisIllustration}
        contentFit="cover"
        accessibilityLabel="물고기 분석 중"
      />
      <StepCopy lines={['AI가 어종과 크기를 분석하고 있어요', '잠시만 기다려 주세요']} />
    </View>
  );
}

/**
 * 인증 3 (689:2264) — AI 후보 3종 중 하나를 고른다.
 * 아래 "이 어종이 아니신가요?" 줄은 보완안(917:2581)에서 왔다.
 */
function CandidateStep({
  result,
  selectedFishId,
  onSelect,
  onConfirm,
  onRetake,
  onManual,
}: {
  result: ClassifyResponse;
  selectedFishId: number | null;
  onSelect: (fishId: number) => void;
  onConfirm: () => void;
  onRetake: () => void;
  onManual: () => void;
}) {
  // 확신이 낮으면 후보 위에 안내를 한 번 띄운다. 취소하면 후보를 그대로 고를 수 있다 (인증 8)
  const [dialog, setDialog] = useState<'none' | 'uncertain' | 'no-match'>(
    result.uncertain ? 'uncertain' : 'none',
  );

  return (
    <ScrollView contentContainerStyle={styles.pageScroll} showsVerticalScrollIndicator={false}>
      <StepCopy lines={['이 중에 맞는 물고기를 선택해 주세요']} />

      <View style={styles.candidateList}>
        {result.candidates.slice(0, 3).map((candidate) => {
          const selected = candidate.fishId === selectedFishId;
          return (
            <Pressable
              key={candidate.fishId}
              style={({ pressed }) => [
                styles.candidateCard,
                selected && styles.candidateCardSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={candidate.name}
              onPress={() => onSelect(candidate.fishId)}>
              <Text style={styles.candidateName}>{candidate.name}</Text>
              <Image
                source={candidate.imageUrl ?? CANDIDATE_ART}
                style={styles.candidateImage}
                contentFit="contain"
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.candidateActions}>
        <PrimaryButton
          label="물고기 선택 완료"
          disabled={selectedFishId === null}
          onPress={onConfirm}
        />
        <PrimaryButton
          label="해당하는 어종이 없어요"
          variant="outline"
          onPress={() => setDialog('no-match')}
        />
      </View>

      <NoMatchDialog
        visible={dialog !== 'none'}
        reason={dialog === 'uncertain' ? 'failed' : 'no-match'}
        onRetake={onRetake}
        onManual={onManual}
        onCancel={() => setDialog('none')}
      />
    </ScrollView>
  );
}

/** 인증 7·8 — 재촬영 / 직접 입력 / 취소 */
function NoMatchDialog({
  visible,
  reason,
  onRetake,
  onManual,
  onCancel,
}: {
  visible: boolean;
  reason: 'no-match' | 'failed';
  onRetake: () => void;
  onManual: () => void;
  onCancel?: () => void;
}) {
  return (
    <AppDialog
      visible={visible}
      title={
        reason === 'no-match'
          ? '해당하는 어종이 없을 경우,\n재촬영 또는 직접 입력 가능해요.'
          : '사진이 흐리거나\n도감에 존재하지 않는 어종이에요.'
      }
      buttonLabel="다시 촬영하기"
      onConfirm={onRetake}
      secondaryLabel="직접 입력하기"
      onSecondary={onManual}
      onCancel={onCancel ?? onRetake}
    />
  );
}

/** 인증 4 (634:3140) — 어종·크기·잡은 위치를 확인하고 등록한다. */
function ResultStep({
  photoUri,
  fishName,
  manual,
  sizeCm,
  location,
  registering,
  registrationError,
  onNameChange,
  onSizeChange,
  onLocationChange,
  onRegister,
  onRetake,
}: {
  photoUri: string;
  fishName: string;
  manual: boolean;
  sizeCm: number | null;
  location: string;
  registering: boolean;
  registrationError: string | null;
  onNameChange: (name: string) => void;
  onSizeChange: (sizeCm: number) => void;
  onLocationChange: (location: string) => void;
  onRegister: () => void;
  onRetake: () => void;
}) {
  const [editing, setEditing] = useState<EditableFact | null>(null);
  const [draft, setDraft] = useState('');
  const parsedSize = Number(draft);
  const draftValid =
    editing === 'location' ||
    (editing === 'name' && draft.trim() !== '') ||
    (editing === 'size' && Number.isFinite(parsedSize) && parsedSize > 0 && parsedSize <= 1000);

  const openEditor = (field: EditableFact) => {
    setDraft(
      field === 'size' ? (sizeCm === null ? '' : String(sizeCm)) : field === 'name' ? fishName : location,
    );
    setEditing(field);
  };

  const save = () => {
    if (editing === null || !draftValid) return;
    if (editing === 'size') onSizeChange(parsedSize);
    else if (editing === 'name') onNameChange(draft.trim());
    else onLocationChange(draft.trim());
    setEditing(null);
  };

  const canRegister = sizeCm !== null && (!manual || fishName.trim() !== '');

  return (
    <ScrollView
      contentContainerStyle={styles.pageScroll}
      showsVerticalScrollIndicator={false}>
      <StepCopy lines={['물고기 인증이 완료되었어요!', '분석 결과를 확인해 주세요']} />
      <View style={styles.resultPhoto}>
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      </View>

      <View style={styles.factsCard}>
        {manual ? (
          <EditableFactRow
            label="어종"
            value={fishName || null}
            placeholder="눌러서 작성하기"
            disabled={registering}
            onPress={() => openEditor('name')}
          />
        ) : (
          <FactRow label="어종" value={fishName} />
        )}
        <EditableFactRow
          label="크기"
          value={sizeCm === null ? null : `약 ${sizeCm}cm`}
          placeholder="눌러서 작성하기"
          disabled={registering}
          onPress={() => openEditor('size')}
        />
        <EditableFactRow
          label="잡은 위치"
          value={location || null}
          placeholder="눌러서 작성하기"
          disabled={registering}
          onPress={() => openEditor('location')}
        />
      </View>

      {registrationError ? (
        <Text
          style={styles.registrationError}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite">
          {registrationError}
        </Text>
      ) : null}

      <View style={styles.resultActions}>
        <PrimaryButton
          label="이대로 도감에 등록하기"
          onPress={onRegister}
          loading={registering}
          disabled={!canRegister}
        />
        <PrimaryButton
          label="다시 촬영하기"
          variant="outline"
          disabled={registering}
          onPress={onRetake}
        />
      </View>

      <AppDialog
        visible={editing !== null}
        title={editing === 'size' ? '크기' : editing === 'name' ? '어종' : '잡은 위치'}
        message={editing === 'size' ? 'cm 단위로 입력해 주세요' : undefined}
        buttonLabel="저장하기"
        confirmDisabled={!draftValid}
        onConfirm={save}
        onCancel={() => setEditing(null)}>
        <TextField
          value={draft}
          onChangeText={setDraft}
          placeholder={editing === 'size' ? '예: 20' : editing === 'name' ? '예: 광어' : '예: 인천 영종도'}
          keyboardType={editing === 'size' ? 'decimal-pad' : 'default'}
          autoFocus
          maxLength={editing === 'location' ? 100 : 30}
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel={
            editing === 'size' ? '크기 입력' : editing === 'name' ? '어종 입력' : '잡은 위치 입력'
          }
        />
      </AppDialog>
    </ScrollView>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

/** 연필 + 값 (Figma 664:3429). 값이 없으면 안내 문구를 보여준다 */
function EditableFactRow({
  label,
  value,
  placeholder,
  disabled,
  onPress,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Pressable
        style={styles.factEdit}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label} ${value} 수정` : `${label} 입력`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}>
        <Image source={PENCIL} style={styles.pencil} contentFit="contain" />
        <Text numberOfLines={1} style={styles.factEditValue}>
          {value ?? placeholder}
        </Text>
      </Pressable>
    </View>
  );
}

/** 인증 5 (634:3158) — 등록된 어종의 도감 카드(665:3471)와 다음 이동. */
function RegisteredStep({
  detail,
  imageUrl,
  sizeCm,
  location,
  onDex,
  onHome,
}: {
  detail: DexSpeciesDetailViewModel;
  imageUrl: string;
  sizeCm: number;
  location: string;
  onDex: () => void;
  onHome: () => void;
}) {
  const [showingPhoto, setShowingPhoto] = useState(false);

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.pageScroll}
        showsVerticalScrollIndicator={false}>
        <StepCopy lines={['물고기가 도감에 등록되었어요!']} />
        <View style={styles.registeredCard}>
          <SpeciesDetailCard
            species={detail}
            verificationPhotoUri={imageUrl}
            onVerificationPhotoPress={() => setShowingPhoto(true)}
          />
        </View>
        <View style={styles.registeredActions}>
          <PrimaryButton label="도감 보러 가기" onPress={onDex} />
          <PrimaryButton label="홈화면으로 가기" variant="outline" onPress={onHome} />
        </View>
      </ScrollView>
      <VerificationPhotoModal
        visible={showingPhoto}
        imageUrl={imageUrl}
        sizeCm={sizeCm}
        location={location}
        onClose={() => setShowingPhoto(false)}
      />
    </>
  );
}

/** 인증샷 클릭 상태 (905:2553) — 사진과 위치·크기. 위치는 BE 미제공이라 로컬 값이다. */
function VerificationPhotoModal({
  visible,
  imageUrl,
  sizeCm,
  location,
  onClose,
}: {
  visible: boolean;
  imageUrl: string;
  sizeCm: number;
  location: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.modalScrim}
        accessibilityRole="button"
        accessibilityLabel="인증 사진 닫기"
        onPress={onClose}>
        <Pressable
          style={styles.verificationDialog}
          accessible
          accessibilityLabel={`인증 사진, 크기 약 ${sizeCm}센티미터, 잡은 위치 ${location || '미입력'}`}
          onPress={() => {}}>
          <Image source={{ uri: imageUrl }} style={styles.verificationPhoto} contentFit="cover" />
          <View style={styles.verificationFacts}>
            <FactRow label="잡은 위치" value={location || '미입력'} />
            <FactRow label="크기" value={`약 ${sizeCm}cm`} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageScroll: { flexGrow: 1 },
  /** 헤더 아래 44, 좌우 24 (Figma 634:3121) */
  copy: { marginTop: 44, marginHorizontal: 24 },
  copyLine: { ...Typography.stepTitle, color: Brand.textStrong },

  // 인증 1 — 미리보기 342x460, 셔터 68 (Figma 634:3122 / 634:3123)
  captureBody: { flex: 1, paddingTop: 36 },
  preview: {
    flex: 1,
    marginHorizontal: 24,
    backgroundColor: CATCH.previewBg,
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  placeholderText: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center' },
  placeholderLink: {
    ...Typography.caption,
    paddingVertical: 6,
    color: Brand.primaryDark,
    textDecorationLine: 'underline',
  },
  cameraError: {
    ...Typography.footnote,
    position: 'absolute',
    right: 12,
    bottom: 12,
    left: 12,
    padding: 8,
    borderRadius: 8,
    color: Brand.onPrimary,
    backgroundColor: Brand.scrim,
    textAlign: 'center',
  },
  shutter: {
    width: CATCH.shutterSize,
    height: CATCH.shutterSize,
    marginTop: 32,
    marginBottom: 14,
    alignSelf: 'center',
  },
  disabledControl: { opacity: 0.45 },
  pressed: { opacity: 0.82 },

  // 인증 2 — 일러스트가 헤더 아래 72에서 화면 폭으로 깔린다 (Figma 790:2297)
  analysisIllustration: {
    position: 'absolute',
    top: 72,
    right: 0,
    left: 0,
    width: '100%',
    aspectRatio: 1440 / 2560,
  },

  // 인증 3·6 — 224x140 카드, 간격 12 (Figma 1020:3109)
  candidateList: { marginTop: 28, gap: 12, alignItems: 'center' },
  candidateCard: {
    width: 224,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: DEX.cardBg,
  },
  candidateCardSelected: { borderColor: Brand.primary, backgroundColor: DEX.water },
  candidateName: { ...Typography.itemTitle, lineHeight: 20, color: Brand.textHeading },
  candidateImage: { width: 100, height: 100 },
  candidateActions: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: 32,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: CATCH.actionGap,
  },
  loginWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },

  // 인증 4 — 사진 182x246, 정보 카드 264x120 (Figma 664:3414 / 664:3434)
  resultPhoto: {
    width: 182,
    height: 246,
    marginTop: 36,
    alignSelf: 'center',
    backgroundColor: CATCH.previewBg,
    overflow: 'hidden',
  },
  factsCard: {
    width: 264,
    height: 120,
    marginTop: 36,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
    borderRadius: 16,
    backgroundColor: DEX.cardBg,
    boxShadow: `0px 0px 5.8px ${DEX.detail.glow}`,
  },
  factRow: { height: 20, flexDirection: 'row', alignItems: 'center' },
  factLabel: { ...Typography.listItem, color: Brand.textAccent },
  factValue: {
    ...Typography.itemTitle,
    flex: 1,
    lineHeight: 20,
    color: Brand.textHeading,
    textAlign: 'right',
  },
  factEdit: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  pencil: { width: 16, height: 16 },
  factEditValue: {
    ...Typography.itemTitle,
    maxWidth: 145,
    lineHeight: 20,
    color: Brand.textHeading,
  },
  resultActions: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: 32,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: CATCH.actionGap,
  },
  registrationError: {
    ...Typography.footnote,
    marginTop: 16,
    marginHorizontal: 24,
    color: Brand.textError,
    textAlign: 'center',
  },

  // 인증 5 — 240 카드가 문구 아래 60에 온다 (Figma 665:3471)
  registeredCard: { width: 240, marginTop: 60, alignSelf: 'center' },
  registeredActions: {
    marginTop: 'auto',
    paddingTop: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: CATCH.actionGap,
  },
  // 인증샷 클릭 상태 (Figma 905:2605) — 사진 178x238
  modalScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Brand.scrim,
  },
  verificationDialog: {
    width: 214,
    padding: 18,
    borderRadius: 12,
    backgroundColor: Brand.background,
  },
  verificationPhoto: {
    width: 178,
    height: 238,
    borderRadius: 4,
    backgroundColor: CATCH.previewBg,
  },
  verificationFacts: { marginTop: 16, gap: 12 },
});
