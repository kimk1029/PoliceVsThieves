import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import {useGameStore} from '../store/useGameStore';
import {usePlayerStore} from '../store/usePlayerStore';

const ResultScreen = ({navigation}: any) => {
  const {result, players: playersMap} = useGameStore();
  const {team} = usePlayerStore();
  
  const players = Array.from(playersMap.values());
  const winner = result?.winner || null;
  const isWinner = winner === team;

  const handleBackToLobby = () => {
    // TODO: 게임 상태 초기화
    navigation.navigate('Lobby');
  };

  const handlePlayAgain = () => {
    // TODO: 새 게임 시작
    navigation.navigate('Game');
  };

  const renderWinnerSection = () => {
    if (winner === 'POLICE') {
      return (
        <View style={styles.winnerCard}>
          <Text style={styles.winnerEmoji}>🚔</Text>
          <Text style={styles.winnerTitle}>경찰 승리!</Text>
          <Text style={styles.winnerText}>
            모든 도둑을 체포했습니다!
          </Text>
        </View>
      );
    } else if (winner === 'THIEF') {
      return (
        <View style={styles.winnerCard}>
          <Text style={styles.winnerEmoji}>🏃</Text>
          <Text style={styles.winnerTitle}>도둑 승리!</Text>
          <Text style={styles.winnerText}>
            시간 내에 도망에 성공했습니다!
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.winnerCard}>
          <Text style={styles.winnerEmoji}>🤝</Text>
          <Text style={styles.winnerTitle}>무승부!</Text>
          <Text style={styles.winnerText}>
            게임이 중단되었습니다
          </Text>
        </View>
      );
    }
  };

  const renderPlayerResult = () => {
    return (
      <View style={[styles.playerResultCard, isWinner ? styles.winCard : styles.loseCard]}>
        <Text style={styles.playerResultTitle}>
          {isWinner ? '🎉 승리!' : '😢 패배...'}
        </Text>
        <Text style={styles.playerResultText}>
          당신은 {team === 'POLICE' ? '경찰' : '도둑'} 팀이었습니다
        </Text>
      </View>
    );
  };

  const renderStats = () => {
    // 임시 통계 데이터
    const stats = {
      duration: '15:23',
      captured: 3,
      escaped: 2,
      distance: '2.3km',
    };

    return (
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>게임 통계</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.duration}</Text>
            <Text style={styles.statLabel}>게임 시간</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.captured}</Text>
            <Text style={styles.statLabel}>체포된 도둑</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.escaped}</Text>
            <Text style={styles.statLabel}>탈출한 도둑</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.distance}</Text>
            <Text style={styles.statLabel}>이동 거리</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPlayerList = () => {
    const policeTeam = players.filter(p => p.team === 'POLICE');
    const thiefTeam = players.filter(p => p.team === 'THIEF');

    return (
      <View style={styles.playersCard}>
        <Text style={styles.cardTitle}>참가자 목록</Text>
        
        <View style={styles.teamSection}>
          <Text style={styles.teamTitle}>🚔 경찰 팀 ({policeTeam.length})</Text>
          {policeTeam.map((player, index) => (
            <View key={index} style={[styles.playerItem, styles.policeItem]}>
              <Text style={styles.playerName}>Player {index + 1}</Text>
              <Text style={styles.playerStatus}>
                {player.status === 'alive' ? '✅' : '❌'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.teamSection}>
          <Text style={styles.teamTitle}>🏃 도둑 팀 ({thiefTeam.length})</Text>
          {thiefTeam.map((player, index) => (
            <View key={index} style={[styles.playerItem, styles.thiefItem]}>
              <Text style={styles.playerName}>Player {index + 1}</Text>
              <Text style={styles.playerStatus}>
                {player.status === 'alive' ? '✅ 탈출' : '🔒 체포'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>게임 결과</Text>
        </View>

        {renderWinnerSection()}
        {renderPlayerResult()}
        {renderStats()}
        {renderPlayerList()}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePlayAgain}>
            <Text style={styles.buttonText}>🔄 다시 하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackToLobby}>
            <Text style={styles.buttonText}>🏠 로비로</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  winnerCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  winnerEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  winnerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  winnerText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  playerResultCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  winCard: {
    backgroundColor: '#1B5E20',
    borderColor: '#4CAF50',
  },
  loseCard: {
    backgroundColor: '#B71C1C',
    borderColor: '#F44336',
  },
  playerResultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  playerResultText: {
    fontSize: 14,
    color: '#ddd',
  },
  statsCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
  },
  playersCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  teamSection: {
    marginBottom: 20,
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  policeItem: {
    backgroundColor: '#1565C0',
  },
  thiefItem: {
    backgroundColor: '#D84315',
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerStatus: {
    color: '#fff',
    fontSize: 12,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ResultScreen;
