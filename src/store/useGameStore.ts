import { create } from 'zustand';
import {
  RoomStatus,
  RoomSettings,
  Basecamp,
  Player,
  ChatMessage,
  GameResult
} from '../types/game.types';

function isValidBasecamp(b: Basecamp | null | undefined): b is Basecamp {
  return (
    b != null &&
    typeof b.lat === 'number' &&
    typeof b.lng === 'number' &&
    isFinite(b.lat) &&
    isFinite(b.lng) &&
    (b.lat !== 0 || b.lng !== 0)
  );
}

interface GameStore {
  roomId: string | null;
  status: RoomStatus | null;
  phaseEndsAt: number | null;
  settings: RoomSettings | null;
  /** 방장이 APPLY한 설정 (game:state로 덮어쓰기 방지) */
  hostAppliedSettings: Partial<RoomSettings> | null;
  basecamp: Basecamp | null;
  /** 처음 받은 유효한 베이스캠프 위치. 게임 중 고정되어 지도에 항상 표시됨 */
  fixedBasecamp: Basecamp | null;
  players: Map<string, Player>;
  chatMessages: ChatMessage[];
  result: GameResult | null;

  setRoomInfo: (info: Partial<GameStore>) => void;
  setHostAppliedSettings: (s: Partial<RoomSettings> | null) => void;
  setPlayers: (players: Player[]) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  addChatMessage: (message: ChatMessage) => void;
  /** 게임 화면에서 현재 위치가 인식되면 호출. 유효한 좌표면 시작 위치를 베이스캠프로 고정(한 번만 설정) */
  setFixedBasecampFromCurrentLocation: (lat: number, lng: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  roomId: null,
  status: null,
  phaseEndsAt: null,
  settings: null,
  hostAppliedSettings: null,
  basecamp: null,
  fixedBasecamp: null,
  players: new Map(),
  chatMessages: [],
  result: null,

  setHostAppliedSettings: (s) => set({ hostAppliedSettings: s }),

  setRoomInfo: (info) =>
    set((state) => {
      const next = { ...state, ...info };
      // 서버 settings 수신 시 hostAppliedSettings로 덮어써서 방장 적용값 보존
      if (info.settings !== undefined && state.hostAppliedSettings) {
        next.settings = { ...info.settings, ...state.hostAppliedSettings } as RoomSettings;
      }
      // 서버에서 유효한 basecamp 수신 시 고정. BATTLE 모드: 항상 서버 basecamp 사용(모든 플레이어 동일)
      if (info.basecamp !== undefined && isValidBasecamp(info.basecamp)) {
        const isBattle = (next.settings ?? state.settings)?.gameMode === 'BATTLE';
        if (isBattle || state.fixedBasecamp == null) {
          next.fixedBasecamp = info.basecamp;
        }
      }
      return next;
    }),

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
      const hasId = message && typeof (message as any).messageId === 'string';
      if (hasId && state.chatMessages.some((m: any) => m.messageId === (message as any).messageId)) {
        return state;
      }
      const newMessages = [...state.chatMessages, message];
      return { chatMessages: newMessages };
    }),

  setFixedBasecampFromCurrentLocation: (lat, lng) =>
    set((state) => {
      const valid =
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        isFinite(lat) &&
        isFinite(lng) &&
        (lat !== 0 || lng !== 0);
      if (!valid) return state;
      if (isValidBasecamp(state.fixedBasecamp)) return state;
      return {
        ...state,
        fixedBasecamp: { lat, lng, setAt: Date.now() },
      };
    }),

  reset: () =>
    set({
      roomId: null,
      status: null,
      phaseEndsAt: null,
      settings: null,
      hostAppliedSettings: null,
      basecamp: null,
      fixedBasecamp: null,
      players: new Map(),
      chatMessages: [],
      result: null
    })
}));
