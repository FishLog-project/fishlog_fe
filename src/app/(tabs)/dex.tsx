import { PlaceholderCard } from '@/components/placeholder-card';
import { TabScreen } from '@/components/tab-screen';

export default function DexScreen() {
  return (
    <TabScreen title="도감" description="잡은 어종과 전체 어종을 확인하는 탭입니다.">
      <PlaceholderCard
        label="ISSUE #3"
        title="도감 화면 준비 중"
        description="목록·검색·필터와 상세 데이터는 도감 기능 이슈에서 연결합니다."
      />
    </TabScreen>
  );
}
