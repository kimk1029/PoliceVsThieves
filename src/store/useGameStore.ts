import { create } from 'zustand';
import {
  RoomStatus,
  RoomSettings,
  Basecamp,
  Player,
  ChatMessage,
  GameResult
} from '../types/game.types';

interface GameStore {
  roomId: string | null;
  status: RoomStatus | null;
  phaseEndsAt: number | null;
  settings: RoomSettings | null;
  basecamp: Basecamp | null;
  players: Map<string, Player>;
  chatMessages: ChatMessage[];
  result: GameResult | null;

  setRoomInfo: (info: Partial<GameStore>) => void;
  setPlayers: (players: Player[]) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  addChatMessage: (message: ChatMessage) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  roomId: null,
  status: null,
  phaseEndsAt: null,
  settings: null,
  basecamp: null,
  players: new Map(),
  chatMessages: [],
  result: null,

  setRoomInfo: (info) =>
    set((state) => ({
      ...state,
      ...info
    })),

  // 서버가 내려준 players 배열을 "진실"로 보고 통째로 교체합니다.
  // (퇴장한 플레이어가 클라이언트에 남아있는 문제 방지)
  setPlayers: (players) =>
    set(() => {
      const m = new Map<string, Player>();
      for (const p of players || []) {
        const id = (p as any).playerId || (p as any).id;
        if (id) m.set(id, p);
      }
      return { players: m };
    }),

  updatePlayer: (playerId, updates) =>
    set((state) => {
      const newPlayers = new Map(state.players);
      const existing = newPlayers.get(playerId);
      if (existing) {
        newPlayers.set(playerId, { ...existing, ...updates });
      } else {
        newPlayers.set(playerId, updates as Player);
      }
      return { players: newPlayers };
    }),

  addChatMessage: (message) =>
    set((state) => {
      console.log('[GameStore] Adding chat message:', message);
      console.log('[GameStore] Current messages count:', state.chatMessages.length);
      const newMessages = [...state.chatMessages, message];
      console.log('[GameStore] New messages count:', newMessages.length);
      return { chatMessages: newMessages };
    }),

  reset: () =>
    set({
      roomId: null,
      status: null,
      phaseEndsAt: null,
      settings: null,
      basecamp: null,
      players: new Map(),
      chatMessages: [],
      result: null
    })
}));
