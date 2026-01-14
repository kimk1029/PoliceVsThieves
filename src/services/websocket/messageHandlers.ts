import { useGameStore } from '../../store/useGameStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { Vibration } from 'react-native';

export const handleServerMessage = (message: any) => {
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
  }
};

const handleJailResult = (message: any) => {
  const { success, data } = message;

  if (success) {
    console.log('Thief jailed:', data.thiefNickname);
  }
};

const handleGameEnd = (data: any) => {
  const gameStore = useGameStore.getState();
  gameStore.setRoomInfo({ result: data, status: 'END' });
};

const handlePTTStatus = (data: any) => {
  console.log('PTT status:', data);
  // UI 업데이트: "누가 말하는 중" 표시
};
