import { Image } from 'expo-image';

/** 첫 화면과 탭 전환에서 순차적으로 나타나지 않도록 미리 디코딩할 로컬 이미지. */
const CRITICAL_IMAGES = [
  // 탭바
  require('@/assets/images/tabs/home-active.svg'),
  require('@/assets/images/tabs/home-inactive.svg'),
  require('@/assets/images/tabs/map-active.svg'),
  require('@/assets/images/tabs/map-inactive.svg'),
  require('@/assets/images/tabs/log-active.svg'),
  require('@/assets/images/tabs/log-inactive.svg'),
  require('@/assets/images/tabs/rank-active.svg'),
  require('@/assets/images/tabs/rank-inactive.svg'),
  require('@/assets/images/tabs/profile-active.svg'),
  require('@/assets/images/tabs/profile-inactive.svg'),

  // 홈
  require('@/assets/images/home/hero-card.png'),
  require('@/assets/images/home/scan-fish.svg'),
  require('@/assets/images/home/fishing-rod.png'),
  require('@/assets/images/home/chevron-20.svg'),
  require('@/assets/images/home/chevron-28.svg'),
  require('@/assets/images/home/pin-shape.svg'),
  require('@/assets/images/home/pin-inner.svg'),
] as const;

const DEFERRED_IMAGES = [
  // 지도
  require('@/assets/images/map/map-placeholder.png'),
  require('@/assets/images/map/grid.svg'),
  require('@/assets/images/map/sea-info.svg'),
  require('@/assets/images/map/fishing-disabled.svg'),
  require('@/assets/images/map/fish-scan.svg'),
  require('@/assets/images/map/my-location.svg'),
  require('@/assets/images/map/current-location.svg'),
  require('@/assets/images/map/marker.svg'),

  // 프로필·랭킹
  require('@/assets/images/profile/camera-button-40.svg'),
  require('@/assets/images/profile/camera-20.svg'),
  require('@/assets/images/profile/pencil-16.svg'),
  require('@/assets/images/profile/book-card.svg'),
  require('@/assets/images/profile/rank-card.svg'),
  require('@/assets/images/profile/saved-card.svg'),
  require('@/assets/images/profile/chevron-20.svg'),
  require('@/assets/images/ranking/medal-gold-sprite.png'),
  require('@/assets/images/ranking/medal-silver-bronze-sprite.png'),
] as const;

type LoadedImage = Awaited<ReturnType<typeof Image.loadAsync>>;

let retainedImages: LoadedImage[] = [];
let preloadPromise: Promise<void> | null = null;

/**
 * expo-image는 로컬 SVG도 네이티브에서 비동기로 디코딩한다.
 * 참조를 유지해 화면이 마운트될 때 같은 이미지를 다시 준비하지 않게 한다.
 */
export function preloadAppImages(): Promise<void> {
  if (retainedImages.length >= CRITICAL_IMAGES.length) return Promise.resolve();
  if (preloadPromise) return preloadPromise;

  preloadPromise = Promise.all(
    CRITICAL_IMAGES.map((source) => Image.loadAsync(source).catch(() => null)),
  ).then((images) => {
    retainedImages = images.filter((image): image is LoadedImage => image !== null);
  });

  return preloadPromise;
}

// Auth/SecureStore 초기화와 동시에 시작해 스플래시 유지 시간을 추가로 늘리지 않는다.
void preloadAppImages().finally(() => {
  // 첫 홈과 탭바가 안정된 뒤 나머지 탭 에셋을 준비해 초기 네이티브 작업이 몰리지 않게 한다.
  setTimeout(() => {
    void Promise.all(
      DEFERRED_IMAGES.map((source) => Image.loadAsync(source).catch(() => null)),
    ).then((images) => {
      retainedImages.push(...images.filter((image): image is LoadedImage => image !== null));
    });
  }, 2000);
});
