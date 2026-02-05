/** Haversine: GPS 거리(m) */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** 베이스캠프 중심 실제 거리 100m(네이버 지도 미터 단위), 전체 게임 시간 40% 후 축소, 남은 60% 동안 100m → 30m */
export const BATTLE_ZONE_INITIAL_RADIUS_M = 100;
const BATTLE_ZONE_MIN_RADIUS_M = 30;
const SHRINK_START_ELAPSED_RATIO = 0.4;

/**
 * 플레이가능 영역(자기장) 반경(m).
 * phaseEndsAt = 추격 종료 시각(ms), hidingSeconds + chaseSeconds = 전체 시간.
 * 전체 시간의 40%가 지나면 축소 시작, 남은 60% 동안 100m → 30m.
 */
export function getBattleZoneRadiusMeters(
  phaseEndsAt: number | null,
  hidingSeconds: number,
  chaseSeconds: number,
  now: number
): number | null {
  if (phaseEndsAt == null || chaseSeconds <= 0) return null;

  const totalMs = (hidingSeconds + chaseSeconds) * 1000;
  const gameStartAt = phaseEndsAt - totalMs;
  const elapsed = now - gameStartAt;

  if (elapsed <= 0) return BATTLE_ZONE_INITIAL_RADIUS_M;
  if (elapsed >= totalMs) return BATTLE_ZONE_MIN_RADIUS_M;

  const shrinkStartMs = totalMs * SHRINK_START_ELAPSED_RATIO;
  if (elapsed < shrinkStartMs) return BATTLE_ZONE_INITIAL_RADIUS_M;

  const shrinkDurationMs = totalMs * (1 - SHRINK_START_ELAPSED_RATIO);
  const shrinkElapsed = elapsed - shrinkStartMs;
  const progress = Math.min(1, shrinkElapsed / shrinkDurationMs);
  const radius =
    BATTLE_ZONE_INITIAL_RADIUS_M -
    progress * (BATTLE_ZONE_INITIAL_RADIUS_M - BATTLE_ZONE_MIN_RADIUS_M);
  return Math.round(radius);
}
