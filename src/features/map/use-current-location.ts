import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

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
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (current !== request.current) return;
      setState({
        status: 'ready',
        coords: { lat: position.coords.latitude, lng: position.coords.longitude },
      });
    } catch {
      if (current === request.current) setState({ status: 'unavailable' });
    }
  }, []);

  return [state, locate] as const;
}
