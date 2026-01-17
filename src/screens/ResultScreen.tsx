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
  const { mvp, policeStats, thiefStats } = useMemo(() => {
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

    // MVP 선정
    let mvpData: {
      playerId: string;
      nickname: string;
      type: 'POLICE' | 'THIEF';
      value: number;
    } | null = null;

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

    if (winner === 'POLICE' && topPolice) {
      mvpData = { ...topPolice, value: topPolice.captureCount };
    } else if (winner === 'THIEF' && topThief) {
      mvpData = { ...topThief, value: Math.floor(topThief.survivalTime / 1000) };
    }

    return { mvp: mvpData, policeStats: pStats, thiefStats: tStats };
  }, [
    result,
    playersList,
    captureHistory,
    settings,
    gameStartAt,
    gameEndsAt,
    winner,
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#120429" />
      <View style={styles.resultBody}>
        <View
          style={[
            styles.resultContent,
            { transform: [{ scale }], width: scaledWidth },
          ]}>

          {/* Header Title */}
          <Text style={styles.mainTitle}>GAME OVER</Text>

          {/* 1. Winner Banner Section */}
          <View
            style={[
              styles.pixelContainer,
              styles.winnerBanner,
              { borderColor: winnerThemeColor },
            ]}>
            <Text
              style={[
                styles.winnerTeamText,
                { color: winnerThemeColor, textShadowColor: winnerThemeColor },
              ]}>
              {winnerLabel}
            </Text>
            {reason ? <Text style={styles.resultReason}>"{reason}"</Text> : null}
          </View>

          {/* 2. MVP Hero Section (가장 돋보이게 배치) */}
          {mvp && (
            <View style={[styles.pixelContainer, styles.mvpContainer]}>
              <View style={styles.mvpHeaderBadge}>
                <Text style={styles.mvpHeaderLabel}>⭐ MOST VALUABLE PLAYER ⭐</Text>
              </View>
              <Text style={styles.mvpNickname}>{mvp.nickname}</Text>
              <Text
                style={[
                  styles.mvpStatValue,
                  {
                    color:
                      mvp.type === 'POLICE' ? '#00E5FF' : '#FF0055',
                  },
                ]}>
                {mvp.type === 'POLICE'
                  ? `총 ${mvp.value}명 검거`
                  : `총 ${mvp.value}초 생존`}
              </Text>
            </View>
          )}

          {/* 3. Team Stats Scoreboards (오락실 랭킹 화면처럼 넓게 배치) */}
          <View style={styles.statsSection}>

            {/* 경찰 팀 스코어보드 */}
            <View
              style={[
                styles.pixelContainer,
                styles.scoreboardContainer,
                { borderColor: '#00E5FF' },
              ]}>
              <Text style={[styles.scoreboardTitle, { color: '#00E5FF' }]}>
                👮‍♂️ POLICE SQUAD
              </Text>
              {Array.from(policeStats.entries())
                .sort((a, b) => b[1].captureCount - a[1].captureCount)
                .map(([id, stat], index) => (
                  <View
                    key={id}
                    style={[
                      styles.scoreRow,
                      index % 2 === 0 ? styles.scoreRowAlt : null, // 줄무늬 효과
                    ]}>
                    <Text style={styles.scoreName}>{stat.nickname}</Text>
                    <Text style={[styles.scoreValue, { color: '#00E5FF' }]}>
                      {stat.captureCount} KILL
                    </Text>
                  </View>
                ))}
            </View>

            {/* 도둑 팀 스코어보드 */}
            <View
              style={[
                styles.pixelContainer,
                styles.scoreboardContainer,
                { borderColor: '#FF0055', marginTop: 20 },
              ]}>
              <Text style={[styles.scoreboardTitle, { color: '#FF0055' }]}>
                🏃 THIEF GANG
              </Text>
              {Array.from(thiefStats.entries())
                .sort((a, b) => b[1].survivalTime - a[1].survivalTime)
                .map(([id, stat], index) => (
                  <View
                    key={id}
                    style={[
                      styles.scoreRow,
                      index % 2 === 0 ? styles.scoreRowAlt : null,
                    ]}>
                    <Text
                      style={[
                        styles.scoreName,
                        stat.capturedAt != null ? styles.capturedName : null, // 잡힌 사람은 취소선
                      ]}>
                      {stat.nickname}
                    </Text>
                    <Text
                      style={[
                        styles.scoreValue,
                        { color: stat.capturedAt ? '#666' : '#FF0055' },
                      ]}>
                      {stat.capturedAt
                        ? formatTime(stat.survivalTime)
                        : 'SURVIVED!'}
                    </Text>
                  </View>
                ))}
            </View>
          </View>

          {/* 4. Return Button (두껍고 누르고 싶은 아케이드 버튼 스타일) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onReturnToLobby}
            style={styles.returnButtonWrapper}>
            <View style={styles.returnButtonShadow} />
            <View style={styles.returnButtonFront}>
              <Text style={styles.buttonText}>RETURN TO LOBBY ▶</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  resultContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: pixelFont,
    letterSpacing: 4,
    textShadowColor: '#FF0055', // 메인 타이틀은 강렬한 레드/핑크 네온
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 1,
  },

  // 공통 픽셀 컨테이너 스타일 (두꺼운 테두리, 딱딱한 그림자)
  pixelContainer: {
    backgroundColor: '#1F1147', // 배경보다 약간 밝은 카드색
    borderWidth: 4,
    borderBottomWidth: 8, // 아래쪽 그림자 효과를 더 두껍게
    borderRightWidth: 6, // 오른쪽 그림자 효과
    padding: 16,
    width: '100%',
    marginBottom: 16,
    // 픽셀 느낌을 위해 shadowRadius를 0으로 설정 (안드로이드는 elevation으로 대체)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0, // 안드로이드에서는 border width로 픽셀 느낌을 내므로 elevation 제거
      },
    }),
  },

  // Winner Banner Section
  winnerBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#1A1A3A',
  },
  winnerTeamText: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: pixelFont,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    textAlign: 'center',
  },
  resultReason: {
    marginTop: 12,
    fontSize: 14,
    color: '#B4B8FF',
    textAlign: 'center',
    fontFamily: pixelFont,
    fontStyle: 'italic',
  },

  // MVP Section
  mvpContainer: {
    borderColor: '#FFD700', // 골드 테두리
    backgroundColor: '#2A2A5A',
    alignItems: 'center',
    marginTop: 10,
  },
  mvpHeaderBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 12,
    marginTop: -24, // 카트 위로 살짝 튀어나오게 배지 배치
  },
  mvpHeaderLabel: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: pixelFont,
  },
  mvpNickname: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: pixelFont,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  mvpStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: pixelFont,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  // Stats Scoreboards Section
  statsSection: {
    width: '100%',
    marginTop: 10,
  },
  scoreboardContainer: {
    padding: 0, // 내부 패딩 제거하고 scoreRow에서 처리
  },
  scoreboardTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 12,
    fontFamily: pixelFont,
    letterSpacing: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // 헤더 배경을 약간 어둡게
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.5)',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#120429',
  },
  scoreRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.05)', // 줄무늬 배경 효과
  },
  scoreName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: pixelFont,
    fontWeight: 'bold',
    flex: 1,
  },
  capturedName: {
    color: '#888',
    textDecorationLine: 'line-through', // 잡힌 사람은 취소선 표시
  },
  scoreValue: {
    fontSize: 16,
    fontFamily: pixelFont,
    fontWeight: 'bold',
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