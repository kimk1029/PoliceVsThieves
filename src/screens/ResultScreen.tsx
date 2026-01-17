import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from 'react-native';
import {Player, GameResult, RoomSettings} from '../types/game.types';

interface ResultScreenProps {
  result: GameResult | null;
  players: Map<string, Player>;
  settings: RoomSettings | null;
  gameStartAt: number | null;
  gameEndsAt: number | null;
  onReturnToLobby: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  result,
  players,
  settings,
  gameStartAt,
  gameEndsAt,
  onReturnToLobby,
}) => {
  const winner = result?.winner ?? 'POLICE';
  const winnerLabel = winner === 'THIEF' ? 'THIEF TEAM' : 'POLICE TEAM';
  const reason = result?.reason;
  const captureHistory = result?.stats?.captureHistory ?? [];
  const playersList = Array.from(players.values());

  // MVP 및 통계 계산
  const {mvp, policeStats, thiefStats} = useMemo(() => {
    const pStats = new Map<string, {nickname: string; captureCount: number}>();
    const tStats = new Map<
      string,
      {nickname: string; survivalTime: number; capturedAt: number | null}
    >();

    // 경찰 검거 수 계산
    captureHistory.forEach((record) => {
      const current = pStats.get(record.policeId) || {
        nickname: record.policeNickname,
        captureCount: 0,
      };
      pStats.set(record.policeId, {
        ...current,
        captureCount: current.captureCount + 1,
      });
    });

    // 도둑 생존 시간 계산
    const hidingMs = (settings?.hidingSeconds ?? 0) * 1000;
    // App.tsx에서 전달받은 gameStartAt 사용 (없으면 계산)
    const startTime =
      gameStartAt ?? (result ? Date.now() : 0); // result가 있을 때 기준으로 fallback
    const endTime = gameEndsAt ?? Date.now();
    const totalGameTime = Math.max(0, endTime - startTime);

    playersList.forEach((player) => {
      if (player.team === 'THIEF') {
        const capturedAt = player.thiefStatus?.capturedAt;
        const survivalTime = capturedAt
          ? capturedAt - startTime
          : totalGameTime; // 생존한 경우 전체 게임 시간
        tStats.set(player.playerId, {
          nickname: player.nickname,
          survivalTime: Math.max(0, survivalTime),
          capturedAt: capturedAt ?? null,
        });
      } else if (player.team === 'POLICE') {
        if (!pStats.has(player.playerId)) {
          pStats.set(player.playerId, {
            nickname: player.nickname,
            captureCount: 0,
          });
        }
      }
    });

    // MVP 선정
    let mvpData: {
      playerId: string;
      nickname: string;
      type: 'POLICE' | 'THIEF';
      value: number;
    } | null = null;

    // 경찰 MVP: 검거 수가 가장 많은 경찰
    const topPolice = Array.from(pStats.entries())
      .map(([id, stat]) => ({playerId: id, ...stat, type: 'POLICE' as const}))
      .sort((a, b) => b.captureCount - a.captureCount)[0];

    // 도둑 MVP: 생존 시간이 가장 긴 도둑
    const topThief = Array.from(tStats.entries())
      .map(([id, stat]) => ({
        playerId: id,
        nickname: stat.nickname,
        type: 'THIEF' as const,
        survivalTime: stat.survivalTime,
      }))
      .sort((a, b) => b.survivalTime - a.survivalTime)[0];

    // MVP 결정: 우승 팀 중에서 성과가 가장 좋은 사람
    if (winner === 'POLICE' && topPolice) {
      mvpData = {...topPolice, value: topPolice.captureCount};
    } else if (winner === 'THIEF' && topThief) {
      mvpData = {...topThief, value: Math.floor(topThief.survivalTime / 1000)};
    }

    return {mvp: mvpData, policeStats: pStats, thiefStats: tStats};
  }, [result, playersList, captureHistory, settings, gameStartAt, gameEndsAt, winner]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D2B55" />
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle}>GAME OVER</Text>

        <View style={styles.resultCard}>
          <Text style={styles.winnerTitle}>🏆 WINNER 🏆</Text>
          <Text style={styles.winnerTeam}>{winnerLabel}</Text>
          {reason ? <Text style={styles.resultReason}>{reason}</Text> : null}
        </View>

        {/* MVP */}
        {mvp && (
          <View style={styles.mvpCard}>
            <Text style={styles.mvpTitle}>⭐ MVP ⭐</Text>
            <Text style={styles.mvpName}>{mvp.nickname}</Text>
            <Text style={styles.mvpValue}>
              {mvp.type === 'POLICE'
                ? `검거 ${mvp.value}명`
                : `생존 ${mvp.value}초`}
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={[styles.statsCard, styles.statsCardHalf]}>
            <Text style={styles.statsTitle}>🚔 경찰 팀</Text>
            {Array.from(policeStats.entries())
              .sort((a, b) => b[1].captureCount - a[1].captureCount)
              .map(([id, stat]) => (
                <View key={id} style={styles.statsRow}>
                  <Text style={styles.statsName}>{stat.nickname}</Text>
                  <Text style={styles.statsValue}>
                    {stat.captureCount}명
                  </Text>
                </View>
              ))}
          </View>

          <View style={[styles.statsCard, styles.statsCardHalf]}>
            <Text style={styles.statsTitle}>🏃 도둑 팀</Text>
            {Array.from(thiefStats.entries())
              .sort((a, b) => b[1].survivalTime - a[1].survivalTime)
              .map(([id, stat]) => (
                <View key={id} style={styles.statsRow}>
                  <Text style={styles.statsName}>{stat.nickname}</Text>
                  <Text style={styles.statsValue}>
                    {stat.capturedAt
                      ? formatTime(stat.survivalTime)
                      : '생존'}
                  </Text>
                </View>
              ))}
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onReturnToLobby}>
          <Text style={styles.buttonText}>로비로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D2B55',
  },
  resultBody: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  resultTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FF0055',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: '#00E5FF',
    textShadowOffset: {width: 4, height: 4},
    textShadowRadius: 0,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 2,
  },
  resultCard: {
    backgroundColor: '#0E102A',
    borderWidth: 4,
    borderColor: '#6E7BFF',
    borderBottomWidth: 8,
    borderRightWidth: 8,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 6, height: 6},
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  resultReason: {
    marginTop: 10,
    fontSize: 12,
    color: '#B4B8FF',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  winnerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFE08A',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  winnerTeam: {
    fontSize: 24,
    fontWeight: '900',
    color: '#7DE2FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textShadowColor: '#5A63FF',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 0,
  },
  mvpCard: {
    backgroundColor: '#1A1636',
    borderWidth: 4,
    borderColor: '#FFB84D',
    borderBottomWidth: 8,
    borderRightWidth: 8,
    padding: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 4, height: 4},
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  mvpTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFB84D',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  mvpName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  mvpValue: {
    fontSize: 12,
    color: '#FFE08A',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statsCard: {
    backgroundColor: '#0E102A',
    borderWidth: 2,
    borderColor: '#6E7BFF',
    padding: 10,
    borderRadius: 10,
  },
  statsCardHalf: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7DE2FF',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  statsName: {
    fontSize: 11,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: 'bold',
  },
  statsValue: {
    fontSize: 10,
    color: '#B4B8FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  primaryButton: {
    backgroundColor: '#6E7BFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    width: '100%',
    borderWidth: 2,
    borderColor: '#0E102A',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 3, height: 3},
    shadowOpacity: 1,
    shadowRadius: 0,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});
