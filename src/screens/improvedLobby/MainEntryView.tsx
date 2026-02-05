import React from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { PixelButton } from '../../components/pixel/PixelButton';
import { PixelCard } from '../../components/pixel/PixelCard';
import { PixelInput } from '../../components/pixel/PixelInput';
import { AdBanner } from '../../components/AdBanner';
import { styles } from './styles';
import { QRScanModal } from './QRScanModal';

const cardTransparentStyle = { backgroundColor: 'rgba(255,255,255,0.88)' };

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
  const [showHelp, setShowHelp] = React.useState(false);
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
          <View style={styles.topBarRow}>
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
                {isConnected ? '● ONLINE' : '○ OFFLINE'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpButton} onPress={() => setShowHelp(true)}>
              <Text style={styles.helpButtonText}>?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/images/title.png')}
              style={styles.titleImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.mainContentWrapper}>
            {/* 1. PLAYER INFO CARD */}
            <PixelCard title="PLAYER" style={[cardTransparentStyle, { marginBottom: 20 }]}>
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
                <PixelCard title="HOST" style={[cardTransparentStyle, { flex: 1 }]}>
                  <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.hint}>NEW GAME</Text>
                  </View>
                  <PixelButton text="CREATE" variant="danger" size="medium" onPress={onCreateRoom} />
                  <View style={{ height: 10 }} />
                </PixelCard>
              </View>

              {/* JOIN */}
              <View style={{ flex: 1, marginLeft: 8 }}>
                <PixelCard title="JOIN" style={[cardTransparentStyle, { flex: 1 }]}>
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

            {/* Help Modal - 게임 방법 설명 */}
            <Modal visible={showHelp} transparent animationType="fade">
              <View style={styles.modalBackdrop}>
                <View style={[styles.pixelModal, styles.helpModal]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>도움말 · HOW TO PLAY</Text>
                    <TouchableOpacity onPress={() => setShowHelp(false)}>
                      <Text style={styles.modalClose}>X</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.helpScroll} contentContainerStyle={styles.helpScrollContent}>
                    <Text style={styles.helpSectionTitle}>👮 경찰 vs 도둑 (COP vs ROBBERS)</Text>
                    <Text style={styles.helpBody}>
                      실시간 위치 기반 숨바꼭질 게임입니다. 경찰 팀은 도둑을 잡고, 도둑 팀은 제한 시간까지 살아남아야 합니다.
                    </Text>
                    <Text style={styles.helpSectionTitle}>🎮 게임 흐름</Text>
                    <Text style={styles.helpBody}>
                      1) 방 만들기(HOST) 또는 코드로 참가(JOIN){'\n'}
                      2) 호스트가 SETTINGS에서 모드·시간 설정 후 START{'\n'}
                      3) 숨는 시간: 도둑만 지도에서 위치 이동 (경찰은 대기){'\n'}
                      4) 추격 시간: 경찰이 도둑을 잡기 위해 이동, 도둑은 도망{'\n'}
                      5) 자기장(원형 구역) 안에서만 플레이 가능, 밖이면 탈락
                    </Text>
                    <Text style={styles.helpSectionTitle}>📋 게임 모드</Text>
                    <Text style={styles.helpBody}>
                      · BASIC: 일반 규칙. 경찰이 도둑을 잡으면 감옥(자기장 내 특정 지점)으로 연행.{'\n'}
                      · BATTLE: 전투 모드. 추가 규칙 적용 시 더 격렬한 플레이.
                    </Text>
                    <Text style={styles.helpSectionTitle}>⏱ 설정 항목</Text>
                    <Text style={styles.helpBody}>
                      · 숨는 시간(HIDING): 도둑이 숨을 수 있는 초 단위 시간.{'\n'}
                      · 총 게임 시간(TOTAL): 추격 단계 전체 시간(분).{'\n'}
                      · 팀 비율: 경찰/도둑 인원 비율 (호스트만 변경 가능).
                    </Text>
                    <Text style={styles.helpSectionTitle}>🏆 승패</Text>
                    <Text style={styles.helpBody}>
                      · 경찰 승리: 제한 시간 내 모든 도둑 검거.{'\n'}
                      · 도둑 승리: 한 명이라도 추격 시간 끝까지 생존.
                    </Text>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>

          {/* 배너 광고 (하단) - 에러 발생 시에도 앱이 크래시하지 않도록 완전히 감싸기 */}
          <View style={styles.bottomBanner}>
            {(() => {
              try {
                return <AdBanner />;
              } catch (error) {
                console.warn('[MainEntryView] AdBanner error:', error);
                return null;
              }
            })()}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

