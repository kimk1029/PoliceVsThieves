import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import {usePlayerStore} from '../store/usePlayerStore';

const LobbyScreen = ({navigation}: any) => {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const {setNickname, loadPlayerId} = usePlayerStore();

  useEffect(() => {
    loadPlayerId();
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('플레이어 이름을 입력해주세요!');
      return;
    }
    setNickname(playerName);
    // TODO: 서버에 방 생성 요청
    navigation.navigate('Game', {isHost: true});
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      alert('플레이어 이름을 입력해주세요!');
      return;
    }
    if (!roomCode.trim()) {
      alert('방 코드를 입력해주세요!');
      return;
    }
    setNickname(playerName);
    // TODO: 서버에 방 참가 요청
    navigation.navigate('Game', {isHost: false, roomCode});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🚔 Police vs Thieves</Text>
          <Text style={styles.subtitle}>GPS 숨바꼭질 게임</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>플레이어 정보</Text>
          <TextInput
            style={styles.input}
            placeholder="닉네임을 입력하세요"
            placeholderTextColor="#888"
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>방 만들기</Text>
          <Text style={styles.description}>
            새로운 게임 방을 생성하고 친구들을 초대하세요
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreateRoom}>
            <Text style={styles.buttonText}>🎮 방 만들기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>방 참가하기</Text>
          <Text style={styles.description}>
            친구가 공유한 방 코드를 입력하세요
          </Text>
          <TextInput
            style={styles.input}
            placeholder="방 코드 (예: ABC123)"
            placeholderTextColor="#888"
            value={roomCode}
            onChangeText={text => setRoomCode(text.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleJoinRoom}>
            <Text style={styles.buttonText}>🚪 방 참가하기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>v1.0.0</Text>
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
    marginVertical: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#aaa',
  },
  card: {
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
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a4d7a',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#0f3460',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#aaa',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  footerText: {
    color: '#555',
    fontSize: 12,
  },
});

export default LobbyScreen;
