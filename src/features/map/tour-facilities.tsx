import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenState } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';
import { createApiTourDataSource } from '@/features/map/tour-api';
import { TOUR_CATEGORIES, type TourCategory } from '@/features/map/tour-data';
import { useCurrentLocation } from '@/features/map/use-current-location';
import { useNearbyTours, type TourPlaceViewModel } from '@/features/map/use-nearby-tours';

const source = createApiTourDataSource();
const ICONS = {
  음식점: require('@/assets/images/map/tour-food.svg'),
  관광지: require('@/assets/images/map/tour-attraction.svg'),
  숙박: require('@/assets/images/map/tour-stay.svg'),
} as const;

/** Figma 634:1711 / 634:1576. 지도 SDK와 독립적인 현재 위치 기반 시설 조회 레이어. */
export function TourFacilities() {
  const [category, setCategory] = useState<TourCategory | null>(null);
  const [location, locate] = useCurrentLocation();
  const origin = location.status === 'ready' ? location.coords : null;
  const [state, retry] = useNearbyTours(source, category, origin);
  const [selectedPlace, setSelectedPlace] = useState<TourPlaceViewModel | null>(null);
  // 새 분류/좌표의 응답에 없는 상세는 즉시 닫는다. 응답마다 달라지는 임시 id로 재선택하지 않는다.
  const selected = state.status === 'ready' && selectedPlace && state.places.includes(selectedPlace)
    ? selectedPlace : null;
  const insets = useSafeAreaInsets();

  const selectCategory = (next: TourCategory) => {
    setSelectedPlace(null);
    setCategory(next === category ? null : next);
    if (next !== category && location.status === 'idle') void locate();
  };
  const refreshLocation = () => {
    setSelectedPlace(null);
    void locate();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <ScrollView
        horizontal
        style={styles.filters}
        contentContainerStyle={styles.filterContent}
        showsHorizontalScrollIndicator={false}>
        {TOUR_CATEGORIES.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`${item} 시설 보기`}
            accessibilityState={{ selected: category === item }}
            onPress={() => selectCategory(item)}
            style={({ pressed }) => [styles.chip, category === item && styles.chipSelected, pressed && styles.pressed]}>
            <Image source={ICONS[item]} style={styles.chipIcon} contentFit="contain" />
            <Text style={styles.chipLabel}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {category ? (
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.copy}>
              <Text accessibilityRole="header" style={styles.heading}>내 주변 {category}</Text>
              <Text style={styles.meta}>반경 5km · 가까운 순 · 최대 30곳</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="현재 위치로 시설 다시 조회"
              onPress={refreshLocation}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <Image source={require('@/assets/images/map/my-location.svg')} style={styles.locationIcon} contentFit="contain" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {!origin ? (
              <ScreenState
                variant={location.status === 'denied' || location.status === 'unavailable' ? 'error' : 'loading'}
                title={location.status === 'denied' ? '위치 권한이 필요해요'
                  : location.status === 'unavailable' ? '현재 위치를 확인하지 못했어요' : '현재 위치를 확인하고 있어요'}
                description={location.status === 'denied'
                  ? '기기 또는 브라우저 설정에서 위치 권한을 허용한 뒤 다시 시도해 주세요.'
                  : location.status === 'unavailable' ? '위치 서비스를 켜고 다시 시도해 주세요.' : '내 주변 시설을 찾기 위해 위치를 확인해요.'}
                onRetry={refreshLocation}
              />
            ) : state.status === 'ready' ? (
              state.places.map((place) => (
                <Pressable
                  key={place.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${place.name}, ${place.address ?? '주소 정보 없음'}, ${place.distanceLabel ?? '거리 정보 없음'}. 시설 상세 보기`}
                  onPress={() => setSelectedPlace(place)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <PlaceImage uri={place.thumbnailUrl} />
                  <View style={styles.placeCopy}>
                    <Text numberOfLines={2} style={styles.name}>{place.name}</Text>
                    <Text numberOfLines={2} style={styles.address}>{place.address ?? '주소 정보가 없어요'}</Text>
                    <Text style={styles.distance}>{place.distanceLabel ?? '거리 정보 없음'}</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <ScreenState
                variant={state.status === 'idle' ? 'loading' : state.status}
                title={state.status === 'empty' ? `주변에 ${category} 시설이 없어요`
                  : state.status === 'error' ? '시설을 불러오지 못했어요' : '주변 시설을 찾고 있어요'}
                description={state.status === 'empty' ? '현재 위치 반경 5km에서 찾은 결과가 없어요.'
                  : state.status === 'error' ? '잠시 후 다시 시도해 주세요.' : undefined}
                onRetry={retry}
              />
            )}
          </ScrollView>
        </View>
      ) : null}

      {selected ? (
        <Modal transparent animationType="slide" onRequestClose={() => setSelectedPlace(null)}>
          <View style={styles.backdrop} accessibilityViewIsModal>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedPlace(null)} accessible={false} />
            <View style={[styles.detail, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.detailHeader}>
                <Text accessibilityRole="header" style={styles.detailTitle}>{selected.name}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="시설 상세 닫기" onPress={() => setSelectedPlace(null)} style={styles.iconButton}>
                  <Ionicons name="close" size={28} color={Brand.textStrong} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.detailContent}>
                <Text style={styles.address}>{selected.address ?? '주소 정보가 없어요'}</Text>
                <Text style={styles.distance}>{selected.distanceLabel ?? '거리 정보 없음'}</Text>
                <PlaceImage uri={selected.photos[0] ?? null} large />
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function PlaceImage({ uri, large = false }: { uri: string | null; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const style = [styles.photo, large && styles.detailPhoto];
  return uri && uri !== failedUrl ? (
    <Image source={{ uri }} style={style} contentFit="cover" onError={() => setFailedUrl(uri)} />
  ) : (
    <View style={style}><Text style={styles.meta}>사진 없음</Text></View>
  );
}

const styles = StyleSheet.create({
  filters: { position: 'absolute', left: 72, right: 12, top: Components.map.overlayInset - 2, height: 48, flexGrow: 0 },
  filterContent: { gap: 8, alignItems: 'center', paddingHorizontal: 2, paddingRight: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 69, backgroundColor: Brand.background, boxShadow: '1px 2px 5px rgba(0,0,0,0.18)' },
  chipSelected: { backgroundColor: Brand.surfaceSoft, boxShadow: 'inset 0px 2px 4px rgba(49,135,241,0.25)' },
  chipIcon: { width: 16, height: 16 },
  chipLabel: { ...Typography.caption, color: Brand.textHeading, lineHeight: 28 },
  sheet: { position: 'absolute', top: 80, bottom: 0, left: 0, right: 0, backgroundColor: Brand.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.screenPadding, paddingTop: 12, paddingBottom: 4, gap: 12 },
  copy: { flex: 1, gap: 4 },
  heading: { ...Typography.sectionTitle, color: Brand.textHeading },
  meta: { ...Typography.footnote, color: Brand.textWeak, lineHeight: 19 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  locationIcon: { width: 24, height: 24 },
  list: { paddingHorizontal: Layout.screenPadding, paddingBottom: 20 },
  row: { minHeight: 112, flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Components.state.border },
  photo: { width: 120, height: 80, flexShrink: 0, borderRadius: 4, backgroundColor: Brand.divider, justifyContent: 'center', alignItems: 'center' },
  placeCopy: { flex: 1, minWidth: 0 },
  name: { ...Typography.button, color: Brand.textHeading, lineHeight: 24 },
  address: { ...Typography.footnote, color: Brand.textWeak, lineHeight: 19 },
  distance: { ...Typography.caption, color: Brand.textMuted, lineHeight: 20, marginTop: 8 },
  pressed: { opacity: 0.72 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: Brand.scrim },
  detail: { maxHeight: '75%', backgroundColor: Brand.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: Layout.screenPadding },
  detailHeader: { paddingTop: 12, flexDirection: 'row', gap: 12, alignItems: 'center' },
  detailTitle: { ...Typography.sectionTitle, color: Brand.textHeading, flex: 1 },
  detailContent: { paddingBottom: 12 },
  detailPhoto: { width: '100%', height: 200, marginTop: 16 },
});
