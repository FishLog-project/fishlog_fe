import { PlaceholderScreen } from '@/components/placeholder-screen';

/**
 * 낚시 인증 플로우 진입점 (이슈 #5).
 * 촬영→분석→결과 상태 머신이 들어올 자리라 탭이 아니라 스택 화면으로 둔다.
 */
export default function CatchScreen() {
  return <PlaceholderScreen title="낚시 인증" icon="camera-outline" showBack />;
}
