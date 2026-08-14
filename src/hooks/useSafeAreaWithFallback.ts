/**
 * 시스템 상태바/네비게이션바와 겹치지 않도록 방어적인 safe area 인셋 반환
 *
 * useSafeAreaInsets()가 0을 반환하는 기기(특히 Android)에서도
 * 최소 패딩을 보장하여 모든 기기에서 콘텐츠가 시스템 UI와 겹치지 않도록 함.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, StatusBar } from 'react-native';

// Android 최소값 (px): 다양한 기기/OS 버전 대응 (useSafeAreaInsets 0 반환 시 방어)
const ANDROID_MIN_STATUS_BAR = 32;   // 상태바 (24~32dp, 노치/펀치홀 포함)
const ANDROID_MIN_NAV_BAR = 28;      // 네비게이션바 (3버튼 ~48dp, 제스처 ~24dp)
const IOS_MIN_TOP = 20;              // iOS 노치 없는 기기

export function useSafeAreaWithFallback() {
  const insets = useSafeAreaInsets();

  const safeTop =
    Platform.OS === 'android'
      ? Math.max(
          insets.top,
          StatusBar.currentHeight ?? 0,
          ANDROID_MIN_STATUS_BAR
        )
      : Math.max(insets.top, IOS_MIN_TOP);

  const safeBottom =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, ANDROID_MIN_NAV_BAR)
      : insets.bottom;

  return { safeTop, safeBottom };
}
