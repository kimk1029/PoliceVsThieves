/** Haversine: GPS distance in meters */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const BATTLE_ZONE_DEFAULT_RADIUS_M = 100;
const BATTLE_ZONE_MIN_RATIO = 0.3;
const SHRINK_START_ELAPSED_RATIO = 0.4;

export const BATTLE_ZONE_INITIAL_RADIUS_M = BATTLE_ZONE_DEFAULT_RADIUS_M;

export function getBattleZoneRadiusMeters(
  phaseEndsAt: number | null,
  hidingSeconds: number,
  chaseSeconds: number,
  now: number,
  initialRadiusM: number = BATTLE_ZONE_DEFAULT_RADIUS_M
): number | null {
  if (phaseEndsAt == null || chaseSeconds <= 0) return null;

  const minRadius = Math.round(initialRadiusM * BATTLE_ZONE_MIN_RATIO);
  const totalMs = (hidingSeconds + chaseSeconds) * 1000;
  const gameStartAt = phaseEndsAt - totalMs;
  const elapsed = now - gameStartAt;

  if (elapsed <= 0) return initialRadiusM;
  if (elapsed >= totalMs) return minRadius;

  const shrinkStartMs = totalMs * SHRINK_START_ELAPSED_RATIO;
  if (elapsed < shrinkStartMs) return initialRadiusM;

  const shrinkDurationMs = totalMs * (1 - SHRINK_START_ELAPSED_RATIO);
  const shrinkElapsed = elapsed - shrinkStartMs;
  const progress = Math.min(1, shrinkElapsed / shrinkDurationMs);
  const radius = initialRadiusM - progress * (initialRadiusM - minRadius);
  return Math.round(radius);
}
