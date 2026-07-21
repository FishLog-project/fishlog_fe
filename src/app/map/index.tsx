import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FabButton,
  FilterChip,
  PrimaryButton,
  SearchBar,
} from '@/components/common';
import { Palette } from '@/constants/theme';

/**
 * 지도 탭 — 아직 실제 지도는 없지만, 공통 컴포넌트
 * (SearchBar / FilterChip / FabButton / PrimaryButton)를 배치해 둔 화면.
 */
export default function MapScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'food' | 'parking' | null>('food');
  const [locateOn, setLocateOn] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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

        {/* 우측: FAB 토글 버튼들 */}
        <View style={styles.fabColumn}>
          <FabButton icon="scan" active={false} />
          <FabButton icon="grid" active={false} />
          <FabButton
            icon="locate"
            active={locateOn}
            onPress={() => setLocateOn((v) => !v)}
          />
        </View>
      </View>

      {/* 하단 액션 */}
      <View style={styles.bottom}>
        <PrimaryButton label="다음" onPress={() => {}} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  mapArea: { flex: 1, backgroundColor: Palette.light },
  top: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  chips: { flexDirection: 'row', gap: 10 },
  fabColumn: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    gap: 12,
  },
  bottom: { paddingHorizontal: 20, paddingVertical: 16 },
});
