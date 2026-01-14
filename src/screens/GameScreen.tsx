import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import {useGameStore} from '../store/useGameStore';
import {usePlayerStore} from '../store/usePlayerStore';

const GameScreen = ({navigation, route}: any) => {
  const {status, players: playersMap} = useGameStore();
  const {playerId, team, nickname} = usePlayerStore();
  const [timer, setTimer] = useState(180); // 3분 타이머
  
  // Map을 배열로 변환
  const players = Array.from(playersMap.values());
  const phase = status; // status를 phase로 매핑

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLeaveGame = () => {
    Alert.alert(
      '게임 나가기',
      '정말 게임을 나가시겠습니까?',
      [
        {text: '취소', style: 'cancel'},
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            // TODO: 서버에 나가기 요청
            navigation.navigate('Lobby');
          },
        },
      ],
    );
  };

  const renderPhaseInfo = () => {
    switch (phase) {
      case 'LOBBY':
        return (
          <View style={styles.phaseCard}>
            <Text style={styles.phaseTitle}>⏳ 대기 중...</Text>
            <Text style={styles.phaseText}>
              플레이어를 기다리는 중입니다
            </Text>
            <Text style={styles.playerCount}>
              현재 인원: {players.length}/10
            </Text>
          </View>
        );
      case 'HIDING':
        return (
          <View style={[styles.phaseCard, styles.hidingPhase]}>
            <Text style={styles.phaseTitle}>🏃 숨는 시간!</Text>
            <Text style={styles.phaseText}>
              {team === 'THIEF'
                ? '경찰이 오기 전에 숨으세요!'
                : '도둑들이 숨는 중입니다...'}
            </Text>
          </View>
        );
      case 'CHASE':
        return (
          <View style={[styles.phaseCard, styles.chasePhase]}>
            <Text style={styles.phaseTitle}>🚔 추격전!</Text>
            <Text style={styles.phaseText}>
              {team === 'POLICE'
                ? '도둑들을 잡으세요!'
                : '경찰을 피해 도망가세요!'}
            </Text>
          </View>
        );
      case 'END':
        return (
          <View style={[styles.phaseCard, styles.endPhase]}>
            <Text style={styles.phaseTitle}>🏁 게임 종료!</Text>
            <TouchableOpacity
              style={styles.resultButton}
              onPress={() => navigation.navigate('Result')}>
              <Text style={styles.buttonText}>결과 보기</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* 상단 정보 바 */}
      <View style={styles.topBar}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{nickname || 'Player'}</Text>
          <View
            style={[
              styles.teamBadge,
              team === 'POLICE' ? styles.policeBadge : styles.thiefBadge,
            ]}>
            <Text style={styles.teamText}>
              {team === 'POLICE' ? '🚔 경찰' : '🏃 도둑'}
            </Text>
          </View>
        </View>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>
      </View>

      {/* 맵 영역 (임시) */}
      <View style={styles.mapContainer}>
        <Text style={styles.mapPlaceholder}>🗺️ 맵 영역</Text>
        <Text style={styles.mapText}>
          GPS 맵이 여기에 표시됩니다
        </Text>
        <Text style={styles.coordText}>
          현재 위치: 위도 37.5665, 경도 126.9780
        </Text>
      </View>

      {/* 게임 페이즈 정보 */}
      {renderPhaseInfo()}

      {/* 플레이어 목록 */}
      <View style={styles.playersCard}>
        <Text style={styles.cardTitle}>참가자 ({players.length})</Text>
        <View style={styles.playersList}>
          {players.slice(0, 5).map((player, index) => (
            <View key={index} style={styles.playerItem}>
              <Text style={styles.playerItemText}>
                {player.team === 'POLICE' ? '🚔' : '🏃'} Player {index + 1}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 하단 버튼 */}
      <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGame}>
        <Text style={styles.leaveButtonText}>❌ 게임 나가기</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#16213e',
    borderBottomWidth: 2,
    borderBottomColor: '#0f3460',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  teamBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  policeBadge: {
    backgroundColor: '#2196F3',
  },
  thiefBadge: {
    backgroundColor: '#FF5722',
  },
  teamText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timerContainer: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timerText: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#0f3460',
    margin: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a4d7a',
  },
  mapPlaceholder: {
    fontSize: 48,
    marginBottom: 10,
  },
  mapText: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 5,
  },
  coordText: {
    color: '#666',
    fontSize: 12,
  },
  phaseCard: {
    backgroundColor: '#16213e',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  hidingPhase: {
    borderColor: '#FFC107',
  },
  chasePhase: {
    borderColor: '#F44336',
  },
  endPhase: {
    borderColor: '#4CAF50',
  },
  phaseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  phaseText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  playerCount: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 10,
  },
  resultButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playersCard: {
    backgroundColor: '#16213e',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  playersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  playerItem: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  playerItemText: {
    color: '#fff',
    fontSize: 12,
  },
  leaveButton: {
    backgroundColor: '#F44336',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GameScreen;
