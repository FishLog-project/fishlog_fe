import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader, ScreenState } from '@/components/common';
import { Brand, Components, Fonts, Layout } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { createApiSpotDataSource } from '@/features/map/spot-api';
import { createFixtureSpotDataSource, type SpotDataSource } from '@/features/map/spot-data';
import {
  useSavedSpotExtras,
  useSavedSpotsViewModel,
  useSpotFavorite,
  type SpotMarkerViewModel,
} from '@/features/map/use-spot-view-model';
import { USE_FIXTURE } from '@/lib/data-source-mode';

const LIST = Components.profile.savedList;

/**
 * 저장 목록 — 낚시터 (Figma 826:2288).
 *
 * 마이페이지 "저장 목록" 카드에서 들어온다.
 * 찜 목록 전용 엔드포인트가 없어 GET /api/spots 의 isFavorite 을 걸러 쓴다.
 *
 * 목록 응답에 없는 값은 행마다 따로 채운다 — 주소는 좌표를 카카오 Local API 로
 * 변환하고, 어종 태그는 스팟 상세에서 가져온다 (useSavedSpotExtras).
 *
 * 낚시터 사진이 제공되기 전까지 썸네일 없이 텍스트 목록으로 표시한다.
 */
export default function SavedSpotsScreen() {
  const { token } = useAuth();
  const dataSource = useMemo(
    () => (USE_FIXTURE ? createFixtureSpotDataSource() : createApiSpotDataSource(token)),
    [token],
  );
  const [state, retry] = useSavedSpotsViewModel(dataSource);

  return (
    <Screen
      scroll
      contentPadding={Layout.screenPadding}
      header={<ScreenHeader title="저장 목록" showBack />}>
      {state.status === 'ready' ? (
        <View style={styles.list}>
          {state.data.map((spot) => (
            <SavedSpotRow key={spot.id} spot={spot} dataSource={dataSource} />
          ))}
        </View>
      ) : (
        <ScreenState
          variant={state.status === 'empty' ? 'empty' : state.status}
          title={state.status === 'empty' ? '저장한 낚시터가 없어요' : undefined}
          description={
            state.status === 'empty' ? '지도에서 마음에 드는 낚시터를 찜해 보세요.' : undefined
          }
          onRetry={state.status === 'error' ? retry : undefined}
        />
      )}
    </Screen>
  );
}

/**
 * HeartList/Base (Figma 837:2502).
 *
 * 하트를 누르면 찜을 풀지만 행은 남겨 둔다 — 실수로 눌렀을 때 바로 되돌릴 수 있도록.
 * 목록은 화면을 다시 열 때 서버 기준으로 맞춰진다.
 */
function SavedSpotRow({
  spot,
  dataSource,
}: {
  spot: SpotMarkerViewModel;
  dataSource: SpotDataSource;
}) {
  const router = useRouter();
  const favorite = useSpotFavorite(dataSource, spot.id, spot.isFavorite);
  const extras = useSavedSpotExtras(dataSource, spot);
  // 시안은 태그 두 개까지 보여준다 (837:2484)
  const tags = extras.fishes.slice(0, 2);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${spot.name}, 지도에서 상세 보기`}
      onPress={() => router.navigate({
        pathname: '/map',
        params: { spotId: String(spot.id), searchRequest: String(Date.now()) },
      })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {/* 사진 제공 시 복원: <View style={styles.thumb} /> */}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.name} numberOfLines={2}>
              {spot.name}
            </Text>
            {/* 좌표가 바다 위면 주소가 없다 — 그때는 분류로 대신한다 */}
            <Text style={styles.address} numberOfLines={1}>
              {extras.address ?? spot.category}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: favorite.isFavorite, disabled: favorite.pending }}
            accessibilityLabel={favorite.isFavorite ? '찜 해제' : '찜하기'}
            onPress={(event) => {
              event.stopPropagation();
              favorite.toggle();
            }}
            disabled={favorite.pending}
            style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}>
            <Ionicons
              name={favorite.isFavorite ? 'heart' : 'heart-outline'}
              size={LIST.heartSize}
              color={Brand.primary}
            />
          </Pressable>
        </View>

        {tags.length > 0 ? (
          <View style={styles.tagRow}>
            {tags.map((fish) => (
              <View key={fish.fishId} style={styles.tag}>
                <Text style={styles.tagLabel}>{fish.name}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {favorite.failure ? <Text style={styles.failure}>{favorite.failure}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 4 },
  row: {
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.inactive,
  },
  // thumb: {
  //   width: LIST.thumbSize,
  //   height: LIST.thumbSize,
  //   borderRadius: LIST.thumbRadius,
  //   backgroundColor: LIST.thumbBg,
  // },
  content: { gap: LIST.blockGap },
  favoriteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  titleBlock: { flex: 1, gap: LIST.titleGap },
  name: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    color: Brand.textStrong,
  },
  address: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.325,
    color: LIST.addressLabel,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: LIST.tagGap },
  tag: {
    paddingHorizontal: LIST.tagPaddingX,
    paddingVertical: LIST.tagPaddingY,
    borderRadius: LIST.tagRadius,
    backgroundColor: LIST.tagBg,
  },
  tagLabel: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: -0.22,
    color: LIST.tagLabel,
  },
  failure: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.325,
    color: Brand.textError,
  },
  pressed: { opacity: 0.72 },
});
