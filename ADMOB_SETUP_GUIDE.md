# Google AdMob 광고 통합 가이드

이 문서는 iOS와 Android 모두에서 작동하는 Google AdMob 광고를 앱에 통합하는 방법을 안내합니다.

## 1. AdMob 계정 설정

### 1.1 AdMob 계정 생성
1. [Google AdMob](https://admob.google.com/)에 접속
2. Google 계정으로 로그인
3. 앱 등록:
   - iOS: Bundle ID: `com.copvsrobbers`
   - Android: Package Name: `com.copvsrobbers`

### 1.2 광고 단위 ID 생성
1. AdMob 대시보드에서 **앱** 선택
2. **광고 단위** → **광고 단위 추가**
3. 광고 형식 선택:
   - **배너 광고** (메인 화면용)
   - **전면 광고** (게임 종료 시용)
4. 광고 단위 ID 복사 (예: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`)

### 1.3 테스트 광고 단위 ID
개발 중에는 테스트 광고를 사용하세요:

- **배너 광고 (테스트)**: `ca-app-pub-3940256099942544/6300978111`
- **전면 광고 (테스트)**: `ca-app-pub-3940256099942544/1033173712`

## 2. 패키지 설치

```bash
npm install react-native-google-mobile-ads
```

### iOS 추가 설정

```bash
cd ios
pod install
cd ..
```

## 3. Android 설정

### 3.1 `android/app/build.gradle` 확인

다음이 포함되어 있는지 확인:

```gradle
dependencies {
    // ... 기존 dependencies
    implementation 'com.google.android.gms:play-services-ads:22.6.0'
}
```

### 3.2 `android/app/src/main/AndroidManifest.xml` 수정

`<application>` 태그 내에 AdMob App ID 추가:

```xml
<manifest>
    <application>
        <!-- 기존 설정들... -->
        
        <!-- AdMob App ID -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"/>
    </application>
</manifest>
```

**중요**: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`는 AdMob 대시보드에서 발급받은 실제 App ID로 교체하세요.

## 4. iOS 설정

### 4.1 `ios/PoliceVsThieves/Info.plist` 수정

`<dict>` 태그 내에 AdMob App ID 추가:

```xml
<dict>
    <!-- 기존 설정들... -->
    
    <!-- AdMob App ID -->
    <key>GADApplicationIdentifier</key>
    <string>ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>
</dict>
```

**중요**: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`는 AdMob 대시보드에서 발급받은 실제 App ID로 교체하세요.

## 5. 코드 구현

### 5.1 앱 초기화

`App.tsx` 또는 `index.js`에서 AdMob 초기화:

```typescript
import mobileAds from 'react-native-google-mobile-ads';

// 앱 시작 시 초기화
mobileAds()
  .initialize()
  .then(adapterStatuses => {
    console.log('AdMob initialized:', adapterStatuses);
  });
```

### 5.2 배너 광고 컴포넌트

`src/components/AdBanner.tsx` 파일 생성 (이미 생성됨)

### 5.3 전면 광고 관리

`src/services/ads/AdService.ts` 파일 생성 (이미 생성됨)

## 6. 광고 단위 ID 설정

### 6.1 환경 변수 또는 설정 파일

`src/config/adConfig.ts` 파일에 광고 단위 ID를 저장:

```typescript
export const AD_UNIT_IDS = {
  // 테스트 광고 (개발 중)
  BANNER_TEST: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_TEST: 'ca-app-pub-3940256099942544/1033173712',
  
  // 실제 광고 (배포 시)
  BANNER: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // 배너 광고 ID
  INTERSTITIAL: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // 전면 광고 ID
};

// 개발 모드 여부
export const IS_DEV = __DEV__;
```

### 6.2 실제 광고 ID로 교체

배포 전에 `adConfig.ts`의 `BANNER`와 `INTERSTITIAL`을 AdMob에서 발급받은 실제 광고 단위 ID로 교체하세요.

## 7. 테스트

### 7.1 테스트 광고 확인

개발 중에는 테스트 광고가 표시되어야 합니다:
- 배너: "Test Ad" 또는 "Google" 로고
- 전면: "Test Ad" 메시지

### 7.2 실제 광고 테스트

1. AdMob 대시보드에서 **테스트 기기** 등록
2. 기기 ID 확인:
   - Android: 로그에서 `To get test ads on this device, set ...`
   - iOS: 로그에서 동일한 메시지 확인
3. AdMob 대시보드에 테스트 기기 추가

## 8. 배포 전 체크리스트

- [ ] AdMob 계정 생성 및 앱 등록 완료
- [ ] 실제 광고 단위 ID 생성 완료
- [ ] Android `AndroidManifest.xml`에 App ID 추가
- [ ] iOS `Info.plist`에 App ID 추가
- [ ] `adConfig.ts`에 실제 광고 단위 ID 설정
- [ ] 테스트 광고가 정상 작동하는지 확인
- [ ] 실제 광고가 정상 작동하는지 확인 (테스트 기기에서)
- [ ] AdMob 정책 준수 확인

## 9. 주의사항

### 9.1 광고 정책

- **과도한 광고 노출 금지**: 사용자 경험을 해치지 않도록 적절한 빈도 유지
- **콘텐츠 정책 준수**: AdMob 정책에 위배되는 콘텐츠 포함 시 계정 정지 가능
- **클릭 유도 금지**: "광고를 클릭하세요" 같은 메시지 금지

### 9.2 수익 최적화

- **광고 위치**: 사용자가 자연스럽게 볼 수 있는 위치
- **광고 빈도**: 너무 자주 노출하지 않도록 주의
- **광고 형식**: 배너와 전면 광고를 적절히 조합

### 9.3 성능

- 광고 로딩 실패 시 앱이 크래시되지 않도록 에러 처리 필수
- 광고 로딩이 앱 성능에 영향을 주지 않도록 비동기 처리

## 10. 문제 해결

### 광고가 표시되지 않음

1. AdMob App ID가 올바르게 설정되었는지 확인
2. 광고 단위 ID가 올바른지 확인
3. 네트워크 연결 확인
4. AdMob 계정이 활성화되어 있는지 확인
5. 로그에서 에러 메시지 확인

### Android 빌드 에러

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS 빌드 에러

```bash
cd ios
pod install
cd ..
npm run ios
```

## 11. 참고 자료

- [react-native-google-mobile-ads 문서](https://github.com/react-native-google-mobile-ads/react-native-google-mobile-ads)
- [Google AdMob 공식 문서](https://developers.google.com/admob)
- [AdMob 정책](https://support.google.com/admob/answer/6128543)
