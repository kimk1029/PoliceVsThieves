import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { AD_UNIT_IDS } from '../config/adConfig';

interface AdBannerProps {
  style?: any;
}

export const AdBanner: React.FC<AdBannerProps> = ({ style }) => {
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adError, setAdError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const adModuleRef = useRef<any>(null);

  useEffect(() => {
    mountedRef.current = true;
    setLoadError(null);
    setAdError(null);

    const loadAdMob = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!mountedRef.current) return;

        let mobileAdsModule: any;
        try {
          mobileAdsModule = require('react-native-google-mobile-ads');
        } catch (requireError: any) {
          console.warn('[AdBanner] Failed to require AdMob module:', requireError?.message ?? requireError);
          if (mountedRef.current) setLoadError('MODULE_LOAD_FAIL');
          return;
        }

        if (!mountedRef.current) return;
        if (!mobileAdsModule?.BannerAd || !mobileAdsModule?.BannerAdSize) {
          console.warn('[AdBanner] BannerAd or BannerAdSize not found');
          if (mountedRef.current) setLoadError('NO_BANNER_EXPORT');
          return;
        }

        try {
          const mobileAds = mobileAdsModule.default;
          if (mobileAds && typeof mobileAds === 'function') {
            const initPromise = mobileAds().initialize();
            if (initPromise?.then) await initPromise;
          }
        } catch (initError: any) {
          console.warn('[AdBanner] AdMob init (non-fatal):', initError?.message ?? initError);
        }

        if (!mountedRef.current) return;

        adModuleRef.current = mobileAdsModule;
        setIsReady(true);
        console.log('[AdBanner] AdMob ready');
      } catch (error: any) {
        console.warn('[AdBanner] Unexpected error:', error?.message ?? error);
        if (mountedRef.current) setLoadError('INIT_ERROR');
      }
    };

    loadAdMob();
    return () => { mountedRef.current = false; };
  }, []);

  if (!isReady || !adModuleRef.current) {
    return (
      <View style={[styles.container, styles.placeholder, style]}>
        {__DEV__ && loadError && (
          <Text style={styles.debugText}>Ad: {loadError}</Text>
        )}
      </View>
    );
  }

  try {
    const { BannerAd, BannerAdSize, TestIds } = adModuleRef.current;

    const unitId = __DEV__
      ? (TestIds?.BANNER ?? 'ca-app-pub-3940256099942544/6300978111')
      : AD_UNIT_IDS.BANNER;

    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdLoaded={() => {
            console.log('[AdBanner] Banner ad loaded');
            if (mountedRef.current) setAdError(null);
          }}
          onAdFailedToLoad={(error: any) => {
            const code = error?.code ?? error?.nativeEvent?.code;
            const msg = error?.message ?? error?.nativeEvent?.message ?? String(error);
            console.warn('[AdBanner] Ad failed to load:', { code, message: msg });
            if (mountedRef.current) setAdError(`${code}: ${msg}`);
          }}
        />
        {__DEV__ && adError && (
          <Text style={styles.debugText}>AdErr: {adError}</Text>
        )}
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
