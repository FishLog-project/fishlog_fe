import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function SpotDetailScreen() {
  const { spotId } = useLocalSearchParams<{ spotId: string }>();

  return (
    <PlaceholderScreen
      label={`SPOT ${spotId ?? '-'}`}
      title="스팟 상세 화면"
      description="선택한 낚시 스팟의 상세 정보를 표시할 경로입니다."
    />
  );
}
