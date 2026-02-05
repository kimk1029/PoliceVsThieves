import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { AD_UNIT_IDS } from '../config/adConfig';

interface AdBannerProps {
  style?: any;
}

// Google 공식 배너 테스트 ID (ANCHORED_ADAPTIVE_BANNER용)
const FALLBACK_BANNER_TEST_ID = 'ca-app-pub-3940256099942544/6300978111';

/**
 * 배너 광고 컴포넌트
 * 메인 화면 하단에 표시되는 광고 (테스트/실제 모두 adConfig 및 TestIds 사용)
 * 크래시 방지를 위해 모든 에러를 처리하고 안전하게 렌더링
 */
export const AdBanner: React.FC<AdBannerProps> = ({ style }) => {
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const adModuleRef = useRef<any>(null);

  useEffect(() => {
    mountedRef.current = true;
    setLoadError(null);

    const loadAdMob = async () => {
      try {
        // 앱 UI가 그려진 뒤 짧게 대기 (너무 길면 사용자가 메인을 벗어날 수 있음)
        await new Promise(resolve => setTimeout(resolve, 800));

        if (!mountedRef.current) return;

        let mobileAdsModule: any;
        try {
          mobileAdsModule = require('react-native-google-mobile-ads');
        } catch (requireError: any) {
          console.warn('[AdBanner] Failed to require AdMob module:', requireError?.message ?? requireError);
          setLoadError('MODULE_LOAD_FAIL');
          return;
        }

        if (!mountedRef.current) return;
        if (!mobileAdsModule?.BannerAd || !mobileAdsModule?.BannerAdSize) {
          console.warn('[AdBanner] BannerAd or BannerAdSize not found');
          setLoadError('NO_BANNER_EXPORT');
          return;
        }

        // AdMob SDK 초기화 (v16: default가 함수, .initialize() 반환)
        try {
          const mobileAds = mobileAdsModule.default;
          if (mobileAds && typeof mobileAds === 'function') {
            const initPromise = mobileAds().initialize();
            if (initPromise?.then) {
              await initPromise;
            }
          }
        } catch (initError: any) {
          console.warn('[AdBanner] AdMob init (non-fatal):', initError?.message ?? initError);
        }

        if (!mountedRef.current) return;

        adModuleRef.current = mobileAdsModule;
        setIsReady(true);
        console.log('[AdBanner] AdMob ready, rendering banner');
      } catch (error: any) {
        console.warn('[AdBanner] Unexpected error:', error?.message ?? error);
        setLoadError('INIT_ERROR');
      }
    };

    loadAdMob();
    return () => { mountedRef.current = false; };
  }, []);

  if (!isReady || !adModuleRef.current) {
    // 로딩 중 자리 확보 (레이아웃 시프트 방지), 디버그 시 loadError 표시 가능
    return (
      <View style={[styles.container, styles.placeholder, style]}>
        {__DEV__ && loadError ? null : null}
      </View>
    );
  }

  try {
    const { BannerAd, BannerAdSize, TestIds } = adModuleRef.current;
    const testId =
      TestIds?.ADAPTIVE_BANNER ?? TestIds?.BANNER ?? AD_UNIT_IDS.BANNER_TEST ?? FALLBACK_BANNER_TEST_ID;
    const unitId = String(testId).trim();

    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdLoaded={() => {
            console.log('[AdBanner] Banner ad loaded');
          }}
          onAdFailedToLoad={(error: any) => {
            const code = error?.code ?? error?.nativeEvent?.code;
            const msg = error?.message ?? error?.nativeEvent?.message ?? String(error);
            console.warn('[AdBanner] Ad failed to load:', { code, message: msg });
          }}
        />
      </View>
    );
  } catch (error: any) {
    console.warn('[AdBanner] Render error:', error?.message ?? error);
    return <View style={[styles.container, styles.placeholder, style]} />;
  }
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: { paddingBottom: 0 },
      android: { paddingBottom: 0 },
    }),
  },
  placeholder: {
    minHeight: 50,
  },
});
