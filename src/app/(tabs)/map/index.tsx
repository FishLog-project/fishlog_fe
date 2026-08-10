import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  FabButton,
  FilterChip,
  PrimaryButton,
  Screen,
  SearchBar,
} from '@/components/common';
import { Brand, Layout } from '@/constants/theme';

/**
 * 지도 탭 — 아직 실제 지도는 없지만, 공통 컴포넌트
 * (SearchBar / FilterChip / FabButton / PrimaryButton)를 배치해 둔 화면.
 *
 * 지도는 화면 끝까지 채워야 해서 Screen을 edgeToEdge로 쓰고,
 * 그 위에 얹히는 컨트롤만 Layout.screenPadding을 참조한다.
 */
export default function MapScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'food' | 'parking' | null>('food');
  const [locateOn, setLocateOn] = useState(true);

  return (
    <Screen edgeToEdge footer={<PrimaryButton label="다음" onPress={() => {}} />}>
      {/* 지도 placeholder 영역 */}
      <View style={styles.mapArea}>
        {/* 상단: 검색 + 필터 칩 */}
        <View style={styles.top}>
          <SearchBar value={query} onChangeText={setQuery} />
          <View style={styles.chips}>
            <FilterChip
              label="관광지/음식점"
              variant="food"
              selected={filter === 'food'}
              onPress={() => setFilter('food')}
            />
            <FilterChip
              label="화장실/주차장"
              variant="parking"
              selected={filter === 'parking'}
              onPress={() => setFilter('parking')}
            />
          </View>
        </View>

        {/* 지도 위에 떠 있는 FAB — 지도를 가리지 않고 겹쳐야 하므로 오버레이 */}
        <View style={styles.fabColumn}>
          <FabButton icon="scan" label="스캔" active={false} />
          <FabButton icon="grid" label="목록 보기" active={false} />
          <FabButton
            icon="locate"
            label="현재 위치"
            active={locateOn}
            onPress={() => setLocateOn((v) => !v)}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapArea: { flex: 1, backgroundColor: Brand.surfaceSoft },
  top: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 12,
    gap: 12,
  },
  chips: { flexDirection: 'row', gap: 10 },
  fabColumn: {
    position: 'absolute',
    right: Layout.screenPadding,
    bottom: 24,
    gap: 12,
  },
});
