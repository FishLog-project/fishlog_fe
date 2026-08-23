import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const HOLD_DURATION = 1200;
const FADE_DURATION = 500;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const started = useRef(false);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Animated.View
      onLayout={() => {
        if (started.current) return;
        started.current = true;
        SplashScreen.hideAsync().finally(() => {
          opacity.value = withDelay(
            HOLD_DURATION,
            withTiming(
              0,
              { duration: FADE_DURATION, easing: Easing.out(Easing.quad) },
              (finished) => {
                'worklet';
                if (finished) scheduleOnRN(setVisible, false);
              },
            ),
          );
        });
      }}
      pointerEvents="none"
      style={[styles.splashOverlay, animatedStyle]}>
      <Image style={styles.image} source={require('@/assets/images/splash-logo.png')} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: 165,
    height: 52,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 72,
    zIndex: 1000,
  },
});
