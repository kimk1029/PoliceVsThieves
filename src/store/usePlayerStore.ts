import { create } from 'zustand';
import { PlayerRole, Team, ThiefStatus, Location } from '../types/game.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlayerStore {
  playerId: string | null;
  nickname: string | null;
  role: PlayerRole | null;
  team: Team | null;
  ready: boolean;
  thiefStatus: ThiefStatus | null;
  location: Location | null;

  setPlayerId: (id: string) => Promise<void>;
  loadPlayerId: () => Promise<void>;
  setNickname: (name: string) => Promise<void>;
  loadNickname: () => Promise<string | null>;
  setRole: (role: PlayerRole) => void;
  setTeam: (team: Team) => void;
  setReady: (ready: boolean) => void;
  updateLocation: (loc: Location) => void;
  setThiefStatus: (status: ThiefStatus) => void;
  reset: () => void;
}

const PLAYER_ID_KEY = '@police_vs_thieves_player_id';
const NICKNAME_KEY = '@police_vs_thieves_nickname';

const MIN_LOCATION_DELTA = 0.00001; // ~1m
const MIN_LOCATION_UPDATE_MS = 700;
const ACCURACY_IMPROVEMENT_METERS = 2;

export const usePlayerStore = create<PlayerStore>((set) => ({
  playerId: null,
  nickname: null,
  role: null,
  team: null,
  ready: false,
  thiefStatus: null,
  location: null,

  setPlayerId: async (id) => {
    await AsyncStorage.setItem(PLAYER_ID_KEY, id);
    set({ playerId: id });
  },

  loadPlayerId: async () => {
    const id = await AsyncStorage.getItem(PLAYER_ID_KEY);
    if (id) {
      set({ playerId: id });
    } else {
      const newId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      await AsyncStorage.setItem(PLAYER_ID_KEY, newId);
      set({ playerId: newId });
    }
  },

  setNickname: async (name) => {
    if (name && name.trim()) {
      await AsyncStorage.setItem(NICKNAME_KEY, name.trim());
      set({ nickname: name.trim() });
    } else {
      set({ nickname: name });
    }
  },
  setRole: (role) => set({ role }),
  setTeam: (team) => set({ team }),
  setReady: (ready) => set({ ready }),
  updateLocation: (loc) =>
    set((state) => {
      if (!loc) return {};
      const next = { ...loc, updatedAt: loc.updatedAt ?? Date.now() };
      const prev = state.location;

      if (!prev) {
        return { location: next };
      }

      const latDiff = Math.abs(next.lat - prev.lat);
      const lngDiff = Math.abs(next.lng - prev.lng);
      const timeDiff = (next.updatedAt ?? 0) - (prev.updatedAt ?? 0);
      const accuracyImproved =
        typeof next.accuracy === 'number' &&
        typeof prev.accuracy === 'number' &&
        next.accuracy + ACCURACY_IMPROVEMENT_METERS < prev.accuracy;

      const isSmallMove = latDiff < MIN_LOCATION_DELTA && lngDiff < MIN_LOCATION_DELTA;
      const isTooSoon = timeDiff > 0 && timeDiff < MIN_LOCATION_UPDATE_MS;

      if (isSmallMove && isTooSoon && !accuracyImproved) {
        return {};
      }

      return { location: next };
    }),
  setThiefStatus: (status) => set({ thiefStatus: status }),

  loadNickname: async () => {
    const saved = await AsyncStorage.getItem(NICKNAME_KEY);
    if (saved) {
      set({ nickname: saved });
      return saved;
    }
    return null;
  },

  reset: () =>
    set({
      nickname: null,
      role: null,
      team: null,
      ready: false,
      thiefStatus: null,
      location: null
    })
}));
