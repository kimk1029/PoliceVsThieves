# iOS 시뮬레이터 Stage 환경 빌드 가이드

이 문서는 iOS 시뮬레이터에서 Stage 환경변수를 포함한 빌드를 만드는 방법을 안내합니다.

## 빠른 시작

### 가장 간단한 방법 (권장)

```bash
npm run ios:stage
```

이 명령어는:
- Stage 환경변수 (`PNT_API_BASE_URL`, `PNT_STAGE`)를 포함합니다
- 기본 시뮬레이터에 자동으로 빌드하고 실행합니다
- Metro bundler를 자동으로 시작합니다

### 이전 빌드 정리 후 빌드

```bash
npm run ios:stage:clean
```

이 명령어는:
- 기존 앱을 시뮬레이터에서 제거합니다
- Pod 의존성을 재설치합니다
- Stage 환경으로 빌드하고 실행합니다

---

## 방법 1: React Native CLI 사용 (권장)

### 기본 명령어

```bash
# Stage 환경으로 빌드 및 실행
npm run ios:stage
```

또는 직접:

```bash
react-native run-ios --scheme PoliceVsThievesStage --mode Stage
```

### 특정 시뮬레이터 지정

#### 사용 가능한 시뮬레이터 목록 확인

```bash
xcrun simctl list devices available
```

또는:

```bash
xcrun simctl list devices | grep -i "iphone"
```

#### 특정 시뮬레이터로 빌드

```bash
# iPhone 15 Pro로 빌드
react-native run-ios \
  --scheme PoliceVsThievesStage \
  --mode Stage \
  --simulator "iPhone 15 Pro"

# iPhone 14로 빌드
react-native run-ios \
  --scheme PoliceVsThievesStage \
  --mode Stage \
  --simulator "iPhone 14"

# 특정 UDID로 빌드
react-native run-ios \
  --scheme PoliceVsThievesStage \
  --mode Stage \
  --udid "ABC12345-6789-ABCD-EF01-23456789ABCD"
```

### 시뮬레이터만 빌드 (실행하지 않음)

```bash
react-native run-ios \
  --scheme PoliceVsThievesStage \
  --mode Stage \
  --no-packager \
  --simulator "iPhone 15 Pro"
```

---

## 방법 2: xcodebuild 직접 사용

### 기본 빌드

```bash
cd ios

xcodebuild -workspace PoliceVsThieves.xcworkspace \
  -scheme PoliceVsThievesStage \
  -configuration Stage \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  build
```

### 특정 시뮬레이터 지정

```bash
cd ios

# iPhone 15 Pro
xcodebuild -workspace PoliceVsThieves.xcworkspace \
  -scheme PoliceVsThievesStage \
  -configuration Stage \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  build

# iPhone 14
xcodebuild -workspace PoliceVsThieves.xcworkspace \
  -scheme PoliceVsThievesStage \
  -configuration Stage \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 14' \
  build

# 특정 iOS 버전
xcodebuild -workspace PoliceVsThieves.xcworkspace \
  -scheme PoliceVsThievesStage \
  -configuration Stage \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.0' \
  build
```

### 빌드 후 앱 설치 및 실행

```bash
cd ios

# 1. 빌드
xcodebuild -workspace PoliceVsThieves.xcworkspace \
  -scheme PoliceVsThievesStage \
  -configuration Stage \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  build

# 2. 시뮬레이터 부팅 (이미 실행 중이면 생략)
xcrun simctl boot "iPhone 15 Pro"

# 3. 앱 설치
xcrun simctl install booted \
  build/Build/Products/Stage-iphonesimulator/PoliceVsThieves.app

# 4. 앱 실행
xcrun simctl launch booted com.copvsrobbers
```

---

## 방법 3: Xcode에서 직접 빌드

### 1단계: Xcode에서 프로젝트 열기

```bash
cd ios
open PoliceVsThieves.xcworkspace
```

**중요**: `.xcworkspace` 파일을 열어야 합니다

### 2단계: Scheme 선택

1. Xcode 상단 툴바에서 **Scheme** 선택 버튼 클릭
2. 드롭다운에서 **"PoliceVsThievesStage"** 선택

### 3단계: 시뮬레이터 선택

1. Scheme 옆의 디바이스 선택 버튼 클릭
2. 원하는 시뮬레이터 선택 (예: "iPhone 15 Pro")

### 4단계: 빌드 및 실행

1. **Product** → **Run** 클릭 (또는 `Cmd + R`)
2. 빌드가 완료되면 시뮬레이터가 자동으로 실행됩니다

---

## Stage 환경변수 확인

### 빌드 시 확인

빌드 로그에서 다음을 확인할 수 있습니다:

```
PNT_API_BASE_URL=http://kimk1029.synology.me:9991
PNT_STAGE=true
```

### 런타임 확인

앱 실행 후 로그 확인:

```bash
# 시뮬레이터 로그 스트림
xcrun simctl spawn booted log stream \
  --predicate 'process == "PoliceVsThieves"' \
  --level debug
```

또는 Xcode에서:
1. **View** → **Debug Area** → **Show Debug Area**
2. 콘솔에서 `[AppConfig]` 로그 확인

예상 로그:
```
[AppConfig] PNT_API_BASE_URL=http://kimk1029.synology.me:9991 PNT_STAGE=true
```

---

## 유용한 명령어 모음

### 시뮬레이터 관리

```bash
# 사용 가능한 시뮬레이터 목록
xcrun simctl list devices available

# 시뮬레이터 부팅
xcrun simctl boot "iPhone 15 Pro"

# 시뮬레이터 종료
xcrun simctl shutdown "iPhone 15 Pro"

# 모든 시뮬레이터 종료
xcrun simctl shutdown all

# 시뮬레이터 재부팅
xcrun simctl reboot "iPhone 15 Pro"

# 시뮬레이터 열기 (GUI)
open -a Simulator
```

### 앱 관리

```bash
# 시뮬레이터에 설치된 앱 목록
xcrun simctl listapps booted | grep -i "copvsrobbers"

# 앱 제거
xcrun simctl uninstall booted com.copvsrobbers

# 앱 재설치
xcrun simctl install booted \
  build/Build/Products/Stage-iphonesimulator/PoliceVsThieves.app

# 앱 실행
xcrun simctl launch booted com.copvsrobbers

# 앱 종료
xcrun simctl terminate booted com.copvsrobbers
```

### 빌드 정리

```bash
# Xcode 빌드 폴더 정리
cd ios
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData/PoliceVsThieves-*

# Pod 재설치
pod install

# Metro bundler 캐시 정리
npm start -- --reset-cache
```

---

## package.json 스크립트 추가 (선택사항)

더 편리한 사용을 위해 다음 스크립트를 추가할 수 있습니다:

```json
{
  "scripts": {
    "ios:stage": "react-native run-ios --scheme PoliceVsThievesStage --mode Stage",
    "ios:stage:clean": "xcrun simctl uninstall booted com.copvsrobbers 2>/dev/null || true && cd ios && pod install && cd .. && react-native run-ios --scheme PoliceVsThievesStage --mode Stage",
    "ios:stage:iphone15": "react-native run-ios --scheme PoliceVsThievesStage --mode Stage --simulator 'iPhone 15 Pro'",
    "ios:stage:iphone14": "react-native run-ios --scheme PoliceVsThievesStage --mode Stage --simulator 'iPhone 14'",
    "ios:stage:build-only": "cd ios && xcodebuild -workspace PoliceVsThieves.xcworkspace -scheme PoliceVsThievesStage -configuration Stage -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15 Pro' build"
  }
}
```

사용 예:

```bash
# iPhone 15 Pro로 빌드
npm run ios:stage:iphone15

# 빌드만 (실행하지 않음)
npm run ios:stage:build-only
```

---

## 문제 해결

### 시뮬레이터를 찾을 수 없음

```bash
# 시뮬레이터 목록 확인
xcrun simctl list devices

# 시뮬레이터 이름이 정확한지 확인 (대소문자 구분)
# 예: "iPhone 15 Pro" (정확한 이름 사용)
```

### 빌드 실패: Scheme을 찾을 수 없음

```bash
# Scheme이 올바르게 설정되어 있는지 확인
cd ios
xcodebuild -workspace PoliceVsThieves.xcworkspace -list

# 출력에서 "PoliceVsThievesStage" 스킴이 있는지 확인
```

### Pod 의존성 문제

```bash
cd ios
pod install
cd ..
npm run ios:stage
```

### Metro bundler 연결 실패

```bash
# Metro bundler 수동 시작
npm start

# 다른 터미널에서
npm run ios:stage
```

### Stage 환경변수가 적용되지 않음

1. Scheme이 **"PoliceVsThievesStage"**인지 확인
2. Build Configuration이 **"Stage"**인지 확인
3. Xcode에서 확인:
   - Scheme 선택 → **Edit Scheme**
   - **Run** → **Build Configuration** → **Stage** 선택

---

## 체크리스트

빌드 전 확인사항:

- [ ] Scheme이 **"PoliceVsThievesStage"**로 선택되어 있는지 확인
- [ ] 시뮬레이터가 설치되어 있는지 확인 (`xcrun simctl list devices`)
- [ ] Pod 의존성이 최신인지 확인 (`cd ios && pod install`)
- [ ] Metro bundler가 실행 중인지 확인 (또는 `npm start` 실행)
- [ ] Stage 환경변수가 올바르게 설정되어 있는지 확인

---

## 빠른 참조

### 가장 자주 사용하는 명령어

```bash
# 기본 Stage 빌드
npm run ios:stage

# 정리 후 빌드
npm run ios:stage:clean

# 특정 시뮬레이터로 빌드
react-native run-ios --scheme PoliceVsThievesStage --mode Stage --simulator "iPhone 15 Pro"
```

### 현재 Stage 환경 설정

- **PNT_API_BASE_URL**: `http://kimk1029.synology.me:9991`
- **PNT_STAGE**: `true`
- **Bundle ID**: `com.copvsrobbers`
