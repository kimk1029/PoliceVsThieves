import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Animated,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {
  NaverMapCircleOverlay,
  NaverMapMarkerOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { useGameStore } from '../store/useGameStore';
import { getBattleZoneRadiusMeters, BATTLE_ZONE_INITIAL_RADIUS_M } from '../utils/battleZone';
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
  const { status, players, basecamp, fixedBasecamp, settings, phaseEndsAt, setFixedBasecampFromCurrentLocation } =
    useGameStore();
  const playersList = Array.from(players.values());

  // BATTLE 모드: 방장의 첫 위치를 공통 베이스캠프로 사용 (한 번 설정되면 고정)
  const [hostBasecamp, setHostBasecamp] = useState<{ lat: number; lng: number } | null>(null);

  // 현재 위치가 인식되면 그 위치를 베이스캠프로 고정 (BASIC 모드만)
  // BATTLE 모드: 방장 위치 기준이므로 여기서 덮어쓰지 않음
  useEffect(() => {
    if (status == null || status === 'END') return;
    if (settings?.gameMode === 'BATTLE') return;
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return;
    if (!isFinite(location.lat) || !isFinite(location.lng)) return;
    if (location.lat === 0 && location.lng === 0) return;
    setFixedBasecampFromCurrentLocation(location.lat, location.lng);
  }, [status, settings?.gameMode, location?.lat, location?.lng, setFixedBasecampFromCurrentLocation]);

  // BATTLE 모드: 방장의 첫 유효 위치를 베이스캠프로 고정 (모든 플레이어 동일)
  useEffect(() => {
    if (status == null || status === 'END') return;
    if (settings?.gameMode !== 'BATTLE') return;
    if (hostBasecamp) return; // 이미 설정됨
    const host = playersList.find((p) => (p as any).role === 'HOST');
    if (!host) return;
    const isMeHost = host.playerId === playerId;
    const hostLoc = isMeHost ? location : (host as any).location;
    if (!hostLoc || typeof hostLoc.lat !== 'number' || typeof hostLoc.lng !== 'number') return;
    if (!isFinite(hostLoc.lat) || !isFinite(hostLoc.lng)) return;
    if (hostLoc.lat === 0 && hostLoc.lng === 0) return;
    setHostBasecamp({ lat: hostLoc.lat, lng: hostLoc.lng });
  }, [status, settings?.gameMode, playersList, playerId, location?.lat, location?.lng, hostBasecamp]);

  // 게임 종료 시 host basecamp 리셋
  useEffect(() => {
    if (status === 'END') setHostBasecamp(null);
  }, [status]);

  // 베이스캠프 좌표: BATTLE = 서버 basecamp 우선(모든 플레이어 동일), 없으면 방장 위치 폴백. BASIC = 고정/서버 basecamp
  const basecampSource =
    settings?.gameMode === 'BATTLE'
      ? (fixedBasecamp ?? basecamp ?? hostBasecamp)
      : fixedBasecamp ?? basecamp;
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
  }, [myLocationCoord, upsertSmoothPosition, isPolice]);

  // 게임 총시간 타이머 (BATTLE 자기장 부드러운 축소를 위해 100ms 간격)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const totalRemainingSec = gameEndsAt
    ? Math.max(0, Math.ceil((gameEndsAt - now) / 1000))
    : 0;

  // 플레이가능 영역(자기장): 베이스캠프 중심 실제 거리 1km(미터), HIDING/CHASE 모두 표시. 전체시간 40% 후 축소
  const battleZoneRadius =
    basecampCoord &&
      (status === 'HIDING' || status === 'CHASE') &&
      phaseEndsAt != null &&
      settings?.hidingSeconds != null &&
      settings?.chaseSeconds
      ? status === 'HIDING'
        ? BATTLE_ZONE_INITIAL_RADIUS_M
        : getBattleZoneRadiusMeters(
          phaseEndsAt,
          settings.hidingSeconds,
          settings.chaseSeconds,
          now
        )
      : null;

  // 플레이어 분류
  const thieves = playersList.filter((p: any) => p.team === 'THIEF');
  const polices = playersList.filter((p: any) => p.team === 'POLICE');
  const isPolice = team === 'POLICE';
  const isPoliceHiding = isPolice && hidingRemainingSec > 0;

  // 경찰 화면: 도둑 위치
  const policeVisibleThiefCoords = isPolice
    ? thieves
      .filter((t: any) => {
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

  // 경찰 화면: 경찰 위치 (본인 제외)
  const policeVisiblePoliceCoords = isPolice
    ? polices
      .filter((p: any) => {
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

  // 도둑 화면: 다른 도둑 위치 (본인 제외)
  const otherThiefCoords = !isPolice
    ? thieves
      .filter((t: any) => {
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

      gameLogic.attemptCapture(thiefId);
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

  const bg = isPolice ? styles.containerPolice : styles.containerThief;
  const smoothMyCoordVal = myLocationCoord ? getSmoothCoord('me', myLocationCoord) : null;

  return (
    <SafeAreaView style={[styles.container, bg]}>
      <StatusBar barStyle="light-content" backgroundColor={isPolice ? '#001B44' : '#2D0B3A'} />

      {/* HUD */}
      <View style={[styles.hud, isPolice ? styles.hudPolice : styles.hudThief]}>
        <View style={[styles.hudBadge, isPolice ? styles.hudBadgePolice : styles.hudBadgeThief]}>
          <Text style={[styles.hudText, !isPolice && styles.hudTextDark]}>{roleLabel}</Text>
        </View>
        <View style={styles.hudBadgeRight}>
          <Text style={styles.hudText}>게임 총시간: {totalRemainingSec}s</Text>
        </View>
      </View>

      <View style={styles.contentArea}>
        {isPolice ? (
          <>
            <View style={styles.mapContainer}>
              {hasLocationPermission ? (
                <NaverMapView
                  ref={mapRef}
                  style={styles.map}
                  isShowLocationButton={false}
                  isZoomGesturesEnabled={false}
                  isScrollGesturesEnabled={false}
                  isTiltGesturesEnabled={false}
                  isRotateGesturesEnabled={false}
                  isUseTextureViewAndroid={true}
                  onInitialized={() => setMapReady(true)}
                  camera={camera ?? undefined}
                  initialCamera={{ latitude: 37.5665, longitude: 126.978, zoom: 17 }}
                >
                  {/* 베이스캠프·자기장은 먼저 그려서 플레이어 마커가 위에 오도록 */}
                  {basecampCoord ? (
                    <NaverMapMarkerOverlay
                      key="marker-basecamp"
                      latitude={basecampCoord.latitude}
                      longitude={basecampCoord.longitude}
                      width={28}
                      height={28}
                      anchor={{ x: 0.5, y: 1 }}
                    >
                      <View collapsable={false} style={styles.basecampMarkerIcon}>
                        <Text style={styles.basecampMarkerEmoji}>BC</Text>
                      </View>
                    </NaverMapMarkerOverlay>
                  ) : null}
                  {basecampCoord && battleZoneRadius != null ? (
                    <NaverMapCircleOverlay
                      key="battle-zone"
                      latitude={basecampCoord.latitude}
                      longitude={basecampCoord.longitude}
                      radius={battleZoneRadius}
                      color="rgba(135, 206, 235, 0.28)"
                      outlineWidth={3}
                      outlineColor="rgba(135, 206, 235, 0.85)"
                    />
                  ) : null}
                  {smoothMyCoordVal ? (
                    <NaverMapMarkerOverlay
                      key="marker-me"
                      latitude={smoothMyCoordVal.latitude}
                      longitude={smoothMyCoordVal.longitude}
                      width={25}
                      height={25}
                      anchor={{ x: 0.5, y: 1 }}
                    >
                      <View collapsable={false} style={styles.policeMarkerIcon}>
                        <Text style={styles.markerEmoji}>👮</Text>
                      </View>
                    </NaverMapMarkerOverlay>
                  ) : null}
                  {policeVisibleThiefCoords.map((thief) => {
                    const isCaptured = thief.state === 'CAPTURED';
                    const isJailed = thief.state === 'JAILED';
                    const borderColor = isCaptured
                      ? '#666'
                      : isJailed
                        ? '#FFAA00'
                        : '#F9F871';
                    const smoothCoord = getSmoothCoord(`player-${thief.playerId}`, {
                      latitude: thief.latitude,
                      longitude: thief.longitude,
                    });

                    return (
                      <NaverMapMarkerOverlay
                        key={`marker-thief-${thief.playerId}`}
                        latitude={smoothCoord.latitude}
                        longitude={smoothCoord.longitude}
                        width={25}
                        height={25}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <View
                          collapsable={false}
                          style={[
                            styles.thiefMarkerIcon,
                            { borderColor },
                            isCaptured && styles.thiefMarkerIconCaptured,
                          ]}
                        >
                          <Text
                            style={[
                              styles.markerEmoji,
                              isCaptured && styles.markerEmojiCaptured,
                            ]}
                          >
                            🦹
                          </Text>
                        </View>
                      </NaverMapMarkerOverlay>
                    );
                  })}
                  {policeVisiblePoliceCoords.map((police) => {
                    const smoothCoord = getSmoothCoord(`player-${police.playerId}`, {
                      latitude: police.latitude,
                      longitude: police.longitude,
                    });
                    return (
                      <NaverMapMarkerOverlay
                        key={`marker-police-${police.playerId}`}
                        latitude={smoothCoord.latitude}
                        longitude={smoothCoord.longitude}
                        width={25}
                        height={25}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <View collapsable={false} style={styles.policeMarkerIcon}>
                          <Text style={styles.markerEmoji}>👮</Text>
                        </View>
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
            </View>

            <View style={styles.listPanel}>
              <Text style={styles.listTitle}>THIEVES</Text>
              {thieves.length === 0 ? (
                <Text style={styles.listEmpty}>도둑 없음</Text>
              ) : (
                <View style={styles.thievesListContainer}>
                  {thieves.map((t: any) => {
                    const isFree = t.thiefStatus?.state === 'FREE';
                    const isCaptured = t.thiefStatus?.state === 'CAPTURED';
                    const isJailed = t.thiefStatus?.state === 'JAILED';
                    const isOutOfZone =
                      t.thiefStatus?.state === 'OUT_OF_ZONE' || !!(t as any).outOfZoneAt;
                    const canCapture = status === 'CHASE' && isFree && !isPoliceHiding;
                    const canRelease = status === 'CHASE' && isCaptured && !isPoliceHiding;
                    const canAction = canCapture || canRelease;
                    const label = isCaptured
                      ? '검거됨'
                      : isJailed
                        ? '감금됨'
                        : isOutOfZone
                          ? '탈락'
                          : '자유';
                    return (
                      <TouchableOpacity
                        key={t.playerId}
                        disabled={!canAction}
                        onPress={() => {
                          if (canCapture) gameLogic.attemptCapture(t.playerId);
                          if (canRelease) gameLogic.attemptRelease(t.playerId);
                        }}
                        style={[
                          styles.listItem,
                          styles.listItemGrid,
                          !canAction && styles.listItemDisabled,
                          canAction && styles.listItemClickable,
                          isCaptured && styles.listItemCaptured,
                        ]}
                      >
                        <Text
                          style={[
                            styles.listItemText,
                            isCaptured && styles.listItemTextCaptured,
                          ]}
                        >
                          {t.nickname}
                        </Text>
                        <Text
                          style={[
                            styles.listItemBadge,
                            t.thiefStatus?.state === 'CAPTURED' && styles.listItemBadgeCaptured,
                            t.thiefStatus?.state === 'JAILED' && styles.listItemBadgeJailed,
                            (t.thiefStatus?.state === 'OUT_OF_ZONE' || (t as any).outOfZoneAt) &&
                            styles.listItemBadgeOutOfZone,
                            t.thiefStatus?.state === 'FREE' &&
                            !(t as any).outOfZoneAt &&
                            styles.listItemBadgeFree,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={styles.listHint}>
                {isPoliceHiding
                  ? '경찰 대기시간 진행 중'
                  : status !== 'CHASE'
                    ? '추격전 시작 후 검거 가능합니다'
                    : '자유 상태의 도둑을 눌러 검거 시도'}
              </Text>
              <View style={styles.qrScanButtonWrap}>
                <PixelButton
                  text="QR 스캔 검거"
                  variant="primary"
                  size="medium"
                  onPress={() => {
                    isProcessingScanRef.current = false;
                    setQrScannerSession((v) => v + 1);
                    setQrScannerVisible(true);
                  }}
                  disabled={isPoliceHiding}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.splitRow}>
              <View style={[styles.splitSquare, styles.splitSquareLeft]}>
                {hasLocationPermission ? (
                  <NaverMapView
                    ref={mapRef}
                    style={styles.map}
                    isShowLocationButton={false}
                    isZoomGesturesEnabled={false}
                    isScrollGesturesEnabled={false}
                    isTiltGesturesEnabled={false}
                    isRotateGesturesEnabled={false}
                    isUseTextureViewAndroid={true}
                    onInitialized={() => setMapReady(true)}
                    camera={camera ?? undefined}
                    initialCamera={{ latitude: 37.5665, longitude: 126.978, zoom: 17 }}
                  >
                    {/* 베이스캠프·자기장은 먼저 그려서 플레이어 마커가 위에 오도록 */}
                    {basecampCoord ? (
                      <NaverMapMarkerOverlay
                        key="marker-basecamp"
                        latitude={basecampCoord.latitude}
                        longitude={basecampCoord.longitude}
                        width={28}
                        height={28}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <View collapsable={false} style={styles.basecampMarkerIcon}>
                          <Text style={styles.basecampMarkerEmoji}>BC</Text>
                        </View>
                      </NaverMapMarkerOverlay>
                    ) : null}
                    {basecampCoord && battleZoneRadius != null ? (
                      <NaverMapCircleOverlay
                        key="battle-zone"
                        latitude={basecampCoord.latitude}
                        longitude={basecampCoord.longitude}
                        radius={battleZoneRadius}
                        color="rgba(135, 206, 235, 0.28)"
                        outlineWidth={3}
                        outlineColor="rgba(135, 206, 235, 0.85)"
                      />
                    ) : null}
                    {smoothMyCoordVal ? (
                      <NaverMapMarkerOverlay
                        key="marker-me"
                        latitude={smoothMyCoordVal.latitude}
                        longitude={smoothMyCoordVal.longitude}
                        width={25}
                        height={25}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <View collapsable={false} style={styles.thiefMarkerIcon}>
                          <Text style={styles.markerEmoji}>🦹</Text>
                        </View>
                      </NaverMapMarkerOverlay>
                    ) : null}
                    {otherThiefCoords.map((thief) => {
                      const isCaptured = thief.state === 'CAPTURED';
                      const isJailed = thief.state === 'JAILED';
                      const borderColor = isCaptured
                        ? '#666'
                        : isJailed
                          ? '#FFAA00'
                          : '#F9F871';
                      const smoothCoord = getSmoothCoord(`player-${thief.playerId}`, {
                        latitude: thief.latitude,
                        longitude: thief.longitude,
                      });

                      return (
                        <NaverMapMarkerOverlay
                          key={`marker-thief-${thief.playerId}`}
                          latitude={smoothCoord.latitude}
                          longitude={smoothCoord.longitude}
                          width={25}
                          height={25}
                          anchor={{ x: 0.5, y: 1 }}
                        >
                          <View
                            collapsable={false}
                            style={[
                              styles.thiefMarkerIcon,
                              { borderColor },
                              isCaptured && styles.thiefMarkerIconCaptured,
                            ]}
                          >
                            <Text
                              style={[
                                styles.markerEmoji,
                                isCaptured && styles.markerEmojiCaptured,
                              ]}
                            >
                              🦹
                            </Text>
                          </View>
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
              </View>
              <View
                style={[styles.splitSquare, styles.splitSquareRight]}
                onLayout={(event) => {
                  const nextSize = Math.floor(
                    Math.min(event.nativeEvent.layout.width, event.nativeEvent.layout.height),
                  );
                  if (nextSize > 60 && nextSize !== qrSize) {
                    setQrSize(nextSize);
                  }
                }}
              >
                <View style={styles.qrPanel}>
                  {playerId ? (
                    <QRCodeView value={playerId} size={qrSize} showValue={false} padding={0} />
                  ) : (
                    <Text style={styles.qrPlaceholder}>QR 생성 중...</Text>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.listPanel}>
              <Text style={styles.listTitle}>THIEVES</Text>
              {thieves.length === 0 ? (
                <Text style={styles.listEmpty}>도둑 없음</Text>
              ) : (
                <View style={styles.thievesListContainer}>
                  {thieves.map((t: any) => {
                    const isCaptured = t.thiefStatus?.state === 'CAPTURED';
                    const isOutOfZone =
                      t.thiefStatus?.state === 'OUT_OF_ZONE' || !!(t as any).outOfZoneAt;
                    const label =
                      t.thiefStatus?.state === 'CAPTURED'
                        ? '검거됨'
                        : t.thiefStatus?.state === 'JAILED'
                          ? '감금됨'
                          : isOutOfZone
                            ? '탈락'
                            : '자유';
                    const isMe = t.playerId === playerId;
                    return (
                      <View
                        key={t.playerId}
                        style={[
                          styles.listItem,
                          styles.listItemGrid,
                          styles.listItemReadOnly,
                          isMe && styles.listItemMe,
                          isCaptured && styles.listItemCaptured,
                        ]}
                      >
                        <Text
                          style={[
                            styles.listItemText,
                            isCaptured && styles.listItemTextCaptured,
                          ]}
                        >
                          {isMe ? `나 (${t.nickname})` : t.nickname}
                        </Text>
                        <Text
                          style={[
                            styles.listItemBadge,
                            t.thiefStatus?.state === 'CAPTURED' && styles.listItemBadgeCaptured,
                            t.thiefStatus?.state === 'JAILED' && styles.listItemBadgeJailed,
                            (t.thiefStatus?.state === 'OUT_OF_ZONE' || (t as any).outOfZoneAt) &&
                            styles.listItemBadgeOutOfZone,
                            t.thiefStatus?.state === 'FREE' &&
                            !(t as any).outOfZoneAt &&
                            styles.listItemBadgeFree,
                          ]}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
              <Text style={styles.listHint}>경찰을 피해 생존하세요</Text>
            </View>
            <View style={styles.pttPanel}>
              <TouchableOpacity
                style={styles.pttButtonRound}
                onPressIn={() => gameLogic.requestPTT()}
                onPressOut={() => gameLogic.releasePTT()}
                activeOpacity={0.8}
              >
                <Text style={styles.pttButtonIcon}>📻</Text>
              </TouchableOpacity>
              {gameLogic.activePTT?.activeThiefNickname ? (
                <Text style={styles.pttStatusText}>
                  🔊 무전 중: {gameLogic.activePTT.activeThiefNickname}
                </Text>
              ) : (
                <Text style={styles.pttStatusText}>무전 대기</Text>
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.bottomPanel}>
        <Text style={styles.statusTitle}>MISSION: CAPTURE</Text>
        <Text style={styles.statusDesc}>Find and capture all thieves.</Text>

        <PixelButton text="게임 종료" variant="danger" size="large" onPress={onConfirmEndGame} />
      </View>

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
              {isPolice
                ? '경찰은 도둑이 숨을때 까지 대기해주세요!'
                : '도둑! 빨리 숨고 도망가세요!'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
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
    width: 26,
    height: 26,
    backgroundColor: 'transparent',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1B5E20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  basecampMarkerEmoji: {
    fontSize: 8,
    color: '#1B5E20',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
