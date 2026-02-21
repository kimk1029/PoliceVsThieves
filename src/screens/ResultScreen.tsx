import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  useWindowDimensions,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { Player, GameResult, RoomSettings } from '../types/game.types';

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
  // 승리 팀에 따른 테마 색상 및 라벨 설정
  const isPoliceWin = winner === 'POLICE';
  const winnerThemeColor = isPoliceWin ? '#00E5FF' : '#FF0055'; // 경찰 Blue, 도둑 Pink
  const winnerLabel = isPoliceWin ? 'POLICE TEAM WINS!' : 'THIEF TEAM WINS!';

  const reason = result?.reason;
  const captureHistory = result?.stats?.captureHistory ?? [];
  const playersList = Array.from(players.values());

  // =================================================================
  // [로직 유지] MVP 및 통계 계산 부분은 기존 코드와 동일합니다.
  // =================================================================
  const { mvpPolice, mvpThief, policeStats, thiefStats } = useMemo(() => {
    const pStats = new Map<string, { nickname: string; captureCount: number }>();
    const tStats = new Map<
      string,
      { nickname: string; survivalTime: number; capturedAt: number | null }
    >();

    // 경찰 검거 수 계산
    captureHistory.forEach(record => {
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
    const startTime = gameStartAt ?? (result ? Date.now() : 0);
    const endTime = gameEndsAt ?? Date.now();
    const totalGameTime = Math.max(0, endTime - startTime);

    playersList.forEach(player => {
      if (player.team === 'THIEF') {
        const capturedAt = player.thiefStatus?.capturedAt;
        const survivalTime = capturedAt
          ? capturedAt - startTime
          : totalGameTime;
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

    // MVP: 경찰 1명, 도둑 1명 각각 선정 (누구에게나 보여줌)
    const topPolice = Array.from(pStats.entries())
      .map(([id, stat]) => ({ playerId: id, ...stat, type: 'POLICE' as const }))
      .sort((a, b) => b.captureCount - a.captureCount)[0];

    const topThief = Array.from(tStats.entries())
      .map(([id, stat]) => ({
        playerId: id,
        nickname: stat.nickname,
        type: 'THIEF' as const,
        survivalTime: stat.survivalTime,
      }))
      .sort((a, b) => b.survivalTime - a.survivalTime)[0];

    const mvpPolice =
      topPolice != null
        ? { ...topPolice, value: topPolice.captureCount }
        : null;
    const mvpThief =
      topThief != null
        ? { ...topThief, value: Math.floor(topThief.survivalTime / 1000) }
        : null;

    return {
      mvpPolice,
      mvpThief,
      policeStats: pStats,
      thiefStats: tStats,
    };
  }, [
    result,
    playersList,
    captureHistory,
    settings,
    gameStartAt,
    gameEndsAt,
  ]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  // =================================================================
  // [디자인 변경] 렌더링 부분 UI/UX 개선
  // =================================================================
  const { height, width } = useWindowDimensions();
  const scale = Math.min(1, height / 820);
  const scaledWidth = Math.min(width, width / scale);

  const thievesWinBg = require('../assets/images/thieves-win-bg.jpg');
  const policeWinBg = require('../assets/images/police-win-bg.jpg');
  const bgSource = winner === 'THIEF' ? thievesWinBg : policeWinBg;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        source={bgSource}
        style={styles.resultBody}
        resizeMode="cover"
      >
        <ScrollView
          style={styles.scrollWrap}
          contentContainerStyle={[
            styles.resultContent,
            styles.resultContentBottom,
            { paddingBottom: 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 배경에 GAME OVER / 우승 타이틀 있음 → 별도 배너 제거 */}

          {/* MVP 인포그래픽 카드 - 경찰/도둑 각 1명씩 모두 표시 */}
          {(mvpPolice != null || mvpThief != null) && (
            <View style={styles.mvpRow}>
              {mvpPolice != null && (
                <View
                  style={[
                    styles.mvpInfographic,
                    styles.mvpInfographicHalf,
                    { borderLeftColor: '#00E5FF' },
                  ]}
                >
                  <View style={styles.mvpInfographicLeft}>
                    <Text style={styles.mvpInfographicIcon}>👮</Text>
                    <View style={styles.mvpInfographicLabelWrap}>
                      <Text style={styles.mvpInfographicLabel}>MVP POLICE</Text>
                      <Text style={styles.mvpInfographicName}>{mvpPolice.nickname}</Text>
                    </View>
                  </View>
                  <View style={styles.mvpInfographicRight}>
                    <Text style={[styles.mvpInfographicValue, { color: '#00E5FF' }]}>
                      {mvpPolice.value}
                    </Text>
                    <Text style={styles.mvpInfographicUnit}>명 검거</Text>
                  </View>
                </View>
              )}
              {mvpThief != null && (
                <View
                  style={[
                    styles.mvpInfographic,
                    styles.mvpInfographicHalf,
                    { borderLeftColor: '#FF0055', marginLeft: mvpPolice != null ? 12 : 0 },
                  ]}
                >
                  <View style={styles.mvpInfographicLeft}>
                    <Text style={styles.mvpInfographicIcon}>🦹</Text>
                    <View style={styles.mvpInfographicLabelWrap}>
                      <Text style={styles.mvpInfographicLabel}>MVP THIEF</Text>
                      <Text style={styles.mvpInfographicName}>{mvpThief.nickname}</Text>
                    </View>
                  </View>
                  <View style={styles.mvpInfographicRight}>
                    <Text style={[styles.mvpInfographicValue, { color: '#FF0055' }]}>
                      {mvpThief.value}
                    </Text>
                    <Text style={styles.mvpInfographicUnit}>초 생존</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 경찰 / 도둑 스쿼드 세로 반반 (좌우 분할) */}
          <View style={styles.squadsRow}>
            <View style={[styles.squadColumn, styles.squadColumnPolice]}>
              <Text style={[styles.squadColumnTitle, { color: '#00E5FF' }]}>
                👮 POLICE SQUAD
              </Text>
              <View style={styles.squadList}>
                {Array.from(policeStats.entries())
                  .sort((a, b) => b[1].captureCount - a[1].captureCount)
                  .map(([id, stat], index) => (
                    <View key={id} style={styles.squadRow}>
                      <Text style={styles.squadRowName} numberOfLines={1}>
                        {stat.nickname}
                      </Text>
                      <Text style={[styles.squadRowValue, { color: '#00E5FF' }]}>
                        {stat.captureCount}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
            <View style={[styles.squadColumn, styles.squadColumnThief, { marginLeft: 12 }]}>
              <Text style={[styles.squadColumnTitle, { color: '#FF0055' }]}>
                🏃 THIEF GANG
              </Text>
              <View style={styles.squadList}>
                {Array.from(thiefStats.entries())
                  .sort((a, b) => b[1].survivalTime - a[1].survivalTime)
                  .map(([id, stat]) => (
                    <View key={id} style={styles.squadRow}>
                      <Text
                        style={[
                          styles.squadRowName,
                          stat.capturedAt != null ? styles.squadRowNameCaptured : null,
                        ]}
                        numberOfLines={1}
                      >
                        {stat.nickname}
                      </Text>
                      <Text
                        style={[
                          styles.squadRowValue,
                          { color: stat.capturedAt != null ? '#888' : '#FF0055' },
                        ]}
                      >
                        {stat.capturedAt != null
                          ? formatTime(stat.survivalTime)
                          : '✓'}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onReturnToLobby}
            style={styles.returnButtonWrapper}
          >
            <View style={styles.returnButtonShadow} />
            <View style={styles.returnButtonFront}>
              <Text style={styles.buttonText}>RETURN TO LOBBY ▶</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

// =================================================================
// [스타일 정의] 픽셀 아트 & 네온 사이버펑크 테마 적용
// =================================================================
// 공통 폰트 스타일 정의
const pixelFont = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120429', // 더 깊은 밤하늘색 배경
  },
  resultBody: {
    flex: 1,
  },
  scrollWrap: {
    flex: 1,
  },
  resultContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'stretch',
  },
  resultContentBottom: {
    justifyContent: 'flex-end',
  },

  mvpRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  mvpInfographic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderLeftWidth: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  mvpInfographicHalf: {
    flex: 1,
  },
  mvpInfographicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mvpInfographicIcon: {
    fontSize: 36,
    marginRight: 14,
  },
  mvpInfographicLabelWrap: {
    flex: 1,
  },
  mvpInfographicLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  mvpInfographicName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mvpInfographicRight: {
    alignItems: 'flex-end',
  },
  mvpInfographicValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  mvpInfographicUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },

  // 경찰/도둑 스쿼드 좌우 반반
  squadsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  squadColumn: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  squadColumnPolice: {
    borderTopWidth: 3,
    borderTopColor: '#00E5FF',
  },
  squadColumnThief: {
    borderTopWidth: 3,
    borderTopColor: '#FF0055',
  },
  squadColumnTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 10,
    letterSpacing: 0.5,
  },
  squadList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  squadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  squadRowName: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  squadRowNameCaptured: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  squadRowValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Return Button (아케이드 버튼 스타일)
  returnButtonWrapper: {
    width: '100%',
    height: 60,
    marginTop: 30,
    position: 'relative',
  },
  returnButtonShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000', // 버튼 그림자
  },
  returnButtonFront: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FF0055', // 메인 버튼 색상 (강렬한 핑크)
    borderWidth: 4,
    borderColor: '#FFFFFF', // 흰색 테두리로 팝하게
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: pixelFont,
    letterSpacing: 2,
  },
});