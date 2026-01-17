import { useGameStore } from '../../store/useGameStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { Alert, Vibration } from 'react-native';

const MIN_LOCATION_DELTA = 0.00001; // ~1m
const MIN_LOCATION_UPDATE_MS = 700;
const ACCURACY_IMPROVEMENT_METERS = 2;
const lastLocationByPlayer = new Map<
  string,
  { lat: number; lng: number; timestamp: number; accuracy?: number }
>();

const isValidLocation = (location: any) => {
  if (!location) return false;
  const { lat, lng } = location;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng)
  );
};

const shouldApplyLocationUpdate = (playerId: string, location: any) => {
  const now = Date.now();
  const prev = lastLocationByPlayer.get(playerId);
  if (!prev) {
    lastLocationByPlayer.set(playerId, {
      lat: location.lat,
      lng: location.lng,
      timestamp: now,
      accuracy: location.accuracy,
    });
    return true;
  }

  const latDiff = Math.abs(location.lat - prev.lat);
  const lngDiff = Math.abs(location.lng - prev.lng);
  const timeDiff = now - prev.timestamp;
  const accuracyImproved =
    typeof location.accuracy === 'number' &&
    typeof prev.accuracy === 'number' &&
    location.accuracy + ACCURACY_IMPROVEMENT_METERS < prev.accuracy;

  const isSmallMove = latDiff < MIN_LOCATION_DELTA && lngDiff < MIN_LOCATION_DELTA;
  const isTooSoon = timeDiff < MIN_LOCATION_UPDATE_MS;

  if (isSmallMove && isTooSoon && !accuracyImproved) {
    return false;
  }

  lastLocationByPlayer.set(playerId, {
    lat: location.lat,
    lng: location.lng,
    timestamp: now,
    accuracy: location.accuracy,
  });
  return true;
};

export const handleServerMessage = (message: any) => {
  try {
    const { type, data } = message;

    switch (type) {
      case 'game:state':
        handleGameState(data);
        break;

      case 'chat:new':
        handleChatNew(data);
        break;

      case 'team:assigned':
        handleTeamAssigned(data);
        break;

      case 'proximity:near':
        handleProximityNear(data);
        break;

      case 'capture:result':
        handleCaptureResult(message);
        break;

      case 'jail:result':
        handleJailResult(message);
        break;

      case 'location:update':
        handleLocationUpdate(data);
        break;

      case 'game:end':
        handleGameEnd(data);
        break;

      case 'webrtc:signal':
        // WebRTC 시그널 처리는 WebRTCManager에서 직접 처리
        break;

      case 'ptt:status':
        handlePTTStatus(data);
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('[WebSocket] handleServerMessage error', error);
  }
};

const handleGameState = (data: any) => {
  const gameStore = useGameStore.getState();

  gameStore.setRoomInfo({
    status: data.status,
    phaseEndsAt: data.phaseEndsAt,
    basecamp: data.basecamp,
    settings: data.settings
  });

  const newPlayers = new Map();
  data.players.forEach((player: any) => {
    newPlayers.set(player.playerId, player);
  });

  gameStore.setRoomInfo({ players: newPlayers });
};

const handleChatNew = (data: any) => {
  const gameStore = useGameStore.getState();
  gameStore.addChatMessage(data);
};

const handleTeamAssigned = (data: any) => {
  const playerStore = usePlayerStore.getState();
  playerStore.setTeam(data.yourTeam);
};

const handleProximityNear = (data: any) => {
  const uiStore = useUIStore.getState();
  uiStore.showProximityAlert(data.message);

  Vibration.vibrate([0, 200, 100, 200]);

  setTimeout(() => {
    uiStore.hideProximityAlert();
  }, 3000);
};

const handleCaptureResult = (message: any) => {
  const { success, data } = message;

  if (success) {
    console.log('Thief captured:', data.thiefNickname);
    if (data?.thiefId) {
      const gameStore = useGameStore.getState();
      gameStore.updatePlayer(data.thiefId, {
        thiefStatus: {
          state: 'CAPTURED',
          capturedBy: data.policeId ?? null,
          capturedAt: data.capturedAt ?? Date.now(),
          jailedAt: null,
        },
      });
      const playerStore = usePlayerStore.getState();
      if (playerStore.playerId === data.thiefId) {
        playerStore.setThiefStatus({
          state: 'CAPTURED',
          capturedBy: data.policeId ?? null,
          capturedAt: data.capturedAt ?? Date.now(),
          jailedAt: null,
        });
      }
    }
  } else if (message?.error) {
    console.warn('Capture failed:', message.error);
    Alert.alert('검거 실패', message.error);
  }
};

const handleJailResult = (message: any) => {
  const { success, data } = message;

  if (success) {
    console.log('Thief jailed:', data.thiefNickname);
    if (data?.thiefId) {
      const gameStore = useGameStore.getState();
      gameStore.updatePlayer(data.thiefId, {
        thiefStatus: {
          state: 'JAILED',
          capturedBy: null,
          capturedAt: null,
          jailedAt: data.jailedAt ?? Date.now(),
        },
      });
      const playerStore = usePlayerStore.getState();
      if (playerStore.playerId === data.thiefId) {
        playerStore.setThiefStatus({
          state: 'JAILED',
          capturedBy: null,
          capturedAt: null,
          jailedAt: data.jailedAt ?? Date.now(),
        });
      }
    }
  } else if (message?.error) {
    console.warn('Jail failed:', message.error);
  }
};

const handleLocationUpdate = (data: any) => {
  if (!data?.playerId || !data?.location) return;
  if (!isValidLocation(data.location)) return;
  if (!shouldApplyLocationUpdate(data.playerId, data.location)) return;

  const gameStore = useGameStore.getState();
  gameStore.updatePlayer(data.playerId, {
    location: data.location,
  });
};

const handleGameEnd = (data: any) => {
  const gameStore = useGameStore.getState();
  gameStore.setRoomInfo({ result: data, status: 'END' });
  // 게임 종료 시 세션 정리 (WebRTC, 위치 추적 등은 useGameLogic에서 처리)
  console.log('[MessageHandlers] Game ended, result:', data);
};

const handlePTTStatus = (data: any) => {
  console.log('PTT status:', data);
  // UI 업데이트: "누가 말하는 중" 표시
};
