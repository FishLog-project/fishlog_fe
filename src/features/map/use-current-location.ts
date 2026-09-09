import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isValidCoords } from '@/features/map/geo';
import type { Coords } from '@/features/map/tour-data';

export type LocationState =
  | { status: 'idle' | 'loading' | 'denied' | 'unavailable' }
  | { status: 'ready'; coords: Coords };

/** 현재 위치. 권한은 처음 필요해질 때(locate) 묻는다 */
export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({ status: 'idle' });
  const request = useRef(0);

  useEffect(() => () => { request.current += 1; }, []);

  const locate = useCallback(async () => {
    const current = ++request.current;
    setState({ status: 'loading' });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (current !== request.current) return;
      if (!permission.granted) {
        setState({ status: 'denied' });
        return;
      }
      const options = {
        accuracy: Location.Accuracy.Balanced,
        // Expo 웹의 기본값은 Infinity이므로 새 조회에서 오래된 위치를 재사용하지 않는다.
        maximumAge: 0,
      };
      const position = await Location.getCurrentPositionAsync(options);
      if (current !== request.current) return;
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setState(isValidCoords(coords) ? { status: 'ready', coords } : { status: 'unavailable' });
    } catch {
      if (current === request.current) setState({ status: 'unavailable' });
    }
  }, []);

  return [state, locate] as const;
}
