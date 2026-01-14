import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ImprovedLobbyScreen} from './src/screens/ImprovedLobbyScreen';
import {SplashScreen} from './src/screens/SplashScreen';
import {View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, Animated} from 'react-native';
import {useGameStore} from './src/store/useGameStore';
import {usePlayerStore} from './src/store/usePlayerStore';

const App = (): React.JSX.Element => {
  const [screen, setScreen] = useState('splash'); // Start with splash
  const [screenParams, setScreenParams] = useState<any>({});

  const returnToLobby = useCallback(() => {
    // 핵심: status/roomId가 남아있으면 ImprovedLobbyScreen에서 status !== 'LOBBY' 감지로
    // 다시 game 화면으로 튕길 수 있어서, 로비 복귀 시에는 store를 리셋해야 합니다.
    useGameStore.getState().reset();
    setScreen('lobby');
    setScreenParams({});
  }, []);

  const navigate = (newScreen: string, params?: any) => {
    setScreen(newScreen);
    setScreenParams(params || {});
  };

  const {team} = usePlayerStore();
  const {status, phaseEndsAt} = useGameStore();

  // phaseEndsAt 기반 타이머(초)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (screen !== 'game') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [screen]);

  const remainingSec = phaseEndsAt ? Math.max(0, Math.ceil((phaseEndsAt - now) / 1000)) : 0;

  // HIDING 카운트다운 애니메이션(픽셀 느낌)
  const pulse = useRef(new Animated.Value(1)).current;
  const lastShown = useRef<number | null>(null);
  useEffect(() => {
    if (screen !== 'game') return;
    if (status !== 'HIDING') return;
    if (lastShown.current === remainingSec) return;
    lastShown.current = remainingSec;
    Animated.sequence([
      Animated.timing(pulse, {toValue: 1.15, duration: 120, useNativeDriver: true}),
      Animated.timing(pulse, {toValue: 1, duration: 120, useNativeDriver: true}),
    ]).start();
  }, [screen, status, remainingSec, pulse]);

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
    return <ImprovedLobbyScreen onNavigate={navigate} />;
  }

  // ─────────────────────────────────────────────────────────────
  // 🎮 GAME SCREEN (Placeholder with Retro Style)
  // ─────────────────────────────────────────────────────────────
  if (screen === 'game') {
    const roleLabel = team === 'POLICE' ? '🚔 경찰' : team === 'THIEF' ? '🏃 도둑' : '…';
    const showHidingCountdown = status === 'HIDING' && remainingSec > 0;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2D2B55" />
        
        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudBadge}>
            <Text style={styles.hudText}>{roleLabel}</Text>
          </View>
          <View style={styles.hudBadgeRight}>
            <Text style={styles.hudText}>TIME: {remainingSec}s</Text>
          </View>
        </View>

        {/* MAP AREA */}
        <View style={styles.mapContainer}>
          <Text style={styles.mapPlaceholder}>🗺️ MAP_AREA</Text>
          <Text style={styles.mapSubText}>GPS TRACKING ACTIVE</Text>
        </View>

        {/* BOTTOM PANEL */}
        <View style={styles.bottomPanel}>
          <Text style={styles.statusTitle}>MISSION: CAPTURE</Text>
          <Text style={styles.statusDesc}>Find and capture all thieves.</Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => setScreen('result')}>
            <Text style={styles.buttonText}>END GAME</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, {marginTop: 12}]}
            onPress={returnToLobby}>
            <Text style={styles.buttonText}>RETURN TO LOBBY</Text>
          </TouchableOpacity>
        </View>

        {/* HIDING PHASE: 화면 딤 + 픽셀 카운트다운만 표시 */}
        {showHidingCountdown && (
          <View style={styles.countdownOverlay}>
            <Animated.View style={[styles.countdownBox, {transform: [{scale: pulse}]}]}>
              <Text style={styles.countdownText}>{remainingSec}</Text>
            </Animated.View>
          </View>
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 🏁 RESULT SCREEN (Retro Style)
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D2B55" />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>GAME OVER</Text>
        
        <View style={styles.resultCard}>
          <Text style={styles.winnerTitle}>🏆 WINNER 🏆</Text>
          <Text style={styles.winnerTeam}>POLICE TEAM</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={returnToLobby}>
          <Text style={styles.buttonText}>RETURN TO LOBBY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D2B55',
  },
  // -- Typography --
  fontMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  
  // -- Game Screen --
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#000',
    borderBottomWidth: 4,
    borderBottomColor: '#FF0055',
  },
  hudBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  hudBadgeRight: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  hudText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#0f3460',
    margin: 16,
    borderWidth: 4,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00E5FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  mapSubText: {
    color: '#aaa',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownBox: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#00E5FF',
    borderBottomWidth: 8,
    borderRightWidth: 8,
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  countdownText: {
    color: '#F9F871',
    fontSize: 96,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textShadowColor: '#FF0055',
    textShadowOffset: {width: 6, height: 6},
    textShadowRadius: 0,
    letterSpacing: 2,
  },
  bottomPanel: {
    padding: 16,
    backgroundColor: '#000',
    borderTopWidth: 4,
    borderTopColor: '#00E5FF',
  },
  statusTitle: {
    color: '#F9F871',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statusDesc: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  
  // -- Result Screen --
  resultContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FF0055',
    marginBottom: 30,
    textShadowColor: '#00E5FF',
    textShadowOffset: {width: 4, height: 4},
    textShadowRadius: 0,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
    padding: 30,
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {width: 8, height: 8},
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  winnerTeam: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2196F3',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // -- Buttons --
  primaryButton: {
    backgroundColor: '#00E5FF',
    padding: 16,
    width: '100%',
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 4, height: 4},
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  dangerButton: {
    backgroundColor: '#FF0055',
    padding: 16,
    width: '100%',
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 4, height: 4},
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});

export default App;
