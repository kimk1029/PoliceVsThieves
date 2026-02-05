import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  StyleSheet,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Slider from '@react-native-community/slider';

import { PixelButton } from '../../components/pixel/PixelButton';
import { PixelInput } from '../../components/pixel/PixelInput';
import { QRCodeView } from '../../components/QRCodeView';
import { styles } from './styles';
import { ChatMessage, Player, RoomSettings } from '../../types/game.types';

interface LobbyViewProps {
  roomId: string;
  players: Map<string, Player>;
  playerId: string | null;
  settings: RoomSettings | null;
  chatMessages: ChatMessage[];
  chatInput: string;
  onChangeChatInput: (t: string) => void;
  onSendChat: (text: string) => void;
  onExit: () => void;
  onShuffleTeams: () => void;
  onStartGame: () => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomId,
  players,
  playerId,
  settings,
  chatMessages,
  chatInput,
  onChangeChatInput,
  onSendChat,
  onExit,
  onShuffleTeams,
  onStartGame,
  onUpdateSettings,
}) => {
  const [showQR, setShowQR] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [hidingSecondsDraft, setHidingSecondsDraft] = React.useState(60);
  const [totalMinutesDraft, setTotalMinutesDraft] = React.useState(5);
  const [gameModeDraft, setGameModeDraft] = React.useState<'BASIC' | 'BATTLE'>('BASIC');
  const [policeRatioDraft, setPoliceRatioDraft] = React.useState(0.5);
  const chatScrollRef = React.useRef<ScrollView>(null);
  const policeRatioUpdateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const playersList = React.useMemo(() => Array.from(players.values()), [players]);
  const isHost = React.useMemo(
    () => playersList.some((p) => p.playerId === playerId && p.role === 'HOST'),
    [playersList, playerId],
  );
  const allTeamsAssigned = React.useMemo(
    () => playersList.length >= 2 && playersList.every((p) => !!p.team),
    [playersList],
  );

  React.useEffect(() => {
    if (chatScrollRef.current && chatMessages.length > 0) {
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages]);

  const handleCopyRoomCode = () => {
    Clipboard.setString(roomId);
  };

  const openSettings = () => {
    setHidingSecondsDraft(settings?.hidingSeconds ?? 60);
    setTotalMinutesDraft(Math.max(1, Math.round((settings?.chaseSeconds ?? 300) / 60)));
    setGameModeDraft((settings?.gameMode as any) || 'BASIC');
    setPoliceRatioDraft(settings?.policeRatio ?? 0.5);
    setShowSettings(true);
  };

  // 현재 플레이어 수 기준으로 경찰/도둑 수 계산 (미리보기용)
  const calculateTeamDistribution = (ratio: number, totalPlayers: number) => {
    if (totalPlayers < 2) {
      return { police: 1, thief: 1 };
    }
    // 경찰 수 계산: 홀수일 경우 경찰이 더 많도록 올림 처리
    let policeCount = Math.ceil(totalPlayers * ratio);
    // 최소값 제한: 경찰 1명, 도둑 1명 보장
    policeCount = Math.max(1, Math.min(totalPlayers - 1, policeCount));
    const thiefCount = totalPlayers - policeCount;
    return { police: policeCount, thief: thiefCount };
  };

  // 슬라이더 값 변경 시 즉시 서버에 저장 (debounce 적용)
  const handlePoliceRatioChange = (value: number) => {
    setPoliceRatioDraft(value);

    // 이전 타이머 취소
    if (policeRatioUpdateTimeoutRef.current) {
      clearTimeout(policeRatioUpdateTimeoutRef.current);
    }

    // 300ms 후 서버에 저장 (너무 많은 요청 방지)
    policeRatioUpdateTimeoutRef.current = setTimeout(() => {
      const ratioClamped = Math.max(0.0, Math.min(1.0, value));
      onUpdateSettings({
        policeRatio: ratioClamped,
      });
    }, 300);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      if (policeRatioUpdateTimeoutRef.current) {
        clearTimeout(policeRatioUpdateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#120458" />

      <View style={styles.lobbyHeader}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.pixelLabel}>ROOM</Text>
            <Text style={styles.pixelValue}>{roomId}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={{ width: 60, marginRight: 6 }}>
              <PixelButton text="QR" size="small" variant="secondary" onPress={() => setShowQR(true)} />
            </View>
            <View style={{ width: 60 }}>
              <PixelButton text="COPY" size="small" variant="secondary" onPress={handleCopyRoomCode} />
            </View>
            {isHost && (
              <View style={{ width: 60, marginLeft: 6 }}>
                <PixelButton
                  text="⚙"
                  size="small"
                  variant="secondary"
                  onPress={openSettings}
                  textStyle={{ fontSize: 18 }}
                />
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerGameInfo}>
          <Text style={styles.gameInfoText} numberOfLines={1}>
            MODE {settings?.gameMode === 'BATTLE' ? 'BATTLE' : 'BASIC'} · HIDE {settings?.hidingSeconds ?? 60}s · TOTAL {Math.round((settings?.chaseSeconds ?? 300) / 60)}m
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.mainContent}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Players */}
        <View style={[styles.panelBox, styles.playersPanel]}>
          <View style={styles.panelTitleBox}>
            <Text style={styles.panelTitle}>PLAYERS [{playersList.length}/20]</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.gridContainer}>
            {playersList.map((player, index) => {
              const isMe = player.playerId === playerId;
              const teamStyle =
                player.team === 'POLICE'
                  ? styles.playerSlotPolice
                  : player.team === 'THIEF'
                    ? styles.playerSlotThief
                    : null;
              return (
                <View key={index} style={[styles.playerSlot, teamStyle, isMe && styles.playerSlotMe]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{player.nickname?.substring(0, 1).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.slotName} numberOfLines={1}>
                    {player.nickname}
                  </Text>
                  {!!player.team && (
                    <Text style={player.team === 'POLICE' ? styles.teamBadgePolice : styles.teamBadgeThief}>
                      {player.team === 'POLICE' ? 'P' : 'T'}
                    </Text>
                  )}
                  {player.role === 'HOST' && <Text style={styles.hostBadge}>K</Text>}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Chat */}
        <View style={[styles.panelBox, styles.chatPanel]}>
          <View style={[styles.panelTitleBox, { backgroundColor: '#000' }]}>
            <Text style={[styles.panelTitle, { color: '#00FF00', fontSize: 12 }]}>SYSTEM_LOG</Text>
          </View>
          <ScrollView
            style={styles.terminalScroll}
            ref={chatScrollRef}
            contentContainerStyle={{ padding: 6 }}
          >
            {chatMessages.map((msg, index) => {
              const isMe = msg.playerId === playerId;
              return (
                <Text key={index} style={[styles.terminalText, isMe && styles.terminalTextMe]}>
                  <Text style={[styles.terminalName, isMe && styles.terminalNameMe]}>
                    {isMe ? 'YOU' : msg.nickname}
                  </Text>
                  : {msg.text}
                </Text>
              );
            })}
          </ScrollView>
          <View style={styles.terminalInputRow}>
            <Text style={styles.prompt}>{'>'}</Text>
            <TextInput
              style={styles.terminalInput}
              value={chatInput}
              onChangeText={onChangeChatInput}
              placeholder="..."
              placeholderTextColor="#005500"
              returnKeyType="send"
              onSubmitEditing={() => {
                if (chatInput.trim()) {
                  onSendChat(chatInput);
                  onChangeChatInput('');
                }
              }}
            />
            <TouchableOpacity
              onPress={() => {
                if (chatInput.trim()) {
                  onSendChat(chatInput);
                  onChangeChatInput('');
                }
              }}
              style={styles.sendBtn}
            >
              <Text style={styles.sendBtnText}>send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footerBar}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <PixelButton text="EXIT" variant="danger" size="large" onPress={onExit} />
        </View>
        {isHost && (
          <>
            <View style={{ flex: 1, marginLeft: 8, marginRight: 8 }}>
              <PixelButton
                text="SHUFFLE"
                variant="warning"
                size="large"
                disabled={playersList.length < 2}
                onPress={onShuffleTeams}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <PixelButton
                text="START"
                variant={allTeamsAssigned ? 'success' : 'secondary'}
                size="large"
                disabled={playersList.length < 2 || !allTeamsAssigned}
                onPress={onStartGame}
              />
            </View>
          </>
        )}
      </View>

      {/* QR Modal */}
      <Modal visible={showQR} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.pixelModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QR</Text>
              <TouchableOpacity onPress={() => setShowQR(false)}>
                <Text style={styles.modalClose}>X</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.qrBody}>
              <QRCodeView value={roomId} size={280} />
              <Text style={styles.qrCodeText}>{roomId}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.pixelModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SETTINGS</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.modalClose}>X</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.qrBody}>
              <Text style={[styles.modalText, { marginBottom: 8 }]}>GAME MODE</Text>
              <View style={{ flexDirection: 'row', width: '100%', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <PixelButton
                    text="BASIC"
                    variant={gameModeDraft === 'BASIC' ? 'success' : 'secondary'}
                    size="small"
                    onPress={() => setGameModeDraft('BASIC')}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <PixelButton
                    text="BATTLE"
                    variant={gameModeDraft === 'BATTLE' ? 'success' : 'secondary'}
                    size="small"
                    onPress={() => setGameModeDraft('BATTLE')}
                  />
                </View>
              </View>

              {/* Hiding Time Slider */}
              <View style={{ width: '100%', marginBottom: 16 }}>
                <Text style={[styles.modalText, { marginBottom: 8 }]}>
                  HIDING TIME: {hidingSecondsDraft}초
                </Text>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={10}
                  maximumValue={300}
                  step={10}
                  value={hidingSecondsDraft}
                  onValueChange={setHidingSecondsDraft}
                  minimumTrackTintColor="#00FF00"
                  maximumTrackTintColor="#004400"
                  thumbTintColor="#00FF00"
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sliderStyles.sliderLabel}>10초</Text>
                  <Text style={sliderStyles.sliderLabel}>300초</Text>
                </View>
              </View>

              {/* Total Game Time Slider */}
              <View style={{ width: '100%', marginBottom: 16 }}>
                <Text style={[styles.modalText, { marginBottom: 8 }]}>
                  TOTAL GAME TIME: {totalMinutesDraft}분
                </Text>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={1}
                  maximumValue={30}
                  step={1}
                  value={totalMinutesDraft}
                  onValueChange={setTotalMinutesDraft}
                  minimumTrackTintColor="#FF00FF"
                  maximumTrackTintColor="#440044"
                  thumbTintColor="#FF00FF"
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={sliderStyles.sliderLabel}>1분</Text>
                  <Text style={sliderStyles.sliderLabel}>30분</Text>
                </View>
              </View>

              {/* Team Ratio Slider - 전체 100%, 기본 50%:50% */}
              <View style={{ width: '100%', marginBottom: 16 }}>
                {(() => {
                  const total = Math.max(2, playersList.length);
                  const { police, thief } = calculateTeamDistribution(
                    policeRatioDraft,
                    total,
                  );
                  const policePct = Math.round(policeRatioDraft * 100);
                  const thiefPct = 100 - policePct;
                  return (
                    <>
                      <Text style={[styles.modalText, { marginBottom: 4 }]}>
                        TEAM RATIO: 경찰 {policePct}% : 도둑 {thiefPct}%
                      </Text>
                      <Text style={[styles.modalText, { marginBottom: 8, fontSize: 12, opacity: 0.9 }]}>
                        (현재 인원 기준: 경찰 {police}명 : 도둑 {thief}명)
                      </Text>
                      <Slider
                        style={{ width: '100%', height: 40 }}
                        minimumValue={0.0}
                        maximumValue={1.0}
                        step={0.05}
                        value={policeRatioDraft}
                        onValueChange={handlePoliceRatioChange}
                        minimumTrackTintColor="#FFFF00"
                        maximumTrackTintColor="#444400"
                        thumbTintColor="#FFFF00"
                      />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={sliderStyles.sliderLabel}>도둑 많음 (0%)</Text>
                        <Text style={sliderStyles.sliderLabel}>경찰 많음 (100%)</Text>
                      </View>
                    </>
                  );
                })()}
              </View>

              <View style={{ width: '100%' }}>
                <PixelButton
                  text="APPLY"
                  variant="success"
                  size="medium"
                  onPress={() => {
                    const hidingClamped = Math.max(10, Math.min(300, Math.round(hidingSecondsDraft)));
                    const minutesClamped = Math.max(1, Math.min(30, Math.round(totalMinutesDraft)));
                    const chaseSeconds = minutesClamped * 60;
                    const ratioClamped = Math.max(0.0, Math.min(1.0, policeRatioDraft));

                    // 마지막 변경사항이 아직 저장되지 않았을 수 있으므로 즉시 저장
                    if (policeRatioUpdateTimeoutRef.current) {
                      clearTimeout(policeRatioUpdateTimeoutRef.current);
                      policeRatioUpdateTimeoutRef.current = null;
                    }

                    onUpdateSettings({
                      gameMode: gameModeDraft,
                      hidingSeconds: hidingClamped,
                      chaseSeconds,
                      policeRatio: ratioClamped,
                    });
                    setShowSettings(false);
                  }}
                />
              </View>
              <View style={{ height: 6 }} />
              <Text style={styles.modalText}>
                CURRENT: MODE {(settings?.gameMode || 'BASIC') === 'BASIC' ? 'BASIC' : 'BATTLE'} / HIDE {settings?.hidingSeconds ?? 60}s / TOTAL {Math.round((settings?.chaseSeconds ?? 300) / 60)}m
              </Text>
              {(() => {
                const currentRatio = settings?.policeRatio ?? 0.5;
                const total = Math.max(2, playersList.length);
                const { police, thief } = calculateTeamDistribution(currentRatio, total);
                const policePct = Math.round(currentRatio * 100);
                const thiefPct = 100 - policePct;
                return (
                  <Text style={styles.modalText}>
                    RATIO: 경찰 {policePct}% : 도둑 {thiefPct}% (경찰 {police}명 : 도둑 {thief}명)
                  </Text>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const sliderStyles = StyleSheet.create({
  sliderLabel: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#00FF00',
  },
});
