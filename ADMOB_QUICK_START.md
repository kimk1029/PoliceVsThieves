# AdMob 빠른 시작 가이드

## 1. 패키지 설치

```bash
npm install react-native-google-mobile-ads

# iOS
cd ios
pod install
cd ..
```

## 2. AdMob 계정 설정

1. [Google AdMob](https://admob.google.com/) 접속
2. 앱 등록:
   - iOS: Bundle ID `com.copvsrobbers`
   - Android: Package `com.copvsrobbers`
3. 광고 단위 생성:
   - 배너 광고 1개
   - 전면 광고 1개
4. App ID 및 광고 단위 ID 복사

## 3. 설정 파일 업데이트

### Android: `android/app/src/main/AndroidManifest.xml`

`<application>` 태그 내에 주석 해제 및 App ID 입력:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-실제AppID~여기"/>
```

### iOS: `ios/PoliceVsThieves/Info.plist`

주석 해제 및 App ID 입력:

```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-실제AppID~여기</string>
```

### 광고 단위 ID: `src/config/adConfig.ts`

실제 광고 단위 ID로 교체:

```typescript
BANNER: 'ca-app-pub-실제배너광고ID',
INTERSTITIAL: 'ca-app-pub-실제전면광고ID',
```

## 4. 테스트

개발 중에는 자동으로 테스트 광고가 표시됩니다.

## 5. 배포

모든 실제 ID로 교체 후 빌드 및 배포하세요.

자세한 내용은 `ADMOB_SETUP_GUIDE.md`를 참고하세요.
