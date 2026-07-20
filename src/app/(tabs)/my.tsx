import { PlaceholderCard } from '@/components/placeholder-card';
import { TabScreen } from '@/components/tab-screen';

export default function MyScreen() {
  return (
    <TabScreen title="마이" description="내 낚시 기록과 계정 정보를 확인하는 탭입니다.">
      <PlaceholderCard
        label="OUT OF SCOPE"
        title="마이 화면 준비 중"
        description="로그인과 마이페이지 세부 기능은 이번 앱 셸 작업에 포함하지 않습니다."
      />
    </TabScreen>
  );
}
