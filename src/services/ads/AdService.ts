import { AD_UNIT_IDS } from '../../config/adConfig';

// AdMob 모듈을 동적으로 로드 (에러 발생 시에도 앱이 크래시하지 않도록)
let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;

try {
  const mobileAds = require('react-native-google-mobile-ads');
  InterstitialAd = mobileAds.InterstitialAd;
  AdEventType = mobileAds.AdEventType;
  TestIds = mobileAds.TestIds;
} catch (error) {
  console.warn('[AdService] Failed to load AdMob module:', error);
}

/**
 * 전면 광고(Interstitial) 관리 서비스
 * 게임 종료 시 표시되는 전면 광고를 관리합니다.
 */
class AdService {
  private interstitialAd: any = null;
  private isAdLoaded = false;
  private isAdLoading = false;
  private onInterstitialClosed: (() => void) | null = null;

  /**
   * 전면 광고 초기화 및 로드
   */
  initializeInterstitial() {
    // AdMob 모듈이 없으면 초기화하지 않음
    if (!InterstitialAd || !AdEventType) {
      console.warn('[AdService] AdMob module not available, skipping initialization');
      return;
    }

    if (this.isAdLoading || this.isAdLoaded) {
      return;
    }

    try {
      this.isAdLoading = true;

      // 개발 모드에서는 테스트 광고 사용
      const adUnitId = __DEV__ 
        ? TestIds.INTERSTITIAL 
        : AD_UNIT_IDS.INTERSTITIAL;

      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      // 광고 로드 완료 이벤트
      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdService] Interstitial ad loaded');
        this.isAdLoaded = true;
        this.isAdLoading = false;
      });

      // 광고 로드 실패 이벤트
      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.warn('[AdService] Interstitial ad failed to load:', error);
        this.isAdLoaded = false;
        this.isAdLoading = false;
      });

      // 광고 닫힘 이벤트
      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdService] Interstitial ad closed');
        this.isAdLoaded = false;
        this.isAdLoading = false;
        if (this.onInterstitialClosed) {
          this.onInterstitialClosed();
          this.onInterstitialClosed = null;
        }
        this.loadInterstitial();
      });

      // 광고 로드 시작
      this.loadInterstitial();
    } catch (error) {
      console.warn('[AdService] Failed to initialize interstitial ad:', error);
      this.isAdLoaded = false;
      this.isAdLoading = false;
    }
  }

  /**
   * 전면 광고 로드
   */
  private loadInterstitial() {
    if (this.interstitialAd && !this.isAdLoading && !this.isAdLoaded) {
      this.isAdLoading = true;
      this.interstitialAd.load();
    }
  }

  /**
   * 전면 광고 표시
   * @param onClosed 광고를 닫은 후 호출할 콜백 (로비 이동 등)
   * @returns 광고가 표시되었는지 여부. false면 onClosed는 호출하지 않음.
   */
  showInterstitial(onClosed?: () => void): boolean {
    if (!InterstitialAd) {
      console.warn('[AdService] AdMob module not available');
      return false;
    }

    try {
      if (this.interstitialAd && this.isAdLoaded) {
        this.onInterstitialClosed = onClosed ?? null;
        this.interstitialAd.show();
        this.isAdLoaded = false;
        return true;
      }
      if (onClosed) {
        this.onInterstitialClosed = null;
      }
      if (!this.isAdLoading) {
        this.loadInterstitial();
      }
      return false;
    } catch (error) {
      console.warn('[AdService] Failed to show interstitial ad:', error);
      if (onClosed) {
        this.onInterstitialClosed = null;
      }
      return false;
    }
  }

  /**
   * 전면 광고가 준비되었는지 확인
   */
  isInterstitialReady(): boolean {
    return this.isAdLoaded;
  }

  /**
   * 전면 광고 리소스 정리
   */
  cleanup() {
    this.interstitialAd = null;
    this.isAdLoaded = false;
    this.isAdLoading = false;
  }
}

// 싱글톤 인스턴스
export const adService = new AdService();
