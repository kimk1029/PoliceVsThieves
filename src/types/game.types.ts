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
  state: 'FREE' | 'CAPTURED' | 'JAILED' | 'OUT_OF_ZONE';
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
  location?: Location | null;
  /** BATTLE 모드: 자기장 밖 탈락 시각 (ms) */
  outOfZoneAt?: number | null;
  /** BATTLE 모드: 자기장 밖에 처음 진입한 시각 (5초 유예용) */
  outsideZoneSince?: number | null;
}

export interface RoomSettings {
  maxPlayers: number;
  gameMode?: 'BASIC' | 'BATTLE';
  hidingSeconds: number;
  chaseSeconds: number;
  proximityRadiusMeters: number;
  captureRadiusMeters: number;
  jailRadiusMeters: number;
  policeRatio?: number; // 0.0 ~ 1.0, 경찰 비율 (기본값 0.5 = 5:5)
  battleZoneRadiusM?: number; // BATTLE 모드 자기장 초기 반경(m), 기본 100
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
