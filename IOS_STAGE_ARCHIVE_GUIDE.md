# iOS Stage 환경 Archive 가이드

이 문서는 Xcode에서 Stage 환경변수를 포함한 Archive 빌드를 만드는 방법을 안내합니다.

## 현재 설정 확인

✅ Stage 빌드 구성이 이미 설정되어 있습니다:
- **PNT_API_BASE_URL**: `http://kimk1029.synology.me:9991`
- **PNT_STAGE**: `true`
- **Bundle ID**: `com.copvsrobbers`

## 방법 1: Xcode에서 Archive (권장)

### 1단계: Xcode에서 프로젝트 열기

```bash
cd ios
open PoliceVsThieves.xcworkspace
```

**중요**: `.xcworkspace` 파일을 열어야 합니다 (`.xcodeproj` 아님)

### 2단계: Scheme 선택

1. Xcode 상단 툴바에서 **Scheme** 선택 버튼 클릭 (현재 "PoliceVsThieves" 옆)
2. 드롭다운에서 **"PoliceVsThievesStage"** 선택

### 3단계: 디바이스 선택

1. Scheme 옆의 디바이스 선택 버튼 클릭
2. **"Any iOS Device (arm64)"** 선택
   - 시뮬레이터는 선택하지 마세요 (Archive는 실제 디바이스용만 가능)

### 4단계: Archive 생성

1. 메뉴에서 **Product** → **Archive** 클릭
   - 또는 단축키: `Cmd + B` (빌드) → 완료 후 `Product` → `Archive`

2. 빌드가 완료되면 **Organizer** 창이 자동으로 열립니다

### 5단계: Archive 확인

Organizer에서:
- 방금 생성된 Archive가 표시됩니다
- **"Distribute App"** 버튼 클릭
- **"App Store Connect"** 선택 → **"Next"**
- **"Upload"** 선택 → **"Next"**

### 6단계: 업로드 완료

업로드가 완료되면 몇 분 후 App Store Connect에서 Stage 환경으로 빌드된 앱을 확인할 수 있습니다.

---

## 방법 2: 명령줄에서 Archive (터미널)

### Archive 생성

```bash
cd ios
xcodebuild -workspace PoliceVsThieves.xcworkspace \
  -scheme PoliceVsThievesStage \
  -configuration Stage \
  -archivePath ./build/PoliceVsThievesStage.xcarchive \
  archive
```

또는 package.json에 있는 스크립트 사용:

```bash
npm run ios:archive:stage
```

### Archive 위치

생성된 Archive는 다음 위치에 저장됩니다:
- `ios/build/PoliceVsThievesStage.xcarchive`

### Archive에서 IPA 생성 (선택사항)

```bash
cd ios
xcodebuild -exportArchive \
  -archivePath ./build/PoliceVsThievesStage.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath ./build/export
```

**주의**: `ExportOptions.plist` 파일이 필요합니다 (아래 참고)

---

## 방법 3: ExportOptions.plist 사용 (자동화)

### ExportOptions.plist 생성

`ios/ExportOptions.plist` 파일 생성:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>J3WDZD39C4</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
```

### Archive 및 업로드 자동화 스크립트

`ios/archive-stage.sh` 파일 생성:

```bash
#!/bin/bash

set -e

echo "Building Stage Archive..."

# Clean build folder
rm -rf build

# Archive
xcodebuild -workspace PoliceVsThieves.xcworkspace \
  -scheme PoliceVsThievesStage \
  -configuration Stage \
  -archivePath ./build/PoliceVsThievesStage.xcarchive \
  archive

echo "Archive created at: ./build/PoliceVsThievesStage.xcarchive"
echo ""
echo "To upload to App Store Connect, use Xcode Organizer:"
echo "1. Open Xcode"
echo "2. Window → Organizer"
echo "3. Select the archive and click 'Distribute App'"
```

실행:

```bash
chmod +x ios/archive-stage.sh
./ios/archive-stage.sh
```

---

## Stage 환경 확인 방법

### Archive 빌드 확인

Archive 생성 후 환경변수가 포함되었는지 확인:

1. **Xcode Organizer**에서 Archive 선택
2. **"Distribute App"** → **"Export"** 선택
3. Export된 앱의 `Info.plist` 확인:
   - `PNT_API_BASE_URL` = `http://kimk1029.synology.me:9991`
   - `PNT_STAGE` = `true`

### 런타임 확인

앱 실행 후 로그 확인:

```bash
# iOS 시뮬레이터/디바이스 로그 확인
xcrun simctl spawn booted log stream --predicate 'process == "PoliceVsThieves"' --level debug
```

로그에서 다음 메시지 확인:
```
[AppConfig] PNT_API_BASE_URL=http://kimk1029.synology.me:9991 PNT_STAGE=true
```

---

## 체크리스트

Archive 전 확인사항:

- [ ] Xcode에서 Scheme이 **"PoliceVsThievesStage"**로 선택되어 있는지 확인
- [ ] 디바이스가 **"Any iOS Device (arm64)"**로 선택되어 있는지 확인
- [ ] 시뮬레이터가 선택되어 있지 않은지 확인
- [ ] Signing & Capabilities 설정 확인 (Team 선택됨)
- [ ] Bundle ID가 `com.copvsrobbers`로 설정되어 있는지 확인

---

## 주의사항

### Archive 시 반드시 확인할 것:

1. **Scheme 선택**: 반드시 **"PoliceVsThievesStage"** 선택
   - 기본 "PoliceVsThieves" 스킴을 사용하면 Stage 환경변수가 포함되지 않습니다

2. **디바이스 선택**: **"Any iOS Device (arm64)"** 선택
   - 시뮬레이터는 Archive할 수 없습니다

3. **Build Configuration**: Archive 시 자동으로 "Stage" 구성 사용
   - Scheme 설정에서 확인 가능

### 자주 발생하는 실수:

❌ **잘못된 방법**: 기본 "PoliceVsThieves" 스킴 사용
- Stage 환경변수가 포함되지 않음

❌ **잘못된 방법**: 시뮬레이터 선택
- Archive 버튼이 비활성화됨

✅ **올바른 방법**: "PoliceVsThievesStage" 스킴 + "Any iOS Device" 선택

---

## 빠른 참조

### Xcode에서:
1. Scheme → **PoliceVsThievesStage** 선택
2. 디바이스 → **Any iOS Device (arm64)** 선택
3. Product → **Archive**

### 명령줄에서:
```bash
npm run ios:archive:stage
```

또는:
```bash
cd ios && xcodebuild -workspace PoliceVsThieves.xcworkspace -scheme PoliceVsThievesStage -configuration Stage -archivePath ./build/PoliceVsThievesStage.xcarchive archive
```
