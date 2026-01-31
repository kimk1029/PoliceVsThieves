/**
 * AdMob 광고 단위 ID 설정
 * 
 * 개발 중에는 테스트 광고를 사용하고,
 * 배포 시에는 AdMob 대시보드에서 발급받은 실제 광고 단위 ID로 교체하세요.
 */

import { Platform } from 'react-native';

export const AD_UNIT_IDS = {
  // 테스트 광고 (개발 중 사용)
  BANNER_TEST: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_TEST: 'ca-app-pub-3940256099942544/1033173712',
  
  // 실제 광고 (배포 시 사용)
  // 플랫폼별로 다른 광고 단위 ID 사용
  BANNER: __DEV__ 
    ? 'ca-app-pub-3940256099942544/6300978111' 
    : Platform.OS === 'ios'
      ? 'ca-app-pub-8606099213555265/9980836645' // 배너 광고 ID (iOS)
      : 'ca-app-pub-8606099213555265/3560782426', // 배너 광고 ID (Android)
  
  INTERSTITIAL: __DEV__
    ? 'ca-app-pub-3940256099942544/1033173712'
    : Platform.OS === 'ios'
      ? 'ca-app-pub-8606099213555265/9980836645' // 전면 광고 ID (iOS - 임시로 배너와 동일)
      : 'ca-app-pub-8606099213555265/3560782426', // 전면 광고 ID (Android - 임시로 배너와 동일)
};

// 개발 모드 여부
export const IS_DEV = __DEV__;
