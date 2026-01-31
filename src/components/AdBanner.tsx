import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface AdBannerProps {
  style?: any;
}

/**
 * 배너 광고 컴포넌트
 * 메인 화면 하단에 표시되는 광고
 * 크래시 방지를 위해 모든 에러를 처리하고 안전하게 렌더링
 */
export const AdBanner: React.FC<AdBannerProps> = ({ style }) => {
  const [isReady, setIsReady] = useState(false);
  const mountedRef = useRef(true);
  const adModuleRef = useRef<any>(null);

  useEffect(() => {
    mountedRef.current = true;
    
    const loadAdMob = async () => {
      // 모든 에러를 catch하여 앱이 크래시하지 않도록 함
      try {
        // 충분한 지연을 두어 앱이 완전히 로드된 후 AdMob 초기화
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        if (!mountedRef.current) return;
        
        // AdMob 모듈을 동적으로 로드
        let mobileAdsModule: any;
        try {
          mobileAdsModule = require('react-native-google-mobile-ads');
        } catch (requireError) {
          console.warn('[AdBanner] Failed to require AdMob module:', requireError);
          return;
        }
        
        if (!mountedRef.current) return;
        
        if (!mobileAdsModule) {
          console.warn('[AdBanner] AdMob module is null');
          return;
        }
        
        // BannerAd 컴포넌트 확인
        if (!mobileAdsModule.BannerAd) {
          console.warn('[AdBanner] BannerAd component not found in module');
          return;
        }
        
        // BannerAdSize 확인
        if (!mobileAdsModule.BannerAdSize) {
          console.warn('[AdBanner] BannerAdSize not found in module');
          return;
        }
        
        if (!mountedRef.current) return;
        
        // AdMob 초기화 시도 (실패해도 계속 진행)
        try {
          const mobileAds = mobileAdsModule.default;
          if (mobileAds && typeof mobileAds === 'function') {
            const initPromise = mobileAds().initialize();
            if (initPromise && typeof initPromise.then === 'function') {
              await initPromise.catch((initError: any) => {
                console.warn('[AdBanner] AdMob initialization error (non-fatal):', initError);
              });
            }
          }
        } catch (initError) {
          console.warn('[AdBanner] AdMob initialization exception (non-fatal):', initError);
          // 초기화 실패해도 계속 진행
        }
        
        if (!mountedRef.current) return;
        
        // 모듈을 ref에 저장
        adModuleRef.current = mobileAdsModule;
        
        if (!mountedRef.current) return;
        
        setIsReady(true);
        console.log('[AdBanner] AdMob ready for rendering');
      } catch (error) {
        console.warn('[AdBanner] Unexpected error loading AdMob:', error);
        // 모든 에러를 catch하여 앱이 크래시하지 않도록 함
      }
    };
    
    loadAdMob();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 준비되지 않았으면 아무것도 렌더링하지 않음
  if (!isReady || !adModuleRef.current) {
    return null;
  }

  // 에러가 발생해도 크래시하지 않도록 완전히 감싸기
  try {
    const { BannerAd, BannerAdSize, TestIds } = adModuleRef.current;
    
    if (!BannerAd || !BannerAdSize) {
      console.warn('[AdBanner] BannerAd or BannerAdSize is missing');
      return null;
    }
    
    const rawTestAdUnitId = TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111';
    const testAdUnitId = String(rawTestAdUnitId).trim();
    if (testAdUnitId !== String(rawTestAdUnitId)) {
      console.warn('[AdBanner] Test ad unit id had whitespace, trimmed.');
    }
    
    // BannerAd가 React 컴포넌트인지 확인
    if (typeof BannerAd !== 'function' && typeof BannerAd !== 'object') {
      console.warn('[AdBanner] BannerAd is not a valid React component');
      return null;
    }
    
    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={testAdUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={() => {
            console.log('[AdBanner] Test ad loaded successfully');
          }}
          onAdFailedToLoad={(error: any) => {
            console.warn('[AdBanner] Ad failed to load:', error);
          }}
        />
      </View>
    );
  } catch (error) {
    console.warn('[AdBanner] Error rendering ad component:', error);
    // 에러가 발생해도 null을 반환하여 크래시 방지
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        paddingBottom: 0,
      },
      android: {
        paddingBottom: 0,
      },
    }),
  },
});
