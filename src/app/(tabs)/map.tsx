import { PlaceholderCard } from '@/components/placeholder-card';
import { TabScreen } from '@/components/tab-screen';

export default function MapScreen() {
  return (
    <TabScreen title="지도" description="낚시 스팟을 탐색하는 탭입니다.">
      <PlaceholderCard
        label="ISSUE #4"
        title="지도 화면 준비 중"
        description="지도 SDK와 스팟 데이터는 지도 기능 이슈에서 연결합니다."
      />
    </TabScreen>
  );
}
