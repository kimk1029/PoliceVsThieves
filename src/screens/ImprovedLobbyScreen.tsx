import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { usePlayerStore } from '../store/usePlayerStore';
import { useGameStore } from '../store/useGameStore';
import { LobbyView } from './improvedLobby/LobbyView';
import { MainEntryView } from './improvedLobby/MainEntryView';

interface ImprovedLobbyScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  gameLogic: {
    isConnected: boolean;
    createRoom: (nickname: string, settings?: any) => Promise<void> | void;
    joinRoom: (
      roomCode: string,
      nickname: string,
      source?: 'manual' | 'scan' | 'auto'
    ) => Promise<void> | void;
    checkConnection: () => Promise<boolean>;
    sendChatMessage: (text: string) => void;
    startGame: () => void;
    shuffleTeams: () => void;
    leaveRoom: () => Promise<void> | void;
    updateRoomSettings: (settings: any) => void;
  };
  suppressAutoNavigate?: boolean;
}

export const ImprovedLobbyScreen: React.FC<ImprovedLobbyScreenProps> = ({
  onNavigate,
  gameLogic,
  suppressAutoNavigate = false,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showQRScan, setShowQRScan] = useState(false);
  const [qrScannerSession, setQrScannerSession] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const lastScannedRef = useRef<{ code: string; at: number } | null>(null);
  const scanProcessingRef = useRef(false);

  const { playerId, setNickname, loadNickname } = usePlayerStore();
  const { roomId, players, status, chatMessages, settings } = useGameStore();
  const {
    isConnected,
    createRoom,
    joinRoom,
    checkConnection,
    sendChatMessage,
    startGame,
    shuffleTeams,
    leaveRoom,
    updateRoomSettings,
  } = gameLogic;

  const [showReconnectingModal, setShowReconnectingModal] = useState(false);

  // 초기화: playerId 로드, 닉네임 불러오기, 서버 상태 체크
  useEffect(() => {
    const initPlayer = async () => {
      await usePlayerStore.getState().loadPlayerId();
      // 저장된 닉네임 불러오기
      const savedNickname = await loadNickname();
      if (savedNickname) {
        setPlayerName(savedNickname);
      }
      // 메인 화면 렌더 시 서버 상태 체크
      if (!useGameStore.getState().roomId) {
        await checkConnection();
      }
    };
    initPlayer();
  }, []);

  useEffect(() => {
    if (isConnected && showReconnectingModal) {
      setShowReconnectingModal(false);
    }
  }, [isConnected, showReconnectingModal]);

  useEffect(() => {
    if (!suppressAutoNavigate && status && status !== 'LOBBY' && roomId) {
      onNavigate('game');
    }
  }, [status, roomId, onNavigate, suppressAutoNavigate]);

  // 스캐너를 다시 열 때마다 "중복 방지/처리 중" 상태를 완전히 리셋 (재스캔 안정화)
  useEffect(() => {
    if (showQRScan) {
      lastScannedRef.current = null;
      scanProcessingRef.current = false;
    }
  }, [showQRScan, qrScannerSession]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      Alert.alert('⚠️ ERROR', 'INSERT PLAYER NAME');
      return;
    }
    const actuallyConnected = await checkConnection();
    if (!actuallyConnected) {
      Alert.alert('👾 SYSTEM', 'CONNECTION FAILED');
      return;
    }
    await setNickname(playerName);
    await createRoom(playerName, {
      maxPlayers: 20,
      hidingSeconds: 60,
      chaseSeconds: 600,
      proximityRadiusMeters: 30,
      captureRadiusMeters: 50,
      jailRadiusMeters: 15,
    });
  };

  const handleJoinRoom = async () => {
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    const trimmedPlayerName = playerName.trim();

    if (!trimmedPlayerName) {
      Alert.alert('⚠️ ERROR', 'ENTER PLAYER NAME');
      return;
    }
    if (!normalizedRoomCode) {
      Alert.alert('⚠️ ERROR', 'ENTER ROOM CODE');
      return;
    }
    if (normalizedRoomCode.length !== 6) {
      Alert.alert('⚠️ ERROR', `ROOM CODE MUST BE 6 CHARACTERS`);
      return;
    }

    setRoomCode(normalizedRoomCode);
    await setNickname(trimmedPlayerName);

    const actuallyConnected = await checkConnection();
    if (!actuallyConnected) {
      Alert.alert('👾 SYSTEM', 'CONNECTION FAILED');
      return;
    }
    await joinRoom(normalizedRoomCode, trimmedPlayerName, 'manual');
  };

  const joinWithCode = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!playerName.trim()) {
      Alert.alert('⚠️ ERROR', 'PLEASE ENTER NICKNAME FIRST\n\n닉네임을 먼저 입력해주세요');
      return;
    }
    if (!normalized) {
      Alert.alert('⚠️ ERROR', 'INVALID ROOM CODE');
      return;
    }
    const actuallyConnected = await checkConnection();
    if (!actuallyConnected) {
      Alert.alert('👾 SYSTEM', 'CONNECTION FAILED');
      return;
    }
    await setNickname(playerName);
    setRoomCode(normalized);
    await joinRoom(normalized, playerName, 'scan');
  };

  const extractRoomId = (text: string): string | null => {
    const m = text.toUpperCase().match(/([A-Z0-9]{6})/);
    return m?.[1] || null;
  };

  // QR 인식 로직을 한 곳에 모아서(러프하게) 인식률/재스캔 안정성 개선
  const handleScannedRaw = (raw: string) => {
    if (scanProcessingRef.current) return;

    const rid = extractRoomId(String(raw || ''));
    if (!rid) return; // 실패 알럿을 띄우면 연속 이벤트에서 스팸이 될 수 있어 조용히 무시

    // 스캔값이 항상 우선 (기존 입력값이 있어도 덮어씀)
    setRoomCode(rid);

    // 중복 방지 (재스캔을 위해 짧게)
    const now = Date.now();
    const last = lastScannedRef.current;
    if (last && last.code === rid && now - last.at < 600) return;
    lastScannedRef.current = { code: rid, at: now };

    // 닉네임이 없으면 스캐너는 열어둔 채로 입력 요청만 (이전 요구사항 유지)
    if (!playerName.trim()) return;

    // 바로 입장
    scanProcessingRef.current = true;
    setShowQRScan(false);
    // 다음 스캔을 위해 카메라 세션을 확실히 갱신
    setTimeout(() => setQrScannerSession(s => s + 1), 0);
    joinWithCode(rid);
  };

  // 닉네임 변경 시 저장 (debounce 적용)
  const nicknameSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePlayerNameChange = (text: string) => {
    setPlayerName(text);
    // 이전 타이머 취소
    if (nicknameSaveTimeoutRef.current) {
      clearTimeout(nicknameSaveTimeoutRef.current);
    }
    // 1초 후 저장 (사용자가 입력을 멈춘 후)
    nicknameSaveTimeoutRef.current = setTimeout(async () => {
      if (text.trim()) {
        await setNickname(text.trim());
      }
    }, 1000);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (nicknameSaveTimeoutRef.current) {
        clearTimeout(nicknameSaveTimeoutRef.current);
      }
    };
  }, []);
  if (roomId && (status === 'LOBBY' || !status)) {
    return (
      <LobbyView
        roomId={roomId}
        players={players as any}
        playerId={playerId}
        settings={settings as any}
        chatMessages={chatMessages as any}
        chatInput={chatInput}
        onChangeChatInput={setChatInput}
        onSendChat={(text) => sendChatMessage(text)}
        onExit={() => {
          leaveRoom();
          onNavigate('lobby');
        }}
        onShuffleTeams={shuffleTeams}
        onStartGame={startGame}
        onUpdateSettings={updateRoomSettings}
      />
    );
  }

  return (
    <MainEntryView
      isConnected={isConnected}
      onPressStatus={async () => {
        if (!isConnected) setShowReconnectingModal(true);
        await checkConnection();
      }}
      playerName={playerName}
      onChangePlayerName={handlePlayerNameChange}
      roomCode={roomCode}
      onChangeRoomCode={setRoomCode}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      onOpenScanner={async () => {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
        }
        // 재스캔을 위해 상태 리셋
        lastScannedRef.current = null;
        scanProcessingRef.current = false;
        setQrScannerSession((s) => s + 1);
        setShowQRScan(true);
      }}
      showQRScan={showQRScan}
      qrScannerSession={qrScannerSession}
      onScannedRaw={handleScannedRaw}
      onCancelScan={() => {
        scanProcessingRef.current = false;
        lastScannedRef.current = null;
        setShowQRScan(false);
        setTimeout(() => setQrScannerSession((s) => s + 1), 0);
      }}
      showReconnectingModal={showReconnectingModal}
    />
  );
};
