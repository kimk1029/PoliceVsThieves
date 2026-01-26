# 테스트 빌드 가이드

이 문서는 테스트 배포를 위한 빌드 방법을 안내합니다.

## Android 테스트 빌드

### Stage 서버용 빌드

#### APK 생성 (디바이스 직접 설치용)
```bash
# Debug APK
npm run android:stage:apk

# Release APK (최적화됨)
npm run android:stage:apk:release
```

생성된 APK 위치: `android/app/build/outputs/apk/release/app-release.apk`

#### AAB 생성 (Google Play 내부 테스트용)
```bash
npm run android:stage:aab
```

생성된 AAB 위치: `android/app/build/outputs/bundle/release/app-release.aab`

### 프로덕션용 빌드

#### APK 생성
```bash
npm run android:test:apk
```

#### AAB 생성 (Google Play 배포용)
```bash
npm run android:test:aab
```

### 주의사항

현재 Release 빌드는 debug keystore를 사용하고 있습니다. 실제 배포를 위해서는:

1. **릴리스용 keystore 생성**:
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release-key -keyalg RSA -keysize 2048 -validity 10000
```

2. **`android/gradle.properties`에 keystore 정보 추가** (git에 커밋하지 마세요):
```properties
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=release-key
MYAPP_RELEASE_STORE_PASSWORD=your-store-password
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

3. **`android/app/build.gradle`의 `signingConfigs` 수정**:
```gradle
signingConfigs {
    release {
        if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        // ...
    }
}
```

## iOS 테스트 빌드

### Stage 서버용 빌드

#### 시뮬레이터/디바이스 실행
```bash
npm run ios:stage
```

### Archive 빌드 (TestFlight/Ad Hoc 배포용)

#### 프로덕션 Archive
```bash
npm run ios:archive
```

#### Stage Archive
```bash
npm run ios:archive:stage
```

생성된 Archive 위치: `ios/build/PoliceVsThieves.xcarchive` (또는 `PoliceVsThievesStage.xcarchive`)

### IPA 생성 및 배포

Archive 생성 후:

1. **Xcode에서 Archive 열기**:
   - Xcode 실행 → Window → Organizer
   - 생성된 Archive 선택

2. **Distribute App**:
   - "Distribute App" 클릭
   - 배포 방법 선택:
     - **TestFlight**: App Store Connect를 통한 내부/외부 테스트
     - **Ad Hoc**: 등록된 디바이스에 직접 설치
     - **Development**: 개발용 (Xcode로 직접 설치)

3. **프로비저닝 프로파일 확인**:
   - Apple Developer 계정에서 App ID와 프로비저닝 프로파일이 설정되어 있어야 합니다
   - Bundle ID: `com.copvsrobbers`

### 주의사항

- Archive 빌드는 실제 디바이스나 TestFlight 배포를 위한 것입니다
- 시뮬레이터용 빌드는 `npm run ios:stage`를 사용하세요
- Archive 빌드 전에 `cd ios && pod install`을 실행하는 것을 권장합니다

## 빌드 전 체크리스트

- [ ] 모든 권한 설명이 `Info.plist`에 포함되어 있는지 확인
- [ ] API 서버 URL이 올바르게 설정되어 있는지 확인
- [ ] 네이버 지도 Client ID가 올바르게 설정되어 있는지 확인
- [ ] 버전 코드/버전 이름이 업데이트되었는지 확인
- [ ] iOS: 프로비저닝 프로파일이 유효한지 확인
- [ ] Android: keystore가 올바르게 설정되어 있는지 확인 (릴리스 빌드의 경우)
