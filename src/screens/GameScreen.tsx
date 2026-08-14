import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, 
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaWithFallback } from '../hooks/useSafeAreaWithFallback';
import Geolocation from 'react-native-geolocation-service';
import {
  NaverMapCircleOverlay,
  NaverMapMarkerOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { useGameStore } from '../store/useGameStore';
import {
  getBattleZoneRadiusMeters,
  BATTLE_ZONE_DEFAULT_RADIUS_M,
  calculateDistanceMeters,
} from '../utils/battleZone';
import { usePlayerStore } from '../store/usePlayerStore';
import { useGameLogic } from '../hooks/useGameLogic';
import { PixelButton } from '../components/pixel/PixelButton';
import { QRCodeView } from '../components/QRCodeView';
import { logLocation } from '../utils/locationLog';
import { QRScanModal } from './improvedLobby/QRScanModal';

interface GameScreenProps {
  gameLogic: ReturnType<typeof useGameLogic>;
  hasLocationPermission: boolean;
  hidingRemainingSec: number;
  gameEndsAt: number | null;
  onConfirmEndGame: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  gameLogic,
  hasLocationPermission,
  hidingRemainingSec,
  gameEndsAt,
  onConfirmEndGame,
}) => {
  const mapRef = useRef<NaverMapViewRef>(null);
  const hasCenteredOnceRef = useRef(false);
  const lastCameraCoordRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const startedTrackingRef = useRef(false);
  const lastCameraAtRef = useRef(0);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [camera, setCamera] = useState<{
    latitude: number;
    longitude: number;
    zoom: number;
    animationDuration?: number;
  } | null>(null);
  const { team, location, playerId, nickname } = usePlayerStore();
  const { status, players, basecamp, fixedBasecamp, settings, phaseEndsAt } =
    useGameStore();
  const playersList = Array.from(players.values());

  // 서버에서 방장의 위치를 BC로 설정하여 game:state로 받아옴 (fixedBasecamp)
  // 서버 basecamp 수신 전 로컬 폴백: 방장의 첫 유효 위치를 임시 BC로 사용
  const [hostBasecamp, setHostBasecamp] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (status == null || status === 'END') return;
    if (hostBasecamp) return;
    // fixedBasecamp가 이미 서버에서 받아져 있으면 로컬 폴백 불필요
    if (fixedBasecamp && fixedBasecamp.lat !== 0 && fixedBasecamp.lng !== 0) return;
    const host = playersList.find((p) => (p as any).role === 'HOST');
    if (!host) return;
    const isMeHost = host.playerId === playerId;
    const hostLoc = isMeHost ? location : (host as any).location;
    if (!hostLoc || typeof hostLoc.lat !== 'number' || typeof hostLoc.lng !== 'number') return;
    if (!isFinite(hostLoc.lat) || !isFinite(hostLoc.lng)) return;
    if (hostLoc.lat === 0 && hostLoc.lng === 0) return;
    setHostBasecamp({ lat: hostLoc.lat, lng: hostLoc.lng });
  }, [status, fixedBasecamp, playersList, playerId, location?.lat, location?.lng, hostBasecamp]);

  useEffect(() => {
    if (status === 'END') setHostBasecamp(null);
  }, [status]);

  // 베이스캠프 좌표: 모든 모드에서 서버 basecamp 우선 (방장 시작 위치로 설정됨)
  // 없으면 fixedBasecamp(첫 인식 위치) → hostBasecamp(방장 위치 로컬 폴백) 순
  const basecampSource = fixedBasecamp ?? basecamp ?? hostBasecamp;
  const basecampCoord =
    basecampSource &&
      typeof basecampSource.lat === 'number' &&
      typeof basecampSource.lng === 'number' &&
      isFinite(basecampSource.lat) &&
      isFinite(basecampSource.lng) &&
      (basecampSource.lat !== 0 || basecampSource.lng !== 0)
      ? { latitude: basecampSource.lat, longitude: basecampSource.lng }
      : null;

  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [qrScannerSession, setQrScannerSession] = useState(0);
  const isProcessingScanRef = useRef(false);
  const [qrSize, setQrSize] = useState(140);

  useEffect(() => {
    if (startedTrackingRef.current) return;
    startedTrackingRef.current = true;
    gameLogic.startLocationTracking();
  }, [gameLogic]);

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
      setMapReady(false);
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, []);

  // 위치 마커를 부드럽게 이동시키기 위한 상태/헬퍼
  const smoothPositionsRef = useRef<
    Map<
      string,
      {
        lat: number;
        lng: number;
        anim: {
          startLat: number;
          startLng: number;
          endLat: number;
          endLng: number;
          startTime: number;
          duration: number;
        } | null;
      }
    >
  >(new Map());

  const animationFrameRef = useRef<number | null>(null);
  const [, forceSmoothRender] = useState(0);

  const startSmoothAnimation = useCallback(() => {
    if (animationFrameRef.current) return;

    const step = () => {
      const now = Date.now();
      let changed = false;

      smoothPositionsRef.current.forEach((pos) => {
        if (!pos.anim) return;

        const { startLat, startLng, endLat, endLng, startTime, duration } = pos.anim;
        const elapsed = now - startTime;
        let progress = elapsed / duration;

        if (progress >= 1) {
          progress = 1;
          pos.anim = null; // 애니메이션 종료
          pos.lat = endLat;
          pos.lng = endLng;
        } else {
          // Easing function (easeOutQuad)
          const eased = 1 - (1 - progress) * (1 - progress);
          pos.lat = startLat + (endLat - startLat) * eased;
          pos.lng = startLng + (endLng - startLng) * eased;
        }
        changed = true;
      });

      if (changed) {
        forceSmoothRender((v) => v + 1);
      }

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, []);

  const stopSmoothAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // 화면 포커스 시 애니메이션 시작/중지
  useEffect(() => {
    startSmoothAnimation();
    return () => stopSmoothAnimation();
  }, [startSmoothAnimation, stopSmoothAnimation]);

  const setSmoothTarget = useCallback(
    (id: string, target: { latitude: number; longitude: number }, duration = 350) => {
      const existing = smoothPositionsRef.current.get(id);
      if (!existing) {
        smoothPositionsRef.current.set(id, {
          lat: target.latitude,
          lng: target.longitude,
          anim: null,
        });
        forceSmoothRender((v) => v + 1);
        return;
      }

      // 거리가 너무 멀면 점프
      const dist = Math.sqrt(
        Math.pow(existing.lat - target.latitude, 2) + Math.pow(existing.lng - target.longitude, 2),
      );
      if (dist > 0.01) {
        existing.lat = target.latitude;
        existing.lng = target.longitude;
        existing.anim = null;
        forceSmoothRender((v) => v + 1);
        return;
      }

      existing.anim = {
        startLat: existing.lat,
        startLng: existing.lng,
        endLat: target.latitude,
        endLng: target.longitude,
        startTime: Date.now(),
        duration,
      };
    },
    [],
  );

  const getSmoothCoord = useCallback(
    (id: string, fallback: { latitude: number; longitude: number }) => {
      const smooth = smoothPositionsRef.current.get(id);
      if (smooth) {
        return { latitude: smooth.lat, longitude: smooth.lng };
      }
      return fallback;
    },
    [],
  );

  const upsertSmoothPosition = useCallback(
    (id: string, lat: number, lng: number) => {
      setSmoothTarget(id, { latitude: lat, longitude: lng });
    },
    [setSmoothTarget],
  );

  // 내 위치 좌표
  const myLocationCoord =
    location && typeof location.lat === 'number' && typeof location.lng === 'number'
      ? { latitude: location.lat, longitude: location.lng }
      : gameLogic.myLocation &&
        typeof gameLogic.myLocation.lat === 'number' &&
        typeof gameLogic.myLocation.lng === 'number'
        ? { latitude: gameLogic.myLocation.lat, longitude: gameLogic.myLocation.lng }
        : null;

  const requestFallbackLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        gameLogic.applyMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: Date.now(),
        });
      },
      (error) => {
        console.warn('[GameScreen] fallback location failed', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 0,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  }, [gameLogic]);

  useEffect(() => {
    if (myLocationCoord) {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      return;
    }
    if (fallbackIntervalRef.current) return;
    requestFallbackLocation();
    fallbackIntervalRef.current = setInterval(() => {
      requestFallbackLocation();
    }, 5000);
    return () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [myLocationCoord, requestFallbackLocation]);

  // 내 위치가 업데이트되면 부드럽게 이동
  useEffect(() => {
    if (myLocationCoord) {
      upsertSmoothPosition('me', myLocationCoord.latitude, myLocationCoord.longitude);

      if (isActiveRef.current && mapReady) {
        const last = lastCameraCoordRef.current;
        const nowMs = Date.now();
        const timeEnough = nowMs - lastCameraAtRef.current > 300;
        if (!hasCenteredOnceRef.current || timeEnough) {
          hasCenteredOnceRef.current = true;
          lastCameraCoordRef.current = myLocationCoord;
          lastCameraAtRef.current = nowMs;
          try {
            setCamera({
              latitude: myLocationCoord.latitude,
              longitude: myLocationCoord.longitude,
              zoom: 17,
              animationDuration: 200,
            });
          } catch (e) {
            console.warn('[GameScreen] Failed to animate camera', e);
          }
        }
      }
    } else {
      hasCenteredOnceRef.current = false;
      lastCameraCoordRef.current = null;
    }
  }, [myLocationCoord, upsertSmoothPosition]);

  // 게임 총시간 타이머 (BATTLE 자기장 부드러운 축소를 위해 100ms 간격)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const totalRemainingSec = gameEndsAt
    ? Math.max(0, Math.ceil((gameEndsAt - now) / 1000))
    : 0;

  // 자기장(플레이 영역): BATTLE 모드일 때만 활성화
  const configuredRadius = settings?.battleZoneRadiusM ?? BATTLE_ZONE_DEFAULT_RADIUS_M;
  const battleZoneRadius =
    settings?.gameMode === 'BATTLE' &&
      basecampCoord &&
      (status === 'HIDING' || status === 'CHASE') &&
      phaseEndsAt != null &&
      settings?.hidingSeconds != null &&
      settings?.chaseSeconds
      ? status === 'HIDING'
        ? configuredRadius
        : getBattleZoneRadiusMeters(
          phaseEndsAt,
          settings.hidingSeconds,
          settings.chaseSeconds,
          now,
          configuredRadius
        )
      : null;

  // BATTLE 모드: 자기장 밖 5초 경고
  const outsideSinceRef = useRef<number | null>(null);
  const myPlayer = playersList.find((p: any) => p.playerId === playerId);
  const isEliminated =
    (myPlayer as any)?.outOfZoneAt != null ||
    (team === 'THIEF' && (myPlayer as any)?.thiefStatus?.state === 'OUT_OF_ZONE');
  const isOutsideZone =
    !isEliminated &&
    settings?.gameMode === 'BATTLE' &&
    (status === 'HIDING' || status === 'CHASE') &&
    basecampCoord &&
    battleZoneRadius != null &&
    myLocationCoord &&
    calculateDistanceMeters(
      basecampCoord.latitude,
      basecampCoord.longitude,
      myLocationCoord.latitude,
      myLocationCoord.longitude
    ) > battleZoneRadius;
  useEffect(() => {
    if (isOutsideZone) {
      if (outsideSinceRef.current == null) outsideSinceRef.current = now;
    } else {
      outsideSinceRef.current = null;
    }
  }, [isOutsideZone, now]);
  const outsideRemainingSec =
    isOutsideZone && outsideSinceRef.current != null
      ? Math.max(0, Math.ceil(5 - (now - outsideSinceRef.current) / 1000))
      : null;

  // 플레이어 분류
  const thieves = playersList.filter((p: any) => p.team === 'THIEF');
  const polices = playersList.filter((p: any) => p.team === 'POLICE');
  const isPolice = team === 'POLICE';
  const isPoliceHiding = isPolice && hidingRemainingSec > 0;

  // 경찰 화면: 도둑 위치 (탈락 제외)
  const policeVisibleThiefCoords = isPolice
    ? thieves
      .filter((t: any) => {
        if ((t as any).outOfZoneAt != null || t.thiefStatus?.state === 'OUT_OF_ZONE') return false;
        const loc = t.location;
        return loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
      })
      .map((t: any) => ({
        playerId: t.playerId,
        latitude: t.location.lat,
        longitude: t.location.lng,
        state: t.thiefStatus?.state || 'FREE',
      }))
    : [];

  // 경찰 화면: 경찰 위치 (본인 제외, 탈락 제외)
  const policeVisiblePoliceCoords = isPolice
    ? polices
      .filter((p: any) => {
        if ((p as any).outOfZoneAt != null) return false;
        const loc = p.location;
        return (
          p.playerId !== playerId &&
          loc &&
          typeof loc.lat === 'number' &&
          typeof loc.lng === 'number'
        );
      })
      .map((p: any) => ({
        playerId: p.playerId,
        latitude: p.location.lat,
        longitude: p.location.lng,
      }))
    : [];

  // 도둑 화면: 다른 도둑 위치 (본인 제외, 탈락 제외)
  const otherThiefCoords = !isPolice
    ? thieves
      .filter((t: any) => {
        if ((t as any).outOfZoneAt != null || t.thiefStatus?.state === 'OUT_OF_ZONE') return false;
        const loc = t.location;
        return (
          t.playerId !== playerId &&
          loc &&
          typeof loc.lat === 'number' &&
          typeof loc.lng === 'number'
        );
      })
      .map((t: any) => ({
        playerId: t.playerId,
        latitude: t.location.lat,
        longitude: t.location.lng,
        state: t.thiefStatus?.state || 'FREE',
      }))
    : [];

  // 다른 플레이어 위치 업데이트
  useEffect(() => {
    const upsert = upsertSmoothPosition;
    policeVisibleThiefCoords.forEach((t) => upsert(`player-${t.playerId}`, t.latitude, t.longitude));
    policeVisiblePoliceCoords.forEach((p) =>
      upsert(`player-${p.playerId}`, p.latitude, p.longitude),
    );
    otherThiefCoords.forEach((t) => upsert(`player-${t.playerId}`, t.latitude, t.longitude));
  }, [
    policeVisibleThiefCoords,
    policeVisiblePoliceCoords,
    otherThiefCoords,
    upsertSmoothPosition,
  ]);

  // 로그 (디버깅용)
  useEffect(() => {
    if (myLocationCoord) {
      logLocation('My location updated', myLocationCoord);
    }
    if (isPolice && policeVisibleThiefCoords.length > 0) {
      logLocation('Police map coords', policeVisibleThiefCoords.length);
    }
    if (!isPolice && otherThiefCoords.length > 0) {
      logLocation('Other thieves locations', otherThiefCoords.length);
    }
  }, [
    myLocationCoord?.latitude,
    myLocationCoord?.longitude,
    isPolice,
    policeVisibleThiefCoords.length,
    otherThiefCoords.length,
  ]);

  const resolveScannedThiefId = useCallback((raw: string) => {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return typeof parsed?.playerId === 'string' ? parsed.playerId : null;
      } catch (e) {
        return null;
      }
    }
    return trimmed;
  }, []);

  const handleQRScanned = useCallback(
    (raw: string) => {
      if (isProcessingScanRef.current) return;
      isProcessingScanRef.current = true;

      const thiefId = resolveScannedThiefId(raw);
      if (!thiefId) {
        Alert.alert('QR 오류', '유효하지 않은 QR 코드입니다.');
        setQrScannerSession((v) => v + 1);
        isProcessingScanRef.current = false;
        return;
      }

      const scannedPlayer = players.get(thiefId);
      if (!scannedPlayer || scannedPlayer.team !== 'THIEF') {
        Alert.alert('QR 오류', '도둑의 QR 코드가 아닙니다.');
        setQrScannerSession((v) => v + 1);
        isProcessingScanRef.current = false;
        return;
      }

      if (scannedPlayer.thiefStatus?.state !== 'FREE') {
        Alert.alert('검거 불가', '이미 검거되었거나 감금된 도둑입니다.');
        setQrScannerSession((v) => v + 1);
        isProcessingScanRef.current = false;
        return;
      }

      gameLogic.attemptCapture(thiefId, 'qr');
      setQrScannerVisible(false);
      isProcessingScanRef.current = false;
    },
    [gameLogic, players, resolveScannedThiefId],
  );

  const roleLabel = team === 'POLICE' ? '🚔 경찰' : team === 'THIEF' ? '🏃 도둑' : '…';
  const showHidingCountdown =
    hidingRemainingSec > 0 && (status === 'HIDING' || (isPolice && hidingRemainingSec > 0));
  const pulse = useRef(new Animated.Value(1)).current;

  // 카운트다운 애니메이션
  useEffect(() => {
    if (!showHidingCountdown) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [showHidingCountdown, pulse]);


  // 하단 패널 애니메이션 상태
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const panelHeightAnim = useRef(new Animated.Value(0)).current;

  const togglePanel = useCallback(() => {
    Animated.spring(panelHeightAnim, {
      toValue: isPanelExpanded ? 0 : 350,
      useNativeDriver: false,
    }).start();
    setIsPanelExpanded(!isPanelExpanded);
  }, [isPanelExpanded, panelHeightAnim]);
  
  // 맵 컨테이너 실제 크기 (레이더 링/암 계산용)
  const [mapContainerSize, setMapContainerSize] = useState({ width: 0, height: 0 });

  // 레이더 회전 애니메이션
  const radarRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(radarRotation, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: true,
      })
    ).start();
  }, [radarRotation]);
  // 메인 암과 trailing 잔상 (각도 오프셋)
  const radarRotateStr = radarRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const radarTrail1   = radarRotation.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '348deg'] });
  const radarTrail2   = radarRotation.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '335deg'] });
  const radarTrail3   = radarRotation.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '320deg'] });

  // 내 위치 블립 펄스 (레이더 타겟 표시)
  const blipPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blipPulse, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(blipPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [blipPulse]);

  const bg = isPolice ? styles.containerPolice : styles.containerThief;
  const smoothMyCoordVal = myLocationCoord ? getSmoothCoord('me', myLocationCoord) : null;

  const { safeTop, safeBottom } = useSafeAreaWithFallback();

  // 도둑: 경찰 근접 시 위험 경고 (레이더 사이드 빨간 깜빡임)
  const proximityRadius = settings?.proximityRadiusMeters ?? 30;
  const isPoliceNear = !isPolice && myLocationCoord && polices.some((p: any) => {
    const loc = p.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
    const dist = calculateDistanceMeters(myLocationCoord.latitude, myLocationCoord.longitude, loc.lat, loc.lng);
    return dist <= proximityRadius;
  });
  const dangerFlash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isPoliceNear) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dangerFlash, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dangerFlash, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isPoliceNear, dangerFlash]);
  const dangerOpacity = dangerFlash.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={[styles.container, bg, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={isPolice ? '#001B44' : '#2D0B3A'} translucent={false} />

      {/* HUD: 역할 배지 + 게임끝내기(오른쪽 위 작게) */}
      <View style={[styles.hud, isPolice ? styles.hudPolice : styles.hudThief]}>
        <View style={[styles.hudBadge, isPolice ? styles.hudBadgePolice : styles.hudBadgeThief]}>
          <Text style={[styles.hudText, !isPolice && styles.hudTextDark]}>{roleLabel}</Text>
        </View>
        <TouchableOpacity style={styles.hudEndGameButton} onPress={onConfirmEndGame} activeOpacity={0.7}>
          <Text style={styles.hudEndGameIcon}>➦</Text>
          <Text style={styles.hudEndGameText}>게임끝내기</Text>
        </TouchableOpacity>
      </View>

      {/* 남은시간 + 현황 카드 (탭 시 하단 시트 열림) */}
      <TouchableOpacity style={styles.statusCard} onPress={togglePanel} activeOpacity={0.9}>
        <View style={styles.statusCardLeft}>
          <Text style={styles.statusCardLabel}>남은 시간</Text>
          <Text style={styles.statusCardTime}>
            {Math.floor(totalRemainingSec / 60)}:{(totalRemainingSec % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.statusCardRight}>
          <Text style={styles.statusCardLabel}>현황</Text>
          <View style={styles.statusCardIndicators}>
            <View style={[styles.statusIndicator, styles.statusIndicatorPolice]}>
              <Text style={styles.statusIndicatorEmoji}>👮</Text>
              <Text style={styles.statusIndicatorNum}>{polices.length}</Text>
            </View>
            <View style={[styles.statusIndicator, styles.statusIndicatorThief]}>
              <Text style={styles.statusIndicatorEmoji}>🥷</Text>
              <Text style={styles.statusIndicatorNum}>{thieves.filter((t: any) => t.thiefStatus?.state === 'FREE' && !(t as any).outOfZoneAt).length}</Text>
            </View>
            <View style={[styles.statusIndicator, styles.statusIndicatorCaptured]}>
              <Text style={styles.statusIndicatorEmoji}>🔒</Text>
              <Text style={styles.statusIndicatorNum}>{thieves.filter((t: any) => t.thiefStatus?.state === 'CAPTURED' || t.thiefStatus?.state === 'JAILED').length}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* 메인 맵 컨테이너: 원형 레이더 스코프 */}
      <View
        style={styles.fullScreenMapContainer}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) setMapContainerSize({ width, height });
        }}
      >
        {(() => {
          const W = mapContainerSize.width || 1;
          const H = mapContainerSize.height || 1;
          const circleSize = Math.min(W, H) * 0.88;
          if (circleSize < 50) return null;
          const radius = circleSize / 2;

          return (
            <View style={styles.radarScopeWrapper}>
              {/* 베젤: 레이더 화면 테두리 (원형 지도 감싸기) */}
              <View style={[styles.radarBezel, { width: circleSize + 20, height: circleSize + 20, borderRadius: radius + 10, padding: 10 }]}>
              <View style={[styles.radarScopeCircle, { width: circleSize, height: circleSize, borderRadius: radius }]}>
                {hasLocationPermission ? (
                  <NaverMapView
                    ref={mapRef}
                    style={styles.map}
                    mapType="Navi"
                    isNightModeEnabled={true}
                    layerGroups={{
                      BUILDING: true,
                      TRAFFIC: false,
                      TRANSIT: false,
                      BICYCLE: false,
                      MOUNTAIN: false,
                      CADASTRAL: false,
                    }}
                    lightness={-0.5}
                    buildingHeight={0.5}
                    isShowLocationButton={false}
                    isZoomGesturesEnabled={true}
                    isScrollGesturesEnabled={true}
                    isTiltGesturesEnabled={false}
                    isRotateGesturesEnabled={false}
                    isUseTextureViewAndroid={true}
                    onInitialized={() => setMapReady(true)}
                    camera={camera ?? undefined}
                    initialCamera={{ latitude: 37.5665, longitude: 126.978, zoom: 17 }}
                  >
            {/* 레이더 효과를 위한 베이스캠프 및 플레이어 마커 렌더링 */}
            {basecampCoord ? (
              <NaverMapMarkerOverlay
                key="marker-basecamp"
                latitude={basecampCoord.latitude}
                longitude={basecampCoord.longitude}
                width={32}
                height={32}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View collapsable={false} style={styles.basecampMarkerIcon}>
                  <Text style={styles.basecampMarkerEmoji}>감옥</Text>
                </View>
              </NaverMapMarkerOverlay>
            ) : null}

            {basecampCoord && battleZoneRadius != null ? (
              <NaverMapCircleOverlay
                key="battle-zone"
                latitude={basecampCoord.latitude}
                longitude={basecampCoord.longitude}
                radius={battleZoneRadius}
                color="rgba(0, 255, 80, 0.08)"
                outlineWidth={2}
                outlineColor="rgba(0, 255, 80, 0.35)"
              />
            ) : null}

            {/* 내 위치 블립 (레이더 타겟: 펄스 + 글로우) */}
            {smoothMyCoordVal ? (
              <NaverMapMarkerOverlay
                key="marker-me"
                latitude={smoothMyCoordVal.latitude}
                longitude={smoothMyCoordVal.longitude}
                width={28}
                height={28}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View collapsable={false} style={styles.blipMe}>
                  <Animated.View style={[styles.blipMeGlow, { transform: [{ scale: blipPulse }] }]} />
                  <View style={styles.blipMeInner} />
                </View>
              </NaverMapMarkerOverlay>
            ) : null}

            {/* 도둑 블립 (레이더: 빨간 점 + 글로우) */}
            {(isPolice ? policeVisibleThiefCoords : otherThiefCoords).map((thief) => {
              const isCaptured = thief.state === 'CAPTURED';
              const isJailed   = thief.state === 'JAILED';
              const blipColor  = isCaptured ? '#555' : isJailed ? '#FFAA00' : '#FF4444';
              const smoothCoord = getSmoothCoord(`player-${thief.playerId}`, {
                latitude: thief.latitude,
                longitude: thief.longitude,
              });

              return (
                <NaverMapMarkerOverlay
                  key={`marker-thief-${thief.playerId}`}
                  latitude={smoothCoord.latitude}
                  longitude={smoothCoord.longitude}
                  width={20}
                  height={20}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View collapsable={false} style={[styles.blipThief, styles.blipThiefGlow, { backgroundColor: blipColor, opacity: isCaptured ? 0.4 : 1 }]} />
                </NaverMapMarkerOverlay>
              );
            })}

            {/* 경찰 블립 (레이더: 파란 점 + 글로우) */}
            {isPolice && policeVisiblePoliceCoords.map((police) => {
              const smoothCoord = getSmoothCoord(`player-${police.playerId}`, {
                latitude: police.latitude,
                longitude: police.longitude,
              });
              return (
                <NaverMapMarkerOverlay
                  key={`marker-police-${police.playerId}`}
                  latitude={smoothCoord.latitude}
                  longitude={smoothCoord.longitude}
                  width={20}
                  height={20}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View collapsable={false} style={[styles.blipPolice, styles.blipPoliceGlow]} />
                </NaverMapMarkerOverlay>
              );
            })}
                  </NaverMapView>
                ) : (
                  <View style={styles.mapFallback}>
                    <Text style={styles.mapPlaceholder}>🗺️ 지도</Text>
                    <Text style={styles.mapSubText}>위치 권한이 필요합니다</Text>
                  </View>
                )}

                {/* 레이더 오버레이: 동심원, 스윕, 십자선 (원형 스코프 내부) */}
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 48, 16, 0.68)' }} />
                  {[0.25, 0.5, 0.75, 1].map((r, i) => {
                    const d = circleSize * r;
                    return (
                      <View
                        key={i}
                        style={{
                          position: 'absolute',
                          width: d,
                          height: d,
                          borderRadius: d / 2,
                          borderWidth: 1,
                          borderColor: `rgba(0, 255, 100, ${0.15 + i * 0.04})`,
                          left: (circleSize - d) / 2,
                          top: (circleSize - d) / 2,
                        }}
                      />
                    );
                  })}
                  <View style={{ position: 'absolute', top: radius - 0.5, left: 0, right: 0, height: 1, backgroundColor: 'rgba(0, 255, 100, 0.2)' }} />
                  <View style={{ position: 'absolute', left: radius - 0.5, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0, 255, 100, 0.2)' }} />
                  {(() => {
                    const armLen = radius;
                    const armLeft = radius - 1;
                    const translatePivot = armLen / 2;
                    const makeArm = (rotate: Animated.AnimatedInterpolation<string>, opacity: number, w: number) => ({
                      position: 'absolute' as const,
                      top: 0,
                      left: armLeft - (w - 2) / 2,
                      width: w,
                      height: armLen,
                      opacity,
                      backgroundColor: '#00FF64',
                      transform: [
                        { translateY: translatePivot },
                        { rotate },
                        { translateY: -translatePivot },
                      ],
                    });
                    return (
                      <>
                        <Animated.View style={[makeArm(radarTrail3, 0.06, 14), {}]} />
                        <Animated.View style={[makeArm(radarTrail2, 0.1, 10), {}]} />
                        <Animated.View style={[makeArm(radarTrail1, 0.18, 6), {}]} />
                        <Animated.View
                          style={[makeArm(radarRotateStr, 0.85, 2), {
                            shadowColor: '#00FF64',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 1,
                            shadowRadius: 6,
                            elevation: 4,
                          }]}
                        />
                      </>
                    );
                  })()}
                  <View style={{
                    position: 'absolute',
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#00FF64',
                    left: radius - 5,
                    top: radius - 5,
                    opacity: 0.95,
                  }} />
                </View>
              </View>
              </View>
            </View>
          );
        })()}

        {/* 도둑 전용: 경찰 근접 시 위험 경고 (사이드 빨간 깜빡임) */}
        {isPoliceNear && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.dangerSideLeft, { opacity: dangerOpacity }]} />
            <Animated.View style={[styles.dangerSideRight, { opacity: dangerOpacity }]} />
            <Animated.View style={[styles.dangerBanner, { opacity: dangerOpacity }]}>
              <Text style={styles.dangerBannerText}>⚠ 위험!</Text>
            </Animated.View>
          </View>
        )}

        {/* 마커 범례 (플로팅) - 경찰은 경찰/도둑/검거, 도둑은 나/도둑/검거만 */}
        <View style={styles.floatingLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#00FF50', borderRadius: 6 }]} />
            <Text style={styles.legendText}>나</Text>
          </View>
          {isPolice && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3A8DFF', borderRadius: 3 }]} />
              <Text style={styles.legendText}>경찰</Text>
            </View>
          )}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF3B30', borderRadius: 3 }]} />
            <Text style={styles.legendText}>도둑</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#666', borderRadius: 3 }]} />
            <Text style={styles.legendText}>검거</Text>
          </View>
        </View>

        {/* 도둑: 레이더 위 플로팅 (QR + 무전) */}
        {!isPolice && (
          <View style={styles.floatingControls}>
            <View style={styles.qrFloatingCard}>
              <Text style={styles.qrFloatingLabel}>내 QR</Text>
              {playerId ? (
                <QRCodeView value={playerId} size={56} showValue={false} padding={0} />
              ) : (
                <Text style={styles.qrPlaceholder}>...</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.pttFloatingButtonRound}
              onPressIn={() => gameLogic.requestPTT()}
              onPressOut={() => gameLogic.releasePTT()}
              activeOpacity={0.8}
            >
              <Text style={styles.pttFloatingIcon}>📻</Text>
            </TouchableOpacity>
            {gameLogic.activePTT?.activeThiefNickname && (
              <Text style={styles.pttStatusText}>🔊 {gameLogic.activePTT.activeThiefNickname}</Text>
            )}
          </View>
        )}
      </View>

      {/* 하단 고정: QR 검거(경찰) / 잡힘(도둑) 버튼 */}
      <View style={styles.bottomActionBar}>
        {isPolice ? (
          <TouchableOpacity
            style={[styles.bottomActionButton, styles.bottomActionButtonPolice]}
            onPress={() => {
              isProcessingScanRef.current = false;
              setQrScannerSession((v) => v + 1);
              setQrScannerVisible(true);
            }}
            disabled={isPoliceHiding}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomActionIcon}>📷</Text>
            <Text style={styles.bottomActionLabel}>QR 검거</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.bottomActionButton, styles.bottomActionButtonThief]}
            onPress={() => setCaughtModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomActionIcon}>🤝</Text>
            <Text style={styles.bottomActionLabel}>잡힘</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 현황 하단 시트: 현황 카드 탭 시 아래에서 올라옴 */}
      {isPanelExpanded && (
        <TouchableOpacity style={styles.sheetOverlay} onPress={togglePanel} activeOpacity={1} />
      )}
      <Animated.View style={[styles.bottomSlidePanel, { height: panelHeightAnim }]}>
        <TouchableOpacity style={styles.panelHandleWrap} onPress={togglePanel} activeOpacity={0.8}>
          <View style={styles.panelHandle} />
          <Text style={styles.panelHandleText}>▼ 닫기 ▼</Text>
        </TouchableOpacity>

        <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelScrollContent}>
          <View style={styles.panelSection}>
            <Text style={styles.panelSectionTitle}>THIEVES ({thieves.filter((t: any) => t.thiefStatus?.state === 'CAPTURED' || t.thiefStatus?.state === 'JAILED' || t.thiefStatus?.state === 'OUT_OF_ZONE' || !!t.outOfZoneAt).length} / {thieves.length})</Text>
            {thieves.length === 0 ? (
              <Text style={styles.listEmpty}>도둑 없음</Text>
            ) : (
              <View style={styles.thievesListContainer}>
                {thieves.map((t: any) => {
                  const isFree = t.thiefStatus?.state === 'FREE';
                  const isCaptured = t.thiefStatus?.state === 'CAPTURED';
                  const isJailed = t.thiefStatus?.state === 'JAILED';
                  const isOutOfZone = t.thiefStatus?.state === 'OUT_OF_ZONE' || !!(t as any).outOfZoneAt;
                  const canCapture = isPolice && status === 'CHASE' && isFree && !isPoliceHiding;
                  const canRelease = isPolice && status === 'CHASE' && isCaptured && !isPoliceHiding;
                  const canAction = canCapture || canRelease;
                  const label = isCaptured ? '검거됨' : isJailed ? '감금됨' : isOutOfZone ? '탈락' : '자유';
                  const isMe = t.playerId === playerId;

                  return (
                    <TouchableOpacity
                      key={t.playerId}
                      disabled={!isPolice || !canAction}
                      onPress={() => {
                        if (canCapture) gameLogic.attemptCapture(t.playerId);
                        if (canRelease) gameLogic.attemptRelease(t.playerId);
                      }}
                      style={[
                        styles.listItem,
                        styles.listItemGrid,
                        !isPolice && styles.listItemReadOnly,
                        isPolice && !canAction && styles.listItemDisabled,
                        isPolice && canAction && styles.listItemClickable,
                        isCaptured && styles.listItemCaptured,
                        isMe && styles.listItemMe,
                      ]}
                    >
                      <Text style={[styles.listItemText, isCaptured && styles.listItemTextCaptured]}>
                        {isMe ? `나 (${t.nickname})` : t.nickname}
                      </Text>
                      <Text
                        style={[
                          styles.listItemBadge,
                          t.thiefStatus?.state === 'CAPTURED' && styles.listItemBadgeCaptured,
                          t.thiefStatus?.state === 'JAILED' && styles.listItemBadgeJailed,
                          (t.thiefStatus?.state === 'OUT_OF_ZONE' || (t as any).outOfZoneAt) && styles.listItemBadgeOutOfZone,
                          t.thiefStatus?.state === 'FREE' && !(t as any).outOfZoneAt && styles.listItemBadgeFree,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.panelSection}>
            <Text style={styles.panelSectionTitle}>POLICE ({polices.length})</Text>
            {polices.length === 0 ? (
              <Text style={styles.listEmpty}>경찰 없음</Text>
            ) : (
              <View style={styles.thievesListContainer}>
                {polices.map((p: any) => {
                  const isMe = p.playerId === playerId;
                  return (
                    <View key={p.playerId} style={[styles.listItem, styles.listItemGrid, styles.listItemReadOnly, isMe && styles.listItemMe, { borderColor: '#3A8DFF' }]}>
                      <Text style={styles.listItemText}>
                        {isMe ? `나 (${p.nickname})` : p.nickname}
                      </Text>
                      <Text style={[styles.listItemBadge, { color: '#3A8DFF' }]}>경찰</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      </Animated.View>

      {isPolice && (
        <QRScanModal
          visible={qrScannerVisible}
          qrScannerSession={qrScannerSession}
          playerName={nickname || ''}
          onScannedRaw={handleQRScanned}
          onCancel={() => {
            isProcessingScanRef.current = false;
            setQrScannerVisible(false);
          }}
        />
      )}

      {showHidingCountdown && (
        <View style={styles.countdownOverlay}>
          <View style={styles.countdownContent}>
            <Animated.View style={[styles.countdownBox, { transform: [{ scale: pulse }] }]}>
              <Text style={styles.countdownText}>{hidingRemainingSec}</Text>
            </Animated.View>
            <Text style={styles.countdownSubtext}>
              {isPolice ? '경찰은 도둑이 숨을때 까지 대기해주세요!' : '도둑! 빨리 숨고 도망가세요!'}
            </Text>
          </View>
        </View>
      )}

      {isEliminated && (
        <View style={[styles.countdownOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
          <View style={styles.countdownContent}>
            <Text style={[styles.countdownText, { fontSize: 28 }]}>탈락</Text>
            <Text style={styles.countdownSubtext}>자기장 밖 5초 초과로 탈락했습니다</Text>
          </View>
        </View>
      )}

      {!isEliminated && outsideRemainingSec != null && outsideRemainingSec > 0 && (
        <View style={[styles.countdownOverlay, { backgroundColor: 'rgba(200,50,50,0.9)' }]}>
          <View style={styles.countdownContent}>
            <Text style={[styles.countdownText, { fontSize: 32, color: '#fff' }]}>{outsideRemainingSec}</Text>
            <Text style={styles.countdownSubtext}>자기장 밖! {outsideRemainingSec}초 후 탈락</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D2B55',
  },
  containerPolice: {
    backgroundColor: '#001B44',
  },
  containerThief: {
    backgroundColor: '#2D0B3A',
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#000',
    borderBottomWidth: 4,
    borderBottomColor: '#FF0055',
  },
  hudPolice: {
    borderBottomColor: '#00AAFF',
  },
  hudThief: {
    borderBottomColor: '#F9F871',
  },
  hudBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  hudBadgePolice: {
    backgroundColor: '#00AAFF',
  },
  hudBadgeThief: {
    backgroundColor: '#F9F871',
  },
  hudBadgeRight: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  hudEndGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#8B4513',
    borderWidth: 1,
    borderColor: '#654321',
    borderRadius: 4,
    gap: 4,
  },
  hudEndGameIcon: {
    fontSize: 14,
    color: '#fff',
  },
  hudEndGameText: {
    fontSize: 11,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statusCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 20, 0, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 80, 0.4)',
    borderRadius: 8,
    padding: 12,
  },
  statusCardLeft: {
    flex: 1,
  },
  statusCardRight: {
    flex: 1,
  },
  statusCardLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 4,
  },
  statusCardTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statusCardIndicators: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusIndicatorPolice: {
    backgroundColor: 'rgba(58, 141, 255, 0.4)',
    borderWidth: 1,
    borderColor: '#3A8DFF',
  },
  statusIndicatorThief: {
    backgroundColor: 'rgba(255, 59, 48, 0.4)',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  statusIndicatorCaptured: {
    backgroundColor: 'rgba(255, 200, 0, 0.4)',
    borderWidth: 1,
    borderColor: '#FFC800',
  },
  statusIndicatorEmoji: {
    fontSize: 14,
  },
  statusIndicatorNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  hudText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  hudTextDark: {
    color: '#000',
  },
  contentArea: {
    flex: 1,
    paddingBottom: 120, // bottomPanel 공간 확보
  },
  mapContainer: {
    height: '45%',
    backgroundColor: '#0f3460',
    margin: 16,
    borderWidth: 4,
    borderColor: '#000',
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  mapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00E5FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  mapSubText: {
    color: '#aaa',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  listPanel: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 12,
  },
  listTitle: {
    color: '#F9F871',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 8,
    letterSpacing: 1,
  },
  listEmpty: {
    color: '#aaa',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  thievesListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#00E5FF',
    marginBottom: 8,
    backgroundColor: '#111',
  },
  listItemGrid: {
    width: '48%',
  },
  listItemDisabled: {
    opacity: 0.5,
  },
  listItemClickable: {
    borderColor: '#FF0055',
  },
  listItemReadOnly: {
    // 클릭 불가능한 아이템 (도둑 화면)
  },
  listItemMe: {
    borderColor: '#F9F871',
    backgroundColor: '#222',
  },
  listItemCaptured: {
    backgroundColor: '#333',
    borderColor: '#666',
    opacity: 0.7,
  },
  listItemText: {
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: 'bold',
  },
  listItemTextCaptured: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  listItemBadge: {
    color: '#00E5FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: 'bold',
  },
  listItemBadgeFree: {
    color: '#00E5FF',
  },
  listItemBadgeCaptured: {
    color: '#999',
  },
  listItemBadgeJailed: {
    color: '#FFAA00',
  },
  listItemBadgeOutOfZone: {
    color: '#FF5555',
  },
  listHint: {
    color: '#00E5FF',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginTop: 4,
  },
  qrScanButtonWrap: {
    marginTop: 10,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 16,
  },
  splitSquare: {
    aspectRatio: 1,
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#0f3460',
    overflow: 'hidden',
  },
  splitSquareLeft: {
    flex: 1,
  },
  splitSquareRight: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    backgroundColor: '#fff',
  },
  qrPlaceholder: {
    color: '#333',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  pttPanel: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 4,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
  },
  pttButtonRound: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF2D6A',
    borderWidth: 4,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 4,
  },
  pttButtonIcon: {
    fontSize: 30,
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  pttButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  pttStatusText: {
    marginTop: 8,
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#000',
    borderTopWidth: 4,
    borderTopColor: '#00E5FF',
  },
  statusTitle: {
    color: '#F9F871',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statusDesc: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 10,
  },
  countdownContent: {
    alignItems: 'center',
  },
  countdownSubtext: {
    marginTop: 16,
    color: '#F9F871',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textShadowColor: '#FF0055',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  countdownBox: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#00E5FF',
    borderBottomWidth: 8,
    borderRightWidth: 8,
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  countdownText: {
    color: '#F9F871',
    fontSize: 96,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textShadowColor: '#FF0055',
    textShadowOffset: { width: 6, height: 6 },
    textShadowRadius: 0,
    letterSpacing: 2,
  },
  policeMarkerIcon: {
    width: 10,
    height: 10,
    backgroundColor: '#3A8DFF',
    borderRadius: 5,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thiefMarkerIcon: {
    width: 10,
    height: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 5,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thiefMarkerIconCaptured: {
    backgroundColor: '#555',
  },
  markerEmoji: {
    fontSize: 1,
    opacity: 0,
  },
  markerEmojiCaptured: {
    opacity: 0.5,
  },
  basecampMarkerIcon: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(0, 30, 0, 0.9)',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#00FF64',
    justifyContent: 'center',
    alignItems: 'center',
  },
  basecampMarkerEmoji: {
    fontSize: 9,
    color: '#00FF64',
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  legendBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#00FF80',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  // 레이더 블립 (마커)
  blipMe: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blipMeGlow: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 100, 0.35)',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 100, 0.5)',
  },
  blipMeInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00FF64',
    zIndex: 1,
  },
  blipPolice: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00A8FF',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.6)',
  },
  blipPoliceGlow: {
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  blipThief: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  blipThiefGlow: {
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 3,
  },
  // ── 전체화면 맵 컨테이너 (레이더 스코프) ──
  fullScreenMapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    paddingBottom: 90, // 하단 QR검거/잡힘 버튼 공간
  },
  radarScopeWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarBezel: {
    borderWidth: 4,
    borderColor: 'rgba(0, 255, 100, 0.4)',
    backgroundColor: 'rgba(0, 20, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarScopeCircle: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 100, 0.5)',
    position: 'relative',
  },
  // ── 플로팅 범례 ──
  floatingLegend: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0, 10, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 80, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  // ── 플로팅 컨트롤 (우하단) ──
  floatingControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    alignItems: 'center',
    gap: 8,
  },
  thiefControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingButtonWrap: {},
  floatingButton: {
    width: 52,
    height: 52,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 4,
  },
  floatingButtonIcon: {
    fontSize: 22,
  },
  floatingButtonLabel: {
    fontSize: 9,
    color: '#fff',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  dangerSideLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 36,
    backgroundColor: 'rgba(255, 40, 40, 0.85)',
  },
  dangerSideRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    backgroundColor: 'rgba(255, 40, 40, 0.85)',
  },
  dangerBanner: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dangerBannerText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF3333',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  qrFloatingCard: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderWidth: 2,
    borderColor: '#00FF50',
    padding: 6,
    alignItems: 'center',
    borderRadius: 3,
  },
  qrFloatingLabel: {
    color: '#00FF50',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 3,
  },
  pttFloatingButtonRound: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF2D6A',
    borderWidth: 3,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF2D6A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 5,
  },
  pttFloatingIcon: {
    fontSize: 24,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'rgba(0, 10, 0, 0.95)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(0, 255, 80, 0.4)',
  },
  bottomActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 10,
    borderWidth: 3,
    borderColor: '#000',
  },
  bottomActionButtonPolice: {
    backgroundColor: '#00E5FF',
  },
  bottomActionButtonThief: {
    backgroundColor: '#FF2D6A',
  },
  bottomActionIcon: {
    fontSize: 28,
  },
  bottomActionLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  // ── 하단 슬라이드 패널 ──
  bottomSlidePanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 8, 0, 0.98)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(0, 255, 80, 0.5)',
    overflow: 'hidden',
  },
  panelHandleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 80, 0.2)',
  },
  panelHandle: {
    width: 36,
    height: 3,
    backgroundColor: 'rgba(0, 255, 80, 0.4)',
    borderRadius: 2,
    marginBottom: 3,
  },
  panelHandleText: {
    color: '#00FF50',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 1,
  },
  panelScroll: {
    flex: 1,
  },
  panelScrollContent: {
    paddingBottom: 8,
  },
  panelSection: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  panelSectionTitle: {
    color: 'rgba(0, 255, 80, 0.8)',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 6,
    letterSpacing: 1,
  },
});
