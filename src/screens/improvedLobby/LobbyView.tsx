import React from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import {PixelButton} from '../../components/pixel/PixelButton';
import {QRCodeView} from '../../components/QRCodeView';
import {styles} from './styles';
import {ChatMessage, Player} from '../../types/game.types';

interface LobbyViewProps {
  roomId: string;
  players: Map<string, Player>;
  playerId: string | null;
  chatMessages: ChatMessage[];
  chatInput: string;
  onChangeChatInput: (t: string) => void;
  onSendChat: (text: string) => void;
  onExit: () => void;
  onShuffleTeams: () => void;
  onStartGame: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomId,
  players,
  playerId,
  chatMessages,
  chatInput,
  onChangeChatInput,
  onSendChat,
  onExit,
  onShuffleTeams,
  onStartGame,
}) => {
  const [showQR, setShowQR] = React.useState(false);
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
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Players */}
        <View style={[styles.panelBox, {flex: 2}]}>
          <View style={styles.panelTitleBox}>
            <Text style={styles.panelTitle}>PLAYERS [{playersList.length}/20]</Text>
          </View>
          <ScrollView style={{flex: 1}} contentContainerStyle={styles.gridContainer}>
            {playersList.map((player, index) => {
              const isMe = player.playerId === playerId;
              return (
                <View key={index} style={[styles.playerSlot, isMe && styles.playerSlotMe]}>
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
        <View style={[styles.panelBox, {flex: 1, marginTop: 10}]}>
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
      </View>

      {/* Footer */}
      <View style={styles.footerBar}>
        <View style={{flex: 1, marginRight: 8}}>
          <PixelButton text="EXIT" variant="danger" size="large" onPress={onExit} />
        </View>
        {isHost && (
          <View style={{flex: 2, marginLeft: 8}}>
            <PixelButton
              text={allTeamsAssigned ? 'START' : 'SHUFFLE & START'}
              variant={allTeamsAssigned ? 'success' : 'primary'}
              size="large"
              disabled={playersList.length < 2}
              onPress={() => {
                if (!allTeamsAssigned) onShuffleTeams();
                else onStartGame();
              }}
            />
          </View>
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
    </SafeAreaView>
  );
};

