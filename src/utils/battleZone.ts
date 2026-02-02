/** 서버와 동일: Chase 시간의 70%가 지나면 축소 시작, 남은 30% 동안 1000m → 100m */
const BATTLE_ZONE_INITIAL_RADIUS_M = 1000;
const BATTLE_ZONE_MIN_RADIUS_M = 100;
const SHRINK_START_ELAPSED_RATIO = 0.7;

/**
 * BATTLE 모드: 현재 자기장 반경(m). phaseEndsAt(chase 종료 시각), chaseSeconds(초), now(현재 시각 ms).
 */
export function getBattleZoneRadiusMeters(
  phaseEndsAt: number | null,
  chaseSeconds: number,
  now: number
): number | null {
  if (phaseEndsAt == null || chaseSeconds <= 0) return null;

  const totalChaseMs = chaseSeconds * 1000;
  const chaseEndAt = phaseEndsAt;
  const chaseStartAt = chaseEndAt - totalChaseMs;
  const elapsed = now - chaseStartAt;

  if (elapsed <= 0) return BATTLE_ZONE_INITIAL_RADIUS_M;
  if (elapsed >= totalChaseMs) return BATTLE_ZONE_MIN_RADIUS_M;

  const shrinkStartMs = totalChaseMs * SHRINK_START_ELAPSED_RATIO;
  if (elapsed < shrinkStartMs) return BATTLE_ZONE_INITIAL_RADIUS_M;

  const shrinkDurationMs = totalChaseMs * (1 - SHRINK_START_ELAPSED_RATIO);
  const shrinkElapsed = elapsed - shrinkStartMs;
  const progress = Math.min(1, shrinkElapsed / shrinkDurationMs);
  const radius =
    BATTLE_ZONE_INITIAL_RADIUS_M -
    progress * (BATTLE_ZONE_INITIAL_RADIUS_M - BATTLE_ZONE_MIN_RADIUS_M);
  return Math.round(radius);
}
