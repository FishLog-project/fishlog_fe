const fs = require('fs');
const path = require('path');

const { withDangerousMod } = require('expo/config-plugins');

/**
 * 낚시 스팟 마커 그림을 안드로이드 drawable 로 복사한다 (Figma 634:1675).
 *
 * 마커는 네이티브(RNCKakaoMapView)에서 Kakao LabelStyle 의 비트맵으로 올라가므로
 * JS 번들의 require() 로는 닿지 않는다. `android/` 는 prebuild 산출물이라
 * 손으로 넣어 두면 다음 prebuild 에 사라져서, 매번 여기서 다시 넣는다.
 *
 * 한 장만 넣고 네이티브에서 화면 배율에 맞춰 줄인다 (nodpi = 배율 보정 안 함).
 */
const SOURCE = 'assets/images/map/spot-marker.png';
const TARGET = 'app/src/main/res/drawable-nodpi/spot_marker.png';

module.exports = function withSpotMarkerDrawable(config) {
  return withDangerousMod(config, [
    'android',
    (dangerousConfig) => {
      const source = path.join(dangerousConfig.modRequest.projectRoot, SOURCE);
      if (!fs.existsSync(source)) {
        throw new Error(`마커 그림이 없습니다: ${SOURCE}`);
      }

      const target = path.join(dangerousConfig.modRequest.platformProjectRoot, TARGET);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);

      return dangerousConfig;
    },
  ]);
};
