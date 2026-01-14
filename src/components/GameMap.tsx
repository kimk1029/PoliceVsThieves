import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {Location} from '../types/game.types';

interface GameMapProps {
  myLocation: Location | null;
  players: Array<{
    id: string;
    name: string;
    location: Location;
    team: 'POLICE' | 'THIEF';
    status: string;
  }>;
  basecamp?: {lat: number; lng: number; radius: number} | null;
}

export const GameMap: React.FC<GameMapProps> = ({
  myLocation,
  players,
  basecamp,
}) => {
  const initialRegion = myLocation
    ? {
        latitude: myLocation.lat,
        longitude: myLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 37.5665,
        longitude: 126.978,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>🗺️ 지도</Text>
        <Text style={styles.locationText}>
          {myLocation
            ? `위도: ${myLocation.lat.toFixed(6)}, 경도: ${myLocation.lng.toFixed(6)}`
            : '위치 정보 없음'}
        </Text>
        {basecamp && (
          <Text style={styles.basecampText}>
            ⛺ 베이스캠프: {basecamp.radius}m 반경
          </Text>
        )}
        <View style={styles.playersList}>
          {players.map(player => (
            <View key={player.id} style={styles.playerMarker}>
              <Text style={styles.markerText}>
                {player.team === 'POLICE' ? '🚔' : '🏃'} {player.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 10,
  },
  basecampText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 20,
  },
  playersList: {
    width: '100%',
  },
  playerMarker: {
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  markerText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
});
