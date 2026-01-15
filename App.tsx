import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ImprovedLobbyScreen} from './src/screens/ImprovedLobbyScreen';
import {SplashScreen} from './src/screens/SplashScreen';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  SafeAreaView,
  Animated,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import {useGameStore} from './src/store/useGameStore';
import {usePlayerStore} from './src/store/usePlayerStore';
import {useGameLogic} from './src/hooks/useGameLogic';
import {PixelButton} from './src/components/pixel/PixelButton';
import {NaverMapMarkerOverlay, NaverMapView} from '@mj-studio/react-native-naver-map';

const App = (): React.JSX.Element => {
  const [screen, setScreen] = useState('splash'); // Start with splash
  const [screenParams, setScreenParams] = useState<any>({});

  // ✅ WebSocket/게임 로직은 앱 전체에서 1번만 생성해서 유지
  const gameLogic = useGameLogic();

  // 게임 진입 시 위치 트래킹 시작(1회)
  const startedLocationRef = useRef(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(Platform.OS !== 'android');

  // 위치 권한은 "앱 시작 시" 한 번만 요청 (게임 화면 진입과 겹치면 화면/지도 렌더가 꼬일 수 있음)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: '위치 권한',
            message: '게임 진행을 위해 현재 위치 권한이 필요합니다.',
            buttonNegative: '취소',
            buttonPositive: '허용',
          },
        );
        setHasLocationPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (e) {
        console.log('[App] location permission request failed', e);
        setHasLocationPermission(false);
      }
    })();
  }, []);

  const returnToLobby = useCallback(() => {
    // 방에서 나가고(서버에 leave), 위치 트래킹도 중단되도록 처리
    gameLogic.leaveRoom();

    // 핵심: status/roomId가 남아있으면 ImprovedLobbyScreen에서 status !== 'LOBBY' 감지로
    // 다시 game 화면으로 튕길 수 있어서, 로비 복귀 시에는 store를 리셋해야 합니다.
    useGameStore.getState().reset();
    startedLocationRef.current = false;
    setScreen('lobby');
    setScreenParams({});
  }, [gameLogic]);

  const confirmEndGame = useCallback(() => {
    Alert.alert('게임 종료', '정말 게임을 종료하고 방을 나가시겠습니까?', [
      {text: '남아있기', style: 'cancel'},
      {text: '게임끝내기', style: 'destructive', onPress: returnToLobby},
    ]);
  }, [returnToLobby]);

  const navigate = (newScreen: string, params?: any) => {
    setScreen(newScreen);
    setScreenParams(params || {});
  };

  const {team, location} = usePlayerStore();
  const {status, phaseEndsAt, players, settings} = useGameStore();

  // 게임 진입 시 위치 트래킹 시작(1회)
  useEffect(() => {
    if (screen !== 'game') return;
    if (startedLocationRef.current) return;
    if (!hasLocationPermission) return;
    startedLocationRef.current = true;
    gameLogic.startLocationTracking();
  }, [screen, gameLogic, hasLocationPermission]);

  // phaseEndsAt 기반 타이머(초)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (screen !== 'game') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [screen]);

  // 기본 카운트다운(서버 기준)
  const remainingSec = phaseEndsAt ? Math.max(0, Math.ceil((phaseEndsAt - now) / 1000)) : 0;

  // HIDING 카운트다운 애니메이션(픽셀 느낌)
  const pulse = useRef(new Animated.Value(1)).current;
  const lastShown = useRef<number | null>(null);
  useEffect(() => {
    if (screen !== 'game') return;
    // 숨는시간(HIDING) 오버레이는 HIDING 동안에만 표시한다.
    if (status !== 'HIDING') return;
    if (remainingSec <= 0) return;

    const shown = remainingSec;
    if (lastShown.current === shown) return;
    lastShown.current = shown;

    Animated.sequence([
      Animated.timing(pulse, {toValue: 1.15, duration: 120, useNativeDriver: true}),
      Animated.timing(pulse, {toValue: 1, duration: 120, useNativeDriver: true}),
    ]).start();
  }, [screen, status, remainingSec, pulse]);

  // ─────────────────────────────────────────────────────────────
  // 🚀 SPLASH SCREEN
  // ─────────────────────────────────────────────────────────────
  if (screen === 'splash') {
    return <SplashScreen onFinish={() => setScreen('lobby')} />;
  }

  // ─────────────────────────────────────────────────────────────
  // 🏠 LOBBY SCREEN
  // ─────────────────────────────────────────────────────────────
  if (screen === 'lobby') {
    return <ImprovedLobbyScreen onNavigate={navigate} gameLogic={gameLogic} />;
  }

  // ─────────────────────────────────────────────────────────────
  // 🎮 GAME SCREEN (Placeholder with Retro Style)
  // ─────────────────────────────────────────────────────────────
  if (screen === 'game') {
    const roleLabel = team === 'POLICE' ? '🚔 경찰' : team === 'THIEF' ? '🏃 도둑' : '…';
    // 숨는시간(HIDING)은 딤 오버레이에서만 "처음에만" 보여주고,
    // HIDING이 끝나면(CHASE부터) 오버레이는 절대 보여주지 않는다.
    const showHidingCountdown = status === 'HIDING' && remainingSec > 0;
    const countdownValue = remainingSec;

    // 요구사항:
    // - 숨는시간은 메인(오버레이)에서만 보여준다.
    // - 게임 총시간은 오른쪽 상단(HUD)에서만 "계속 감소"해야 한다.
    //   (HIDING -> CHASE로 넘어갈 때 "또 새로 카운트다운"처럼 보이지 않도록,
    //    HIDING 중에도 totalRemainingSec는 계속 줄어들게 계산)
    const chaseMs = (settings?.chaseSeconds ?? 0) * 1000;
    const totalEndsAt =
      phaseEndsAt && status === 'HIDING'
        ? phaseEndsAt + chaseMs
        : phaseEndsAt && status === 'CHASE'
          ? phaseEndsAt
          : null;
    const totalRemainingSec = totalEndsAt ? Math.max(0, Math.ceil((totalEndsAt - now) / 1000)) : 0;

    const playersList = Array.from(players.values());
    const thieves = playersList.filter((p: any) => p.team === 'THIEF');

    const isPolice = team === 'POLICE';
    const bg = isPolice ? styles.containerPolice : styles.containerThief;

    const myCoord =
      location && typeof location.lat === 'number' && typeof location.lng === 'number'
        ? {latitude: location.lat, longitude: location.lng}
        : null;

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

        {/* POLICE / THIEF 화면 분리 */}
        {isPolice ? (
          <>
            {/* MAP AREA */}
            <View style={styles.mapContainer}>
              {hasLocationPermission ? (
                <NaverMapView
                  style={styles.map}
                  // Naver 지도 내장 "내 위치 버튼"은 Google FusedLocationSource를 사용하며,
                  // play-services-location 버전/기기 환경에 따라 크래시가 날 수 있어 비활성화합니다.
                  isShowLocationButton={false}
                  // NOTE: 추적 모드(Follow)는 네이티브 위치 엔진을 사용하며,
                  // 일부 기기/환경에서 멈춤(파란 화면/먹통) 이슈가 있을 수 있어
                  // 앱의 LocationService(react-native-geolocation-service) 기반으로 직접 카메라/마커를 제어합니다.
                  initialCamera={{latitude: 37.5665, longitude: 126.978, zoom: 15}}
                  camera={myCoord ? {latitude: myCoord.latitude, longitude: myCoord.longitude, zoom: 16} : undefined}
                  animationDuration={200}
                >
                  {myCoord ? (
                    <NaverMapMarkerOverlay
                      latitude={myCoord.latitude}
                      longitude={myCoord.longitude}
                      caption={{text: '나'}}
                    />
                  ) : null}
                </NaverMapView>
              ) : (
                <View style={styles.mapFallback}>
                  <Text style={styles.mapPlaceholder}>🗺️ 지도</Text>
                  <Text style={styles.mapSubText}>위치 권한이 필요합니다</Text>
                </View>
              )}
            </View>

            {/* THIEVES LIST */}
            <View style={styles.listPanel}>
              <Text style={styles.listTitle}>THIEVES</Text>
              {thieves.length === 0 ? (
                <Text style={styles.listEmpty}>도둑 없음</Text>
              ) : (
                thieves.map((t: any) => {
                  const disabled = status !== 'CHASE' || t.thiefStatus?.state !== 'FREE';
                  const label =
                    t.thiefStatus?.state === 'CAPTURED'
                      ? 'CAPTURED'
                      : t.thiefStatus?.state === 'JAILED'
                        ? 'JAILED'
                        : 'FREE';
                  return (
                    <TouchableOpacity
                      key={t.playerId}
                      disabled={disabled}
                      onPress={() => gameLogic.attemptCapture(t.playerId)}
                      style={[
                        styles.listItem,
                        disabled && styles.listItemDisabled,
                      ]}
                    >
                      <Text style={styles.listItemText}>{t.nickname}</Text>
                      <Text style={styles.listItemBadge}>{label}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
              <Text style={styles.listHint}>
                {status !== 'CHASE' ? '추격전 시작 후 검거 가능합니다' : '도둑을 눌러 검거 시도'}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.mapContainer}>
              {hasLocationPermission ? (
                <NaverMapView
                  style={styles.map}
                  isShowLocationButton={false}
                  initialCamera={{latitude: 37.5665, longitude: 126.978, zoom: 15}}
                  camera={myCoord ? {latitude: myCoord.latitude, longitude: myCoord.longitude, zoom: 16} : undefined}
                  animationDuration={200}
                >
                  {myCoord ? (
                    <NaverMapMarkerOverlay
                      latitude={myCoord.latitude}
                      longitude={myCoord.longitude}
                      caption={{text: '나'}}
                    />
                  ) : null}
                </NaverMapView>
              ) : (
                <View style={styles.mapFallback}>
                  <Text style={styles.mapPlaceholder}>🗺️ 지도</Text>
                  <Text style={styles.mapSubText}>위치 권한이 필요합니다</Text>
                </View>
              )}
            </View>
            <View style={styles.listPanel}>
              <Text style={styles.listTitle}>STATUS</Text>
              <Text style={styles.listEmpty}>경찰을 피해 생존하세요</Text>
            </View>
          </>
        )}

        {/* BOTTOM PANEL */}
        <View style={styles.bottomPanel}>
          <Text style={styles.statusTitle}>MISSION: CAPTURE</Text>
          <Text style={styles.statusDesc}>Find and capture all thieves.</Text>

          <PixelButton text="게임 종료" variant="danger" size="large" onPress={confirmEndGame} />
        </View>

        {/* HIDING PHASE: 화면 딤 + 픽셀 카운트다운만 표시 */}
        {showHidingCountdown && (
          <View style={styles.countdownOverlay}>
            <Animated.View style={[styles.countdownBox, {transform: [{scale: pulse}]}]}>
              <Text style={styles.countdownText}>{countdownValue}</Text>
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 🏁 RESULT SCREEN (Retro Style)
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D2B55" />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>GAME OVER</Text>
        
        <View style={styles.resultCard}>
          <Text style={styles.winnerTitle}>🏆 WINNER 🏆</Text>
          <Text style={styles.winnerTeam}>POLICE TEAM</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={returnToLobby}>
          <Text style={styles.buttonText}>RETURN TO LOBBY</Text>
        </TouchableOpacity>
      </View>
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
  // -- Typography --
  fontMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  
  // -- Game Screen --
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
  listItemDisabled: {
    opacity: 0.5,
  },
  listItemText: {
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: 'bold',
  },
  listItemBadge: {
    color: '#00E5FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: 'bold',
  },
  listHint: {
    color: '#00E5FF',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginTop: 4,
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
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
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
    textShadowOffset: {width: 6, height: 6},
    textShadowRadius: 0,
    letterSpacing: 2,
  },
  bottomPanel: {
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
  
  // -- Result Screen --
  resultContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FF0055',
    marginBottom: 30,
    textShadowColor: '#00E5FF',
    textShadowOffset: {width: 4, height: 4},
    textShadowRadius: 0,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
    padding: 30,
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {width: 8, height: 8},
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  winnerTeam: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2196F3',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // -- Buttons --
  primaryButton: {
    backgroundColor: '#00E5FF',
    padding: 16,
    width: '100%',
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 4, height: 4},
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  dangerButton: {
    backgroundColor: '#FF0055',
    padding: 16,
    width: '100%',
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 4, height: 4},
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});

export default App;
