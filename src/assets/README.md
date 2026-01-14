# Assets

이 폴더는 **앱 코드(JS/TS)에서 import해서 사용하는 정적 자산**을 모아두는 곳입니다.

## 폴더 구조

- `src/assets/images/` : 화면/컴포넌트에서 쓰는 이미지 (png/jpg/webp/svg 등)
- `src/assets/icons/`  : 아이콘 리소스
- `src/assets/fonts/`  : 커스텀 폰트 파일
- `src/assets/sounds/` : 효과음/사운드 파일

## 사용 예시

```ts
// 예: src/assets/images/logo.png
const logo = require('../assets/images/logo.png');
```

> 참고: Android 런처 아이콘/스플래시처럼 네이티브 리소스는 `android/app/src/main/res/` 쪽을 사용합니다.

