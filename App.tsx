import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from './src/store/useGameStore';
import { usePlayerStore } from './src/store/usePlayerStore';
import { useGameLogic } from './src/hooks/useGameLogic';
import KeepAwake from 'react-native-keep-awake';

// Screens
import { SplashScreen } from './src/screens/SplashScreen';
import { ImprovedLobbyScreen } from './src/screens/ImprovedLobbyScreen';
import { GameScreen } from './src/screens/GameScreen';
import { ResultScreen } from './src/screens/ResultScreen';

const App = (): React.JSX.Element => {
  const [screen, setScreen] = useState('splash'); // Start with splash
  const [screenParams, setScreenParams] = useState<any>({});
  const [suppressLobbyAutoNavigate, setSuppressLobbyAutoNavigate] = useState(false);

  // ✅ WebSocket/게임 로직은 앱 전체에서 1번만 생성해서 유지
  const gameLogic = useGameLogic();

  // 크래시 로깅 (JS 에러)
  useEffect(() => {
    const ErrorUtilsAny = (global as any).ErrorUtils;
    const previousHandler = ErrorUtilsAny?.getGlobalHandler?.();

    if (ErrorUtilsAny?.setGlobalHandler) {
      ErrorUtilsAny.setGlobalHandler((error: any, isFatal?: boolean) => {
        const payload = {
          tag: '[CRASH][JS]',
          isFatal: !!isFatal,
          message: String(error?.message || error),
          stack: String(error?.stack || ''),
          timestamp: Date.now(),
        };
        console.error(payload.tag, payload);
        AsyncStorage.setItem('@pnt_last_crash', JSON.stringify(payload)).catch(() => null);

        if (previousHandler) {
          previousHandler(error, isFatal);
        }
      });
    }

    return () => {
      if (ErrorUtilsAny?.setGlobalHandler && previousHandler) {
        ErrorUtilsAny.setGlobalHandler(previousHandler);
      }
    };
  }, []);

  // 앱 실행 중 화면 꺼짐 방지
  useEffect(() => {
    KeepAwake.activate();
    return () => {
      KeepAwake.deactivate();
    };
  }, []);

  // 게임 진입 시 위치 트래킹 시작(1회)
  const startedLocationRef = useRef(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // 위치 권한은 "앱 시작 시" 한 번만 요청 (게임 화면 진입과 겹치면 화면/지도 렌더가 꼬일 수 있음)
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'android') {
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
          return;
        }

        // iOS 등
        setHasLocationPermission(true);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  // 권한 확인/재요청 헬퍼
  const checkPermissionAndOpenSettings = useCallback(async () => {
    if (Platform.OS === 'android') {
      const check = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (!check) {
        Alert.alert(
          '권한 필요',
          '위치 권한이 거부되어 있습니다. 설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
          ],
        );
        return false;
      }
      setHasLocationPermission(true);
      return true;
    }
    return true;
  }, []);

  const returnToLobby = useCallback(async () => {
    setSuppressLobbyAutoNavigate(true);
    // 로비로 먼저 이동해 게임 화면 언마운트
    setScreen('lobby');
    setScreenParams({});
    // 방에서 나가고(서버에 leave), 위치 트래킹도 중단되도록 처리
    await gameLogic.leaveRoom();

    // 핵심: status/roomId가 남아있으면 ImprovedLobbyScreen에서 status !== 'LOBBY' 감지로
    // 다시 game 화면으로 튕길 수 있어서, 로비 복귀 시에는 store를 리셋해야 합니다.
    useGameStore.getState().reset();
    startedLocationRef.current = false;
    setSuppressLobbyAutoNavigate(false);
  }, [gameLogic]);

  const confirmEndGame = useCallback(() => {
    Alert.alert('게임 종료', '정말 게임을 종료하고 방을 나가시겠습니까?', [
      { text: '남아있기', style: 'cancel' },
      { text: '게임끝내기', style: 'destructive', onPress: returnToLobby },
    ]);
  }, [returnToLobby]);

  const navigate = (newScreen: string, params?: any) => {
    setScreen(newScreen);
    setScreenParams(params || {});
  };

  const { team, location, playerId, nickname } = usePlayerStore();
  const { status, phaseEndsAt, players, settings, result } = useGameStore();

  // 게임 종료 시 세션 정리
  useEffect(() => {
    if (status === 'END' && screen === 'game') {
      // 위치 추적 중단
      startedLocationRef.current = false;
      // WebRTC 정리는 useGameLogic의 leaveRoom에서 처리됨
      console.log('[App] Game ended, cleaning up session');
    }
  }, [status, screen]);

  const onGameScreenMount = useCallback(async () => {
    if (screen !== 'game') {
      return;
    }

    // 화면이 'game'으로 전환되었을 때 위치 권한 재확인 & 트래킹 시작
    const hasPerm = await checkPermissionAndOpenSettings();
    if (!hasPerm) return;

    if (startedLocationRef.current) return;
    startedLocationRef.current = true;

    // 위치 추적 시작
    gameLogic.startLocationTracking();
  }, [screen, checkPermissionAndOpenSettings, gameLogic]);

  useEffect(() => {
    onGameScreenMount();
  }, [onGameScreenMount]);

  // phaseEndsAt 기반 타이머(초)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (screen !== 'game') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [screen]);

  const hidingEndsAtRef = useRef<number | null>(null);
  const gameStartAtRef = useRef<number | null>(null);
  const gameEndsAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'HIDING' && phaseEndsAt) {
      const hidingMs = (settings?.hidingSeconds ?? 0) * 1000;
      const chaseMs = (settings?.chaseSeconds ?? 0) * 1000;
      hidingEndsAtRef.current = phaseEndsAt;
      gameStartAtRef.current = phaseEndsAt - hidingMs;
      gameEndsAtRef.current = phaseEndsAt + chaseMs;
    }

    if (status === 'CHASE' && phaseEndsAt) {
      const hidingMs = (settings?.hidingSeconds ?? 0) * 1000;
      const chaseMs = (settings?.chaseSeconds ?? 0) * 1000;
      if (!gameEndsAtRef.current) {
        gameEndsAtRef.current = phaseEndsAt;
      }
      if (!gameStartAtRef.current) {
        gameStartAtRef.current = phaseEndsAt - (hidingMs + chaseMs);
      }
    }

    if (status === 'LOBBY' || status === 'END') {
      hidingEndsAtRef.current = null;
      // gameStartAtRef.current = null; // 결과 화면 계산을 위해 유지
      // gameEndsAtRef.current = null; // 결과 화면 계산을 위해 유지
    }
  }, [status, phaseEndsAt, settings?.hidingSeconds, settings?.chaseSeconds]);

  const hidingRemainingSec = hidingEndsAtRef.current
    ? Math.max(
      0,
      Math.ceil(
        (hidingEndsAtRef.current +
          (team === 'POLICE' ? 10 * 1000 : 0) -
          now) /
        1000,
      ),
    )
    : 0;

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
    return (
      <ImprovedLobbyScreen
        onNavigate={navigate}
        gameLogic={gameLogic}
        suppressAutoNavigate={suppressLobbyAutoNavigate}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 🎮 GAME SCREEN
  // ─────────────────────────────────────────────────────────────
  if (screen === 'game') {
    if (status === 'END') {
      return (
        <ResultScreen
          result={result}
          players={players}
          settings={settings}
          gameStartAt={gameStartAtRef.current}
          gameEndsAt={gameEndsAtRef.current}
          onReturnToLobby={returnToLobby}
        />
      );
    }

    return (
      <GameScreen
        gameLogic={gameLogic}
        hasLocationPermission={hasLocationPermission}
        hidingRemainingSec={hidingRemainingSec}
        gameEndsAt={gameEndsAtRef.current}
        onConfirmEndGame={confirmEndGame}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 🏁 RESULT SCREEN (Fallback)
  // ─────────────────────────────────────────────────────────────
  return (
    <ResultScreen
      result={result}
      players={players}
      settings={settings}
      gameStartAt={gameStartAtRef.current}
      gameEndsAt={gameEndsAtRef.current}
      onReturnToLobby={returnToLobby}
    />
  );
};

export default App;
