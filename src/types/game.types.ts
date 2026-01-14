export type RoomStatus = 'LOBBY' | 'HIDING' | 'CHASE' | 'END';
export type Team = 'POLICE' | 'THIEF';
export type PlayerRole = 'HOST' | 'GUEST';

export interface Location {
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: number;
}

export interface ThiefStatus {
  state: 'FREE' | 'CAPTURED' | 'JAILED';
  capturedBy: string | null;
  capturedAt: number | null;
  jailedAt: number | null;
}

export interface Player {
  playerId: string;
  nickname: string;
  role: PlayerRole;
  team: Team | null;
  ready: boolean;
  connected: boolean;
  thiefStatus: ThiefStatus | null;
}

export interface RoomSettings {
  maxPlayers: number;
  gameMode?: 'BASIC' | 'ITEM_FIND';
  hidingSeconds: number;
  chaseSeconds: number;
  proximityRadiusMeters: number;
  captureRadiusMeters: number;
  jailRadiusMeters: number;
}

export interface Basecamp {
  lat: number;
  lng: number;
  setAt: number;
}

export interface ChatMessage {
  messageId: string;
  playerId: string;
  nickname: string;
  text: string;
  timestamp: number;
}

export interface GameResult {
  winner: Team;
  reason: string;
  stats: {
    totalThieves: number;
    capturedCount: number;
    jailedCount: number;
    survivedThieves: string[];
    captureHistory: CaptureRecord[];
  };
}

export interface CaptureRecord {
  thiefId: string;
  thiefNickname: string;
  policeId: string;
  policeNickname: string;
  capturedAt: number;
  jailedAt: number | null;
}
