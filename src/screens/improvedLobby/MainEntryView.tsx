import React from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { PixelButton } from '../../components/pixel/PixelButton';
import { PixelCard } from '../../components/pixel/PixelCard';
import { PixelInput } from '../../components/pixel/PixelInput';
import { styles } from './styles';
import { QRScanModal } from './QRScanModal';

interface MainEntryViewProps {
  isConnected: boolean;
  onPressStatus: () => Promise<void>;

  playerName: string;
  onChangePlayerName: (name: string) => void;

  roomCode: string;
  onChangeRoomCode: (code: string) => void;

  onCreateRoom: () => Promise<void>;
  onJoinRoom: () => Promise<void>;
  onOpenScanner: () => Promise<void>;

  // QR Scan
  showQRScan: boolean;
  qrScannerSession: number;
  onScannedRaw: (raw: string) => void;
  onCancelScan: () => void;

  // Reconnect modal
  showReconnectingModal: boolean;
}

export const MainEntryView: React.FC<MainEntryViewProps> = ({
  isConnected,
  onPressStatus,
  playerName,
  onChangePlayerName,
  roomCode,
  onChangeRoomCode,
  onCreateRoom,
  onJoinRoom,
  onOpenScanner,
  showQRScan,
  qrScannerSession,
  onScannedRaw,
  onCancelScan,
  showReconnectingModal,
}) => {
  return (
    <ImageBackground
      source={require('../../assets/images/bgtitle.jpg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#120458" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.mainWrapper}
        >
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/images/title.png')}
              style={styles.titleImage}
              resizeMode="contain"
            />
          </View>

        <TouchableOpacity
          style={[
            styles.statusBar,
            isConnected ? { borderColor: '#00FF00' } : { borderColor: '#FF0000' },
          ]}
          onPress={onPressStatus}
        >
          <Text
            style={[
              styles.statusText,
              isConnected ? { color: '#00FF00' } : { color: '#FF0000' },
            ]}
          >
            {isConnected ? '● SYSTEM ONLINE' : '○ SYSTEM OFFLINE'}
          </Text>
        </TouchableOpacity>

        {/* 1. PLAYER INFO CARD */}
        <PixelCard title="PLAYER" style={{ marginBottom: 20 }}>
          <PixelInput
            label="NICKNAME"
            placeholder="NAME"
            value={playerName}
            onChangeText={onChangePlayerName}
            maxLength={12}
          />
        </PixelCard>

        {/* 2. ACTION ROW (HOST / JOIN) */}
        <View style={styles.actionRow}>
          {/* HOST */}
          <View style={{ flex: 1, marginRight: 8 }}>
            <PixelCard title="HOST" style={{ flex: 1 }}>
              <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.hint}>NEW GAME</Text>
              </View>
              <PixelButton text="CREATE" variant="danger" size="medium" onPress={onCreateRoom} />
              <View style={{ height: 10 }} />
            </PixelCard>
          </View>

          {/* JOIN */}
          <View style={{ flex: 1, marginLeft: 8 }}>
            <PixelCard title="JOIN" style={{ flex: 1 }}>
              <View style={{ marginBottom: 4 }}>
                <PixelInput
                  placeholder="CODE"
                  value={roomCode}
                  onChangeText={(t) => {
                    const upper = t.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    onChangeRoomCode(upper);
                  }}
                  maxLength={6}
                  autoCapitalize="characters"
                  style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 4 }}>
                  <PixelButton text="SCAN" variant="secondary" size="small" onPress={onOpenScanner} />
                </View>
                <View style={{ flex: 1, marginLeft: 4 }}>
                  <PixelButton text="GO" variant="success" size="small" onPress={onJoinRoom} />
                </View>
              </View>
            </PixelCard>
          </View>
        </View>

        <QRScanModal
          visible={showQRScan}
          qrScannerSession={qrScannerSession}
          playerName={playerName}
          onScannedRaw={onScannedRaw}
          onCancel={onCancelScan}
        />

        {/* Reconnecting Modal */}
        <Modal visible={showReconnectingModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.pixelModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>SYSTEM</Text>
              </View>
              <View style={styles.qrBody}>
                <Text style={styles.modalText}>Reconnecting...</Text>
              </View>
            </View>
          </View>
        </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

