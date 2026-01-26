# Beta App 심사 정보 (TestFlight 외부 테스트용)

이 문서는 App Store Connect의 Beta 앱 심사 정보 폼 작성을 위한 내용입니다.

---

## 1. 테스트 정보 (Test Information)

### 베타 앱 설명 (Beta App Description)

**한국어 버전:**

```
Cop vs Robbers는 실제 위치를 기반으로 한 실시간 멀티플레이어 게임입니다.

🎮 게임 개요
경찰 팀과 도둑 팀으로 나뉘어 진행되는 위치 기반 추격 게임입니다. 도둑 팀은 숨는 시간 동안 지도를 보지 못하며, 경찰 팀은 도둑을 찾아야 합니다. 

📍 주요 기능
• 실시간 위치 추적 및 지도 표시
• QR 코드를 통한 빠른 방 참여
• WebRTC 기반 음성 통신 (팀 무전)
• 숨기기 시간, 추격 시간 등 게임 설정 커스터마이징
• 실시간 승리/패배 조건 체크
• 게임 통계 및 MVP 시스템

🎯 게임 플레이
1. 방 만들기 또는 QR 코드로 참여
2. 경찰 또는 도둑 팀에 배정
3. 도둑 팀: 숨는 시간 동안 위치 확인 불가, 본거지 설정 필요
4. 경찰 팀: 지도에서 도둑의 위치를 확인하며 추격
5. 승리 조건 달성 시 게임 종료 및 결과 확인

⚠️ 테스트 시 주의사항
• 위치 권한이 필수적으로 필요합니다
• 카메라 권한은 QR 코드 스캔 시에만 사용됩니다
• 마이크 권한은 음성 통신 시 사용됩니다
• 실제 위치에서 게임을 진행하는 것을 권장합니다
• GPS 신호가 약한 실내에서는 위치 정확도가 떨어질 수 있습니다

📱 지원 기능
• iOS 15.0 이상
• 실시간 멀티플레이어 (최대 10명)
• 오프라인 모드는 지원하지 않습니다 (인터넷 연결 필수)

🔧 알려진 제한사항
• 시뮬레이터에서는 위치 기능이 제한적일 수 있습니다
• 초기 로딩 시 지도 표시가 약간 지연될 수 있습니다
• 일부 구형 기기에서는 성능이 저하될 수 있습니다

테스트해 주셔서 감사합니다! 피드백은 언제든 환영합니다.
```

**영어 버전 (대안):**

```
Cop vs Robbers is a real-time multiplayer location-based game.

🎮 Game Overview
A location-based chase game divided into Police and Thief teams. Thieves cannot see the map during the hiding phase, while Police must find and capture them.

📍 Key Features
• Real-time location tracking and map display
• Quick room joining via QR code
• WebRTC-based voice communication (team radio)
• Customizable game settings (hiding time, chase duration, etc.)
• Real-time win/loss condition checking
• Game statistics and MVP system

🎯 How to Play
1. Create a room or join via QR code
2. Get assigned to Police or Thief team
3. Thieves: Cannot see location during hiding phase, must set basecamp
4. Police: Track thieves on map and chase them
5. Game ends when win condition is met, view results

⚠️ Testing Notes
• Location permission is required
• Camera permission is only used for QR code scanning
• Microphone permission is used for voice communication
• Recommended to play in real-world locations
• GPS accuracy may be reduced indoors

📱 Requirements
• iOS 15.0 or later
• Real-time multiplayer (up to 10 players)
• Internet connection required (no offline mode)

🔧 Known Limitations
• Location features may be limited on simulators
• Map display may have slight delay on initial load
• Performance may be reduced on older devices

Thank you for testing! We welcome your feedback.
```

### 피드백 이메일 (Feedback Email)

```
[당신의 이메일 주소]
```

예시: `support@yourdomain.com` 또는 `feedback@yourdomain.com`

---

## 2. 연락처 정보 (Contact Information)

다음 정보를 실제 정보로 채워주세요:

### 성 (Last Name)
```
[성 입력]
```

### 이름 (First Name)
```
[이름 입력]
```

### 전화번호 (Phone Number)
```
[전화번호 입력]
```
예시: `+82-10-1234-5678` (국제 형식 권장)

### 이메일 주소 (Email Address)
```
[이메일 주소 입력]
```
예시: `contact@yourdomain.com`

---

## 3. 로그인 정보 (Login Information)

앱에 로그인 기능이 있는 경우:

### 로그인 필요 (Login Required)
✅ **체크됨** (이미 선택되어 있음)

### 사용자 이름 (Username)
```
[테스트 계정 사용자 이름]
```
예시: `testuser` 또는 `beta_tester`

### 암호 (Password)
```
[테스트 계정 비밀번호]
```
예시: `TestPassword123!`

---

## 주의사항

1. **베타 앱 설명**: 위의 한국어 버전을 복사해서 사용하거나, 필요에 따라 수정하여 사용하세요.
2. **이메일 및 연락처**: 실제 연락 가능한 정보를 입력하세요. Apple 심사 담당자가 연락할 수 있습니다.
3. **로그인 정보**: 
   - 앱에 로그인 기능이 없다면 "로그인 필요" 체크박스를 해제하세요.
   - 로그인 기능이 있다면 심사 담당자가 앱을 테스트할 수 있도록 테스트 계정을 제공해야 합니다.
   - 프로덕션 계정이 아닌 별도의 테스트 계정을 사용하는 것을 권장합니다.

---

## 추가 권장사항

### 테스트 계정 생성 시:
- 간단한 사용자 이름과 비밀번호 사용
- 테스트 데이터가 포함된 계정 생성
- 명확한 역할/기능 테스트가 가능한 계정 설정

### 베타 앱 설명 작성 시:
- 앱의 핵심 기능을 명확하게 설명
- 테스트에 필요한 권한 및 설정 안내
- 알려진 이슈나 제한사항 공개
- 테스터가 쉽게 이해할 수 있는 언어 사용
