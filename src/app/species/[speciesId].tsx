import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function SpeciesDetailScreen() {
  const { speciesId } = useLocalSearchParams<{ speciesId: string }>();

  return (
    <PlaceholderScreen
      label={`SPECIES ${speciesId ?? '-'}`}
      title="어종 상세 화면"
      description="선택한 어종의 정보와 인증 기록을 표시할 경로입니다."
    />
  );
}
