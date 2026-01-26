# iOS 앱 배포 가이드

이 문서는 Apple Developer 계정이 있는 경우 iOS 앱을 배포하기 위한 전체 프로세스를 안내합니다.

## 현재 프로젝트 정보

- **Bundle ID**: `com.copvsrobbers`
- **앱 이름**: `Cop vs Robbers`
- **프로젝트 경로**: `ios/PoliceVsThieves.xcodeproj`

---

## 1단계: Apple Developer 센터에서 App ID 등록

### 1.1 Apple Developer 포털 접속

1. https://developer.apple.com/account 접속
2. Apple ID로 로그인

### 1.2 Certificates, Identifiers & Profiles 이동

1. 좌측 메뉴에서 **"Certificates, Identifiers & Profiles"** 클릭
2. **"Identifiers"** 섹션 클릭

### 1.3 App ID 생성

1. 좌측 상단의 **"+"** 버튼 클릭
2. **"App IDs"** 선택 후 **"Continue"** 클릭
3. **"App"** 선택 후 **"Continue"** 클릭

4. 다음 정보 입력:
   - **Description**: `Cop vs Robbers` (앱 설명)
   - **Bundle ID**: `Explicit` 선택 후 `com.copvsrobbers` 입력
   
5. **Capabilities** 선택 (필요한 기능들):
   - ✅ **Location Services** (위치 서비스)
   - ✅ **Camera** (카메라)
   - ✅ **Microphone** (마이크)
   - ✅ **Push Notifications** (푸시 알림, 필요시)
   - ✅ **Background Modes** → Location updates (필요시)

6. **"Continue"** 클릭 후 정보 확인
7. **"Register"** 클릭

---

## 2단계: App Store Connect에서 앱 등록

### 2.1 App Store Connect 접속

1. https://appstoreconnect.apple.com 접속
2. Apple ID로 로그인 (Developer 계정과 동일)

### 2.2 새 앱 추가

1. **"내 앱"** 클릭
2. 좌측 상단의 **"+"** 버튼 클릭
3. **"새 앱"** 선택

### 2.3 앱 정보 입력

1. **플랫폼**: iOS 체크
2. **이름**: `Cop vs Robbers` (앱 스토어에 표시될 이름)
3. **기본 언어**: 한국어 또는 영어
4. **Bundle ID**: 드롭다운에서 `com.copvsrobbers` 선택
   - 만약 목록에 없다면, 1단계에서 App ID를 먼저 생성해야 합니다
5. **SKU**: 고유 식별자 (예: `copvsrobbers-001`)
6. **사용자 액세스**: 
   - **전체 액세스**: 모든 팀 멤버가 접근 가능
   - **제한된 액세스**: 선택된 사용자만 접근

7. **"생성"** 클릭

### 2.4 앱 정보 설정

앱이 생성되면 다음 정보를 입력하세요:

#### 기본 정보
- **카테고리**: 게임 (또는 적절한 카테고리)
- **콘텐츠 권리**: 본인이 소유한 콘텐츠인지 확인

#### 가격 및 이용 가능 여부
- **가격**: 무료 또는 유료 선택
- **이용 가능 여부**: 모든 국가 또는 특정 국가 선택

---

## 3단계: Xcode 프로젝트 설정

### 3.1 프로젝트 열기

```bash
cd ios
open PoliceVsThieves.xcworkspace
```

**중요**: `.xcworkspace` 파일을 열어야 합니다 (`.xcodeproj` 아님)

### 3.2 Signing & Capabilities 설정

1. Xcode에서 프로젝트 네비게이터에서 **"PoliceVsThieves"** (최상위 프로젝트) 선택
2. **"TARGETS"**에서 **"PoliceVsThieves"** 선택
3. **"Signing & Capabilities"** 탭 클릭

4. **Automatically manage signing** 체크:
   - ✅ **"Automatically manage signing"** 체크박스 선택
   - **Team**: 드롭다운에서 Apple Developer 팀 선택
   
5. **Bundle Identifier** 확인:
   - `com.copvsrobbers`로 설정되어 있는지 확인

6. Xcode가 자동으로 다음을 생성/설정합니다:
   - Development Provisioning Profile
   - Distribution Provisioning Profile
   - 필요한 Certificates

### 3.3 Capabilities 확인

**"Signing & Capabilities"** 탭에서 다음 기능들이 있는지 확인:

- Location Services
- Background Modes (필요시)
- Push Notifications (필요시)

필요한 기능이 없으면 **"+ Capability"** 버튼으로 추가하세요.

### 3.4 버전 및 빌드 번호 확인

**"General"** 탭에서:
- **Version**: `1.0.0` (또는 적절한 버전)
- **Build**: `1` (각 빌드마다 증가)

---

## 4단계: Archive 빌드

### 4.1 시뮬레이터 해제

Xcode 상단의 디바이스 선택에서:
- **"Any iOS Device (arm64)"** 선택
- 시뮬레이터는 선택하지 마세요

### 4.2 Archive 생성

1. 메뉴에서 **Product** → **Scheme** → **PoliceVsThieves** 선택
2. 메뉴에서 **Product** → **Archive** 클릭
   - 또는 단축키: `Cmd + B` (빌드) → `Product` → `Archive`

3. 빌드가 완료되면 **Organizer** 창이 자동으로 열립니다
   - 안 열리면: **Window** → **Organizer** 클릭

### 4.3 Archive 확인

Organizer에서:
- 방금 생성된 Archive가 표시됩니다
- 날짜, 버전, 빌드 번호를 확인하세요

---

## 5단계: TestFlight 또는 App Store 배포

### 5.1 Archive에서 배포 시작

Organizer에서 Archive 선택 후 **"Distribute App"** 클릭

### 5.2 배포 방법 선택

#### 옵션 1: App Store Connect (TestFlight/App Store)
1. **"App Store Connect"** 선택 → **"Next"**
2. **"Upload"** 선택 (TestFlight이나 App Store에 업로드) → **"Next"**
3. 배포 옵션:
   - ✅ **"Include bitcode for iOS content"** (필요시)
   - ✅ **"Upload your app's symbols"** (크래시 리포트용, 권장)
4. **"Automatically manage signing"** 선택 → **"Next"**
5. 정보 확인 후 **"Upload"** 클릭

#### 옵션 2: Ad Hoc 배포 (등록된 디바이스에 직접 설치)
1. **"Ad Hoc"** 선택 → **"Next"**
2. **"Automatically manage signing"** 선택 → **"Next"**
3. 등록된 디바이스 목록 확인 → **"Next"**
4. **"Export"** 클릭 → IPA 파일 저장

#### 옵션 3: Development 배포
1. **"Development"** 선택 → **"Next"**
2. 개발용 프로비저닝 프로파일 사용 → **"Export"**

### 5.3 업로드 완료

- 업로드가 완료되면 몇 분 후 App Store Connect에서 확인 가능합니다
- **"내 앱"** → **"Cop vs Robbers"** → **"TestFlight"** 또는 **"App Store"** 탭에서 상태 확인

---

## 6단계: TestFlight 테스트 (선택사항)

### 6.1 TestFlight에서 빌드 확인

1. App Store Connect → **"내 앱"** → **"Cop vs Robbers"**
2. **"TestFlight"** 탭 클릭
3. 업로드된 빌드가 **"처리 중"** → **"테스트 준비 완료"** 상태로 변경될 때까지 대기 (10-30분 소요)

### 6.2 내부 테스터 추가

1. **"내부 테스트"** 섹션에서 **"+"** 클릭
2. **"그룹 생성"** 또는 기존 그룹 선택
3. 테스터 추가:
   - Apple ID로 추가
   - 또는 팀 멤버 추가

### 6.3 외부 테스터 추가 (Beta 앱 심사 필요)

1. **"외부 테스트"** 섹션에서 **"+"** 클릭
2. 테스터 그룹 생성
3. **"Beta 앱 심사 정보"** 입력:
   - 앱 설명
   - 연락처 정보
   - 액세스 방법 (필요시)

---

## 7단계: App Store 심사 제출 (최종 배포)

### 7.1 앱 정보 입력

1. App Store Connect → **"내 앱"** → **"Cop vs Robbers"** → **"App Store"** 탭
2. **"1.0 준비"** 클릭

3. 필수 정보 입력:
   - **스크린샷**: 다양한 디바이스 크기 (iPhone, iPad 등)
   - **앱 설명**: 앱의 기능과 특징
   - **키워드**: 검색에 사용될 키워드
   - **지원 URL**: 웹사이트 또는 지원 페이지
   - **마케팅 URL**: (선택사항)
   - **개인정보 처리방침 URL**: (필수, 위치 정보 사용시)

4. **"가격 및 이용 가능 여부"**:
   - 가격 설정
   - 출시 국가 선택

### 7.2 빌드 선택

1. **"빌드"** 섹션에서 **"+ 버전 또는 플랫폼 추가"** 클릭
2. TestFlight에 업로드된 빌드 선택
3. **"완료"** 클릭

### 7.3 심사 제출

1. 모든 필수 항목이 채워졌는지 확인
2. **"심사용으로 제출"** 클릭
3. Export Compliance 질문에 답변:
   - 암호화 사용 여부 등

### 7.4 심사 대기

- 일반적으로 24-48시간 소요
- 상태는 **"심사 중"** → **"승인됨"** 또는 **"거부됨"**
- 승인되면 자동으로 App Store에 출시 (또는 수동 출시 설정 가능)

---

## 트러블슈팅

### "No signing certificate found" 오류

**해결방법**:
1. Xcode → **Preferences** → **Accounts**
2. Apple ID 추가/확인
3. 팀 선택 후 **"Download Manual Profiles"** 클릭

### "Bundle identifier is not available" 오류

**해결방법**:
1. Apple Developer 포털에서 App ID가 제대로 등록되었는지 확인
2. Bundle ID가 정확히 일치하는지 확인 (`com.copvsrobbers`)

### Archive 버튼이 비활성화됨

**해결방법**:
1. 디바이스를 **"Any iOS Device (arm64)"**로 선택
2. 시뮬레이터가 선택되어 있지 않은지 확인

### "Invalid Bundle" 오류

**해결방법**:
1. Info.plist의 모든 권한 설명이 제대로 입력되어 있는지 확인
2. 아이콘 이미지가 모든 크기로 포함되어 있는지 확인
3. 최소 iOS 버전 요구사항 확인

---

## 빠른 참조 명령어

```bash
# Archive 빌드 (프로덕션)
npm run ios:archive

# Archive 빌드 (Stage)
npm run ios:archive:stage

# Xcode에서 프로젝트 열기
cd ios && open PoliceVsThieves.xcworkspace

# Pod 재설치 (필요시)
cd ios && pod install
```

---

## 체크리스트

배포 전 확인사항:

- [ ] Apple Developer 계정 활성화됨
- [ ] App ID 등록됨 (`com.copvsrobbers`)
- [ ] App Store Connect에 앱 생성됨
- [ ] Xcode에서 Signing & Capabilities 설정 완료
- [ ] Bundle ID가 `com.copvsrobbers`로 일치함
- [ ] 버전 번호 설정됨
- [ ] 모든 권한 설명이 Info.plist에 있음
- [ ] 아이콘 이미지 포함됨
- [ ] Archive 빌드 성공
- [ ] TestFlight 또는 App Store Connect 업로드 성공
