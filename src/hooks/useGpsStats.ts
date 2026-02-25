import { useRef, useCallback, useEffect } from 'react';
import { calculateDistanceMeters } from '../utils/battleZone';
import { Location } from '../types/game.types';

export interface GpsStats {
  distanceM: number;
  maxSpeedKmh: number;
  estimatedSteps: number;
}

const STEP_LENGTH_M = 0.75;
const SPEED_SMOOTH_MS = 3000;
const MIN_MOVE_M = 1.5;

interface UseGpsStatsResult {
  getStats: () => GpsStats;
  onLocationUpdate: (loc: Location) => void;
  resetStats: () => void;
}

export function useGpsStats(isTracking: boolean): UseGpsStatsResult {
  const statsRef = useRef<GpsStats>({ distanceM: 0, maxSpeedKmh: 0, estimatedSteps: 0 });
  const prevLocRef = useRef<Location | null>(null);
  const prevTimeRef = useRef<number | null>(null);

  const resetStats = useCallback(() => {
    statsRef.current = { distanceM: 0, maxSpeedKmh: 0, estimatedSteps: 0 };
    prevLocRef.current = null;
    prevTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (!isTracking) {
      prevLocRef.current = null;
      prevTimeRef.current = null;
    }
  }, [isTracking]);

  const onLocationUpdate = useCallback(
    (loc: Location) => {
      if (!isTracking) return;
      if (
        typeof loc.lat !== 'number' ||
        typeof loc.lng !== 'number' ||
        !isFinite(loc.lat) ||
        !isFinite(loc.lng)
      ) return;

      const now = loc.updatedAt ?? Date.now();
      const prev = prevLocRef.current;
      const prevTime = prevTimeRef.current;

      if (prev && prevTime != null) {
        const dist = calculateDistanceMeters(prev.lat, prev.lng, loc.lat, loc.lng);
        const dt = (now - prevTime) / 1000;

        if (dist >= MIN_MOVE_M && dt > 0) {
          statsRef.current.distanceM += dist;
          statsRef.current.estimatedSteps = Math.round(
            statsRef.current.distanceM / STEP_LENGTH_M
          );

          const speedMs = dist / dt;
          const speedKmh = parseFloat((speedMs * 3.6).toFixed(1));
          if (speedKmh > statsRef.current.maxSpeedKmh) {
            statsRef.current.maxSpeedKmh = speedKmh;
          }
        }
      }

      prevLocRef.current = loc;
      prevTimeRef.current = now;
    },
    [isTracking]
  );

  const getStats = useCallback((): GpsStats => ({ ...statsRef.current }), []);

  return { getStats, onLocationUpdate, resetStats };
}
