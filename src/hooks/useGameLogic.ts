import {useState, useEffect, useCallback} from 'react';
import {WebSocketClient} from '../services/websocket/WebSocketClient';
import {LocationService} from '../services/location/LocationService';
import {useGameStore} from '../store/useGameStore';
import {usePlayerStore} from '../store/usePlayerStore';
import {Location} from '../types/game.types';

const WS_URL = 'ws://localhost:9001'; // 에뮬레이터 & 실기기 모두 ADB Reverse(9001)를 통해 이 주소 사용

export const useGameLogic = () => {
  const [wsClient] = useState(() => new WebSocketClient());
  const [locationService] = useState(() => new LocationService());
  const [isConnected, setIsConnected] = useState(false);
  const [myLocation, setMyLocation] = useState<Location | null>(null);

  const {playerId, nickname, team, updateLocation} = usePlayerStore();
  const {roomId, players, setRoomInfo, setPlayers, updatePlayer, addChatMessage} = useGameStore();

  // 앱 실행 시 자동 연결
  useEffect(() => {
    if (!playerId) {
      console.log('[GameLogic] Waiting for playerId...');
      return;
    }

    console.log('[GameLogic] Auto-connecting to server...');
    connectToServer();
  }, [playerId, connectToServer]);

  // WebSocket 연결
  const connectToServer = useCallback(async () => {
    if (!playerId) {
      console.log('[GameLogic] Cannot connect: No playerId');
      setIsConnected(false);
      return false;
    }

    console.log('[GameLogic] Attempting to connect to:', WS_URL);
    console.log('[GameLogic] Player ID:', playerId);
    console.log('[GameLogic] WebSocket URL:', WS_URL);
    console.log('[GameLogic] Current time:', new Date().toISOString());

    try {
      // 기존 연결이 있으면 끊기
      if (wsClient.isConnected()) {
        console.log('[GameLogic] Disconnecting existing connection...');
        wsClient.disconnect();
        setIsConnected(false);
        // 연결 정리 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 핸들러를 먼저 등록 (연결 전에)
      // 연결 성공 핸들러
      wsClient.onOpen(() => {
        console.log('[GameLogic] ✅ WebSocket connection opened!');
      });

      // 연결 끊김 핸들러
      wsClient.onClose(() => {
        console.log('[GameLogic] ❌ Connection closed');
        setIsConnected(false);
      });

      // 에러 핸들러
      wsClient.onError((error) => {
        console.error('[GameLogic] ❌ Connection error:', error);
        setIsConnected(false);
      });

      // 메시지 핸들러 등록
      wsClient.onMessage((message: any) => {
        console.log('[GameLogic] Received message:', message.type, message);

        switch (message.type) {
          case 'room:created':
          case 'ROOM_CREATED':
            console.log('[GameLogic] Room created, roomId:', message.data?.roomId);
            if (message.data?.roomId) {
              setRoomInfo({
                roomId: message.data.roomId,
                status: 'LOBBY',
                settings: null,
              });
            }
            break;

          case 'room:join':
          case 'ROOM_JOINED':
            if (message.success === false) {
              console.warn('[GameLogic] Room join failed:', message.error);
              alert(message.error || 'Room join failed');
              break;
            }
            console.log('[GameLogic] Room joined, roomId:', message.data?.roomId);
            if (message.data?.roomId) {
              setRoomInfo({
                roomId: message.data.roomId,
                status: 'LOBBY',
                settings: null,
              });
            }
            break;

          case 'game:state':
            console.log('[GameLogic] 📥 Game state received!');
            console.log('[GameLogic] Message data:', JSON.stringify(message.data, null, 2));
            console.log('[GameLogic] Players in message:', message.data?.players);
            
            if (message.data) {
              // 플레이어 목록은 서버가 내려준 값을 "진실"로 보고 통째로 교체
              // (퇴장한 플레이어가 클라이언트에 남아있는 문제 방지)
              if (message.data.players && Array.isArray(message.data.players)) {
                console.log('[GameLogic] Replacing players with server snapshot:', message.data.players.length);
                setPlayers(message.data.players);
              } else {
                console.log('[GameLogic] ⚠️ No players array in message.data (skipping replace)');
              }
              
              // 방 정보 업데이트
              setRoomInfo({
                status: message.data.status || 'LOBBY',
                settings: message.data.settings,
                basecamp: message.data.basecamp,
              });
              
              console.log('[GameLogic] ✅ Game state processed');
            }
            break;

          case 'chat:new':
            console.log('[GameLogic] ✉️ New chat message received:', message.data);
            if (message.data) {
              console.log('[GameLogic] Adding chat to store:', message.data);
              addChatMessage(message.data);
            }
            break;

          case 'game:start':
            if (message.success === false) {
              console.warn('[GameLogic] game:start failed:', message.error);
              alert(message.error || 'Game start failed');
            }
            break;

          case 'room:leave':
            // leave ack는 UI에서 reset 처리
            if (message.success === false) {
              console.warn('[GameLogic] room:leave failed:', message.error);
              alert(message.error || 'Leave failed');
            }
            break;

          case 'PLAYER_JOINED':
          case 'PLAYER_LEFT':
          case 'PLAYER_MOVED':
            if (message.payload?.player || message.data?.player) {
              const player = message.payload?.player || message.data?.player;
              updatePlayer(player.playerId || player.id, player);
            }
            break;

          case 'PHASE_CHANGED':
            setRoomInfo({status: message.payload?.phase || message.data?.phase});
            break;

          case 'TEAM_ASSIGNED':
            const team = message.payload?.team || message.data?.team;
            const role = message.payload?.role || message.data?.role;
            if (team) usePlayerStore.getState().setTeam(team);
            if (role) usePlayerStore.getState().setRole(role);
            break;

          case 'PLAYER_CAPTURED':
            if (message.payload?.thiefId === playerId || message.data?.thiefId === playerId) {
              alert('You have been captured!');
            }
            break;

          case 'GAME_ENDED':
            setRoomInfo({
              status: 'END',
              result: message.payload?.result || message.data?.result,
            });
            break;
        }
      });

      // 핸들러 등록 후 연결 시도
      await wsClient.connect(WS_URL, playerId);
      setIsConnected(true);
      console.log('[GameLogic] ✅ Connected successfully!');
      return true;
    } catch (error) {
      console.error('[GameLogic] ❌ Failed to connect:', error);
      console.error('[GameLogic] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url: WS_URL,
        playerId: playerId
      });
      setIsConnected(false);
      
      // 사용자에게 친화적인 에러 메시지 표시
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('timeout') || errorMessage.includes('closed before opening')) {
        console.error('[GameLogic] 💡 연결 실패 원인: 서버에 접속할 수 없습니다.');
        console.error('[GameLogic] 💡 해결 방법:');
        console.error('[GameLogic]    1. 서버가 실행 중인지 확인하세요');
        console.error('[GameLogic]    2. Windows PowerShell에서 다음 명령을 관리자 권한으로 실행:');
        console.error('[GameLogic]       powershell -ExecutionPolicy Bypass -File update-wsl-portproxy.ps1 -Port 9001');
        console.error('[GameLogic]    3. ADB reverse가 설정되었는지 확인: adb reverse --list');
      }
      
      return false;
    }
  }, [playerId, wsClient, setRoomInfo, setPlayers, updatePlayer]);

  // 연결 상태 확인 (실제 서버 연결 테스트)
  const checkConnection = useCallback(async () => {
    console.log('[GameLogic] Testing actual server connection...');
    
    if (!playerId) {
      console.log('[GameLogic] No playerId, cannot test connection');
      setIsConnected(false);
      return false;
    }
    
    // 기존 연결이 있으면 먼저 끊기
    wsClient.disconnect();
    setIsConnected(false);
    
    // 잠시 대기 (연결 정리 시간)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 새로 연결 시도 (실제 서버 연결 테스트)
    try {
      console.log('[GameLogic] Attempting to connect to server:', WS_URL);
      await wsClient.connect(WS_URL, playerId);
      console.log('[GameLogic] ✅ Server connection successful!');
      setIsConnected(true);
      
      // 연결 핸들러 재등록
      wsClient.onClose(() => {
        console.log('[GameLogic] Connection closed');
        setIsConnected(false);
      });
      
      wsClient.onError((error) => {
        console.error('[GameLogic] Connection error:', error);
        setIsConnected(false);
      });
      
      return true;
    } catch (error) {
      console.error('[GameLogic] ❌ Server connection failed:', error);
      setIsConnected(false);
      return false;
    }
  }, [wsClient, playerId]);

  // 방 생성
  const createRoom = useCallback(
    async (playerNickname: string, settings?: any) => {
      console.log('[GameLogic] createRoom called');
      console.log('[GameLogic] isConnected(state):', isConnected);
      console.log('[GameLogic] isConnected(socket):', wsClient.isConnected());
      console.log('[GameLogic] playerId:', playerId);
      console.log('[GameLogic] nickname:', playerNickname);

      // IMPORTANT:
      // isConnected는 React state라서 checkConnection 직후 같은 tick에선 stale일 수 있음.
      // 실제 소켓 상태를 기준으로 방 생성/참가를 막아야 QR 스캔 직후 join이 안정적으로 동작함.
      if (!wsClient.isConnected() || !playerId || !playerNickname) {
        console.log('[GameLogic] Cannot create room: missing requirements');
        return;
      }

      const message = {
        type: 'CREATE_ROOM',
        playerId: playerId,
        roomId: '',
        payload: {
          nickname: playerNickname,
          settings: settings || {
            maxPlayers: 10,
            hidingDurationSec: 180,
            chaseDurationSec: 600,
            captureRadiusMeters: 10,
            policeRatio: 0.3,
          },
        },
      };

      console.log('[GameLogic] Sending CREATE_ROOM:', message);
      wsClient.send(message);
    },
    [isConnected, playerId, wsClient]
  );

  // 방 참가
  const joinRoom = useCallback(
    async (roomCode: string, playerNickname: string) => {
      console.log('[GameLogic] joinRoom called');
      console.log('[GameLogic] roomCode:', roomCode);
      console.log('[GameLogic] isConnected(state):', isConnected);
      console.log('[GameLogic] isConnected(socket):', wsClient.isConnected());
      
      // IMPORTANT: checkConnection 직후에도 join이 되도록 소켓 연결 상태를 사용
      if (!wsClient.isConnected() || !playerId || !playerNickname) {
        console.log('[GameLogic] Cannot join room: missing requirements');
        return;
      }

      const message = {
        type: 'room:join',
        playerId: playerId,
        roomId: roomCode,
        payload: {
          nickname: playerNickname,
        },
      };

      console.log('[GameLogic] Sending room:join:', message);
      wsClient.send(message);
    },
    [isConnected, playerId, wsClient]
  );

  // 게임 시작
  const startGame = useCallback(() => {
    if (!isConnected || !roomId || !playerId) return;
    wsClient.send({
      type: 'game:start',
      playerId,
      roomId,
      payload: {},
    });
  }, [isConnected, roomId, playerId, wsClient]);

  // 팀 섞기 (방장 전용)
  const shuffleTeams = useCallback(() => {
    if (!isConnected || !roomId || !playerId) return;
    wsClient.send({
      type: 'team:shuffle',
      playerId,
      roomId,
      payload: {},
    });
  }, [isConnected, roomId, playerId, wsClient]);

  // 방 나가기
  const leaveRoom = useCallback(async () => {
    // 중요: "로비로 나가기"는 연결을 끊는 게 아니라, 방만 나가고 연결은 유지해야
    // 바로 다시 방 생성/참가가 가능합니다.
    if (isConnected && roomId && playerId) {
      wsClient.send({
        type: 'room:leave',
        playerId,
        roomId,
        payload: {},
      });
      // 메시지가 전송될 시간을 아주 짧게 확보 (즉시 reset/화면전환 시 유실 방지)
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    useGameStore.getState().reset();
  }, [isConnected, roomId, playerId, wsClient]);

  // 위치 업데이트
  const startLocationTracking = useCallback(async () => {
    const hasPermission = await locationService.requestPermission();
    if (!hasPermission) {
      alert('Location permission is required!');
      return;
    }

    // 초기 위치 가져오기
    try {
      const location = await locationService.getCurrentLocation();
      setMyLocation(location);
      updateLocation(location);

      // 서버에 위치 전송
      if (isConnected && roomId && playerId) {
        wsClient.send({
          type: 'UPDATE_LOCATION',
          playerId: playerId,
          roomId: roomId,
          payload: {
            location,
          },
        });
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }

    // 위치 추적 시작 (3초마다)
    locationService.startWatching(3000, location => {
      setMyLocation(location);
      updateLocation(location);

      if (isConnected && roomId && playerId) {
        wsClient.send({
          type: 'UPDATE_LOCATION',
          playerId: playerId,
          roomId: roomId,
          payload: {
            location,
          },
        });
      }
    });
  }, [locationService, isConnected, roomId, playerId, wsClient, updateLocation]);

  // 체포 시도
  const attemptCapture = useCallback(
    (thiefId: string) => {
      if (!isConnected || !roomId || team !== 'POLICE' || !playerId) return;

      wsClient.send({
        type: 'ATTEMPT_CAPTURE',
        playerId: playerId,
        roomId: roomId,
        payload: {
          thiefId,
        },
      });
    },
    [isConnected, roomId, playerId, team, wsClient]
  );

  // 채팅 메시지 전송
  const sendChatMessage = useCallback(
    (text: string) => {
      console.log('[GameLogic] sendChatMessage called:', text);
      if (!isConnected || !roomId || !playerId || !text.trim()) {
        console.log('[GameLogic] Cannot send chat:', { isConnected, roomId, playerId, text });
        return;
      }

      console.log('[GameLogic] 📤 Sending chat message:', text);
      console.log('[GameLogic] Chat details:', { playerId, roomId, text: text.trim() });
      
      wsClient.send({
        type: 'chat:send',
        playerId: playerId,
        roomId: roomId,
        payload: {
          text: text.trim(),
        },
      });
      
      console.log('[GameLogic] Chat message sent to server');
    },
    [isConnected, roomId, playerId, wsClient]
  );

  // 정리
  useEffect(() => {
    return () => {
      locationService.stopWatching();
      wsClient.disconnect();
    };
  }, [locationService, wsClient]);

  return {
    isConnected,
    myLocation,
    connectToServer,
    createRoom,
    joinRoom,
    shuffleTeams,
    startGame,
    leaveRoom,
    startLocationTracking,
    attemptCapture,
    checkConnection,
    sendChatMessage,
  };
};
