import {NativeModules, Platform} from 'react-native';

// Android 에뮬레이터에서는 localhost 대신 10.0.2.2 사용 (호스트 머신)
const DEFAULT_API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:9001' 
  : 'http://localhost:9001';

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const nativeUrl = NativeModules?.AppConfig?.API_BASE_URL;
  const raw = typeof nativeUrl === 'string' && nativeUrl.length > 0 ? nativeUrl : DEFAULT_API_BASE_URL;
  const normalized = normalizeBaseUrl(raw);
  console.log('[pntConfig] Native API_BASE_URL:', nativeUrl);
  console.log('[pntConfig] Raw URL:', raw);
  console.log('[pntConfig] Normalized URL:', normalized);
  return normalized;
}

export function getWsUrl(): string {
  const base = getApiBaseUrl();

  // Allow passing ws/wss directly, but default to converting http(s) -> ws(s)
  let wsUrl: string;
  if (base.startsWith('ws://') || base.startsWith('wss://')) {
    wsUrl = base;
  } else if (base.startsWith('https://')) {
    wsUrl = base.replace(/^https:\/\//, 'wss://');
  } else if (base.startsWith('http://')) {
    wsUrl = base.replace(/^http:\/\//, 'ws://');
  } else {
    wsUrl = base;
  }
  
  console.log('[pntConfig] WebSocket URL:', wsUrl);
  return wsUrl;
}

export function isStage(): boolean {
  return Boolean(NativeModules?.AppConfig?.IS_STAGE);
}

type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const DEFAULT_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
];

function parseUrls(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function getIceServers(): IceServer[] {
  const turnUrls = parseUrls(NativeModules?.AppConfig?.TURN_URL);
  const turnUsername = NativeModules?.AppConfig?.TURN_USERNAME;
  const turnCredential = NativeModules?.AppConfig?.TURN_CREDENTIAL;

  const iceServers: IceServer[] = [
    ...DEFAULT_STUN_SERVERS.map(url => ({urls: url})),
  ];

  if (turnUrls.length > 0) {
    iceServers.unshift({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });

    if (!turnUsername || !turnCredential) {
      console.warn('[pntConfig] TURN credentials missing');
    }
  } else {
    console.warn('[pntConfig] TURN_URL not set, using STUN only');
  }

  console.log('[pntConfig] ICE servers:', iceServers);
  return iceServers;
}

