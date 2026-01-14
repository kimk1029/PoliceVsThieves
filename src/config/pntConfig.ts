import {NativeModules} from 'react-native';

const DEFAULT_API_BASE_URL = 'http://localhost:9001';

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const nativeUrl = NativeModules?.AppConfig?.API_BASE_URL;
  const raw = typeof nativeUrl === 'string' && nativeUrl.length > 0 ? nativeUrl : DEFAULT_API_BASE_URL;
  return normalizeBaseUrl(raw);
}

export function getWsUrl(): string {
  const base = getApiBaseUrl();

  // Allow passing ws/wss directly, but default to converting http(s) -> ws(s)
  if (base.startsWith('ws://') || base.startsWith('wss://')) {
    return base;
  }
  if (base.startsWith('https://')) {
    return base.replace(/^https:\/\//, 'wss://');
  }
  if (base.startsWith('http://')) {
    return base.replace(/^http:\/\//, 'ws://');
  }
  return base;
}

export function isStage(): boolean {
  return Boolean(NativeModules?.AppConfig?.IS_STAGE);
}

