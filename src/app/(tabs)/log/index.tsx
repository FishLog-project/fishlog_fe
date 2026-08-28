import { PlaceholderScreen } from '@/components/placeholder-screen';

/**
 * 도감 탭. 라우트 이름은 `log`지만 디자인(TabBar 74:1605의 ph:book-fill)과
 * 이슈 #3 기준으로 이 화면은 "도감"이다. 이름 정리는 도감 구현 때 함께 한다.
 */
export default function DexScreen() {
  return <PlaceholderScreen title="도감" icon="fish-outline" />;
}
