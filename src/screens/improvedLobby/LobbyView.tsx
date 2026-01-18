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

import {PixelButton} from '../../components/pixel/PixelButton';
import {PixelInput} from '../../components/pixel/PixelInput';
import {QRCodeView} from '../../components/QRCodeView';
import {styles} from './styles';
import {ChatMessage, Player, RoomSettings} from '../../types/game.types';

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
  const [gameModeDraft, setGameModeDraft] = React.useState<'BASIC' | 'ITEM_FIND'>('BASIC');
  const chatScrollRef = React.useRef<ScrollView>(null);

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
      setTimeout(() => chatScrollRef.current?.scrollToEnd({animated: true}), 100);
    }
  }, [chatMessages]);

  const handleCopyRoomCode = () => {
    Clipboard.setString(roomId);
  };

  const openSettings = () => {
    setHidingSecondsDraft(settings?.hidingSeconds ?? 60);
    setTotalMinutesDraft(Math.max(1, Math.round((settings?.chaseSeconds ?? 300) / 60)));
    setGameModeDraft((settings?.gameMode as any) || 'BASIC');
    setShowSettings(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#120458" />

      <View style={styles.lobbyHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.pixelLabel}>ROOM</Text>
          <Text style={styles.pixelValue}>{roomId}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={{width: 60, marginRight: 6}}>
            <PixelButton text="QR" size="small" variant="secondary" onPress={() => setShowQR(true)} />
          </View>
          <View style={{width: 60}}>
            <PixelButton text="COPY" size="small" variant="secondary" onPress={handleCopyRoomCode} />
          </View>
          {isHost && (
            <View style={{width: 60, marginLeft: 6}}>
              <PixelButton text="⚙" size="small" variant="secondary" onPress={openSettings} />
            </View>
          )}
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
          <ScrollView style={{flex: 1}} contentContainerStyle={styles.gridContainer}>
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
          <View style={[styles.panelTitleBox, {backgroundColor: '#000'}]}>
            <Text style={[styles.panelTitle, {color: '#00FF00', fontSize: 12}]}>SYSTEM_LOG</Text>
          </View>
          <ScrollView
            style={styles.terminalScroll}
            ref={chatScrollRef}
            contentContainerStyle={{padding: 6}}
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
        <View style={{flex: 1, marginRight: 8}}>
          <PixelButton text="EXIT" variant="danger" size="large" onPress={onExit} />
        </View>
        {isHost && (
          <>
            <View style={{flex: 1, marginLeft: 8, marginRight: 8}}>
              <PixelButton
                text="SHUFFLE"
                variant="warning"
                size="large"
                disabled={playersList.length < 2}
                onPress={onShuffleTeams}
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
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
              <Text style={[styles.modalText, {marginBottom: 8}]}>GAME MODE</Text>
              <View style={{flexDirection: 'row', width: '100%', marginBottom: 16}}>
                <View style={{flex: 1, marginRight: 6}}>
                  <PixelButton
                    text="BASIC"
                    variant={gameModeDraft === 'BASIC' ? 'success' : 'secondary'}
                    size="small"
                    onPress={() => setGameModeDraft('BASIC')}
                  />
                </View>
                <View style={{flex: 1, marginLeft: 6}}>
                  <PixelButton
                    text="ITEM"
                    variant={gameModeDraft === 'ITEM_FIND' ? 'success' : 'secondary'}
                    size="small"
                    onPress={() => setGameModeDraft('ITEM_FIND')}
                  />
                </View>
              </View>

              {/* Hiding Time Slider */}
              <View style={{width: '100%', marginBottom: 16}}>
                <Text style={[styles.modalText, {marginBottom: 8}]}>
                  HIDING TIME: {hidingSecondsDraft}초
                </Text>
                <Slider
                  style={{width: '100%', height: 40}}
                  minimumValue={10}
                  maximumValue={300}
                  step={10}
                  value={hidingSecondsDraft}
                  onValueChange={setHidingSecondsDraft}
                  minimumTrackTintColor="#00FF00"
                  maximumTrackTintColor="#004400"
                  thumbTintColor="#00FF00"
                />
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={sliderStyles.sliderLabel}>10초</Text>
                  <Text style={sliderStyles.sliderLabel}>300초</Text>
                </View>
              </View>

              {/* Total Game Time Slider */}
              <View style={{width: '100%', marginBottom: 16}}>
                <Text style={[styles.modalText, {marginBottom: 8}]}>
                  TOTAL GAME TIME: {totalMinutesDraft}분
                </Text>
                <Slider
                  style={{width: '100%', height: 40}}
                  minimumValue={1}
                  maximumValue={30}
                  step={1}
                  value={totalMinutesDraft}
                  onValueChange={setTotalMinutesDraft}
                  minimumTrackTintColor="#FF00FF"
                  maximumTrackTintColor="#440044"
                  thumbTintColor="#FF00FF"
                />
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={sliderStyles.sliderLabel}>1분</Text>
                  <Text style={sliderStyles.sliderLabel}>30분</Text>
                </View>
              </View>

              <View style={{width: '100%'}}>
                <PixelButton
                  text="APPLY"
                  variant="success"
                  size="medium"
                  onPress={() => {
                    const hidingClamped = Math.max(10, Math.min(300, Math.round(hidingSecondsDraft)));
                    const minutesClamped = Math.max(1, Math.min(30, Math.round(totalMinutesDraft)));
                    const chaseSeconds = minutesClamped * 60;

                    onUpdateSettings({
                      gameMode: gameModeDraft,
                      hidingSeconds: hidingClamped,
                      chaseSeconds,
                    });
                    setShowSettings(false);
                  }}
                />
              </View>
              <View style={{height: 6}} />
              <Text style={styles.modalText}>
                CURRENT: MODE {(settings?.gameMode || 'BASIC') === 'BASIC' ? 'BASIC' : 'ITEM'} / HIDE {settings?.hidingSeconds ?? 60}s / TOTAL {Math.round((settings?.chaseSeconds ?? 300) / 60)}m
              </Text>
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
