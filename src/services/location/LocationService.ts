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
    // iOS: explicitly request authorization to trigger the system prompt
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
  }

  async checkPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted;
    }
    // iOS: ensure we have permission (will prompt if not determined)
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
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
          timeout: 25000,
          maximumAge: 0,
          forceRequestLocation: true,
          showLocationDialog: true,
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
        distanceFilter: 0,
        interval: intervalMs,
        fastestInterval: Math.max(1000, intervalMs / 2),
        maximumAge: 0,
        forceRequestLocation: true,
        showLocationDialog: true,
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
