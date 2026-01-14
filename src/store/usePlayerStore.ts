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
  setNickname: (name: string) => void;
  setRole: (role: PlayerRole) => void;
  setTeam: (team: Team) => void;
  setReady: (ready: boolean) => void;
  updateLocation: (loc: Location) => void;
  setThiefStatus: (status: ThiefStatus) => void;
  reset: () => void;
}

const PLAYER_ID_KEY = '@police_vs_thieves_player_id';

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

  setNickname: (name) => set({ nickname: name }),
  setRole: (role) => set({ role }),
  setTeam: (team) => set({ team }),
  setReady: (ready) => set({ ready }),
  updateLocation: (loc) => set({ location: loc }),
  setThiefStatus: (status) => set({ thiefStatus: status }),

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
