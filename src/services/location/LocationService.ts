import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import { Location } from '../../types/game.types';

export class LocationService {
  private watchId: number | null = null;
  private updateCallback: ((location: Location) => void) | null = null;

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location for gameplay.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS handles permissions automatically
  }

  async checkPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted;
    }
    return true;
  }

  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            updatedAt: Date.now()
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 2000
        }
      );
    });
  }

  startWatching(intervalMs: number, callback: (location: Location) => void): void {
    if (this.watchId !== null) {
      this.stopWatching();
    }

    this.updateCallback = callback;

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: Date.now()
        };
        callback(location);
      },
      (error) => {
        console.error('Location watch error', error);
      },
      {
        enableHighAccuracy: true,
        // distanceFilter를 0으로 설정하여 모든 위치 변경을 실시간으로 받음
        // (1미터 이상 이동 시 업데이트, 부드러운 지도 추적)
        distanceFilter: 0,
        interval: intervalMs,
        fastestInterval: intervalMs / 2
      }
    );
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.updateCallback = null;
    }
  }
}
