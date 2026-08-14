#!/usr/bin/env bash
# WSL/React Native: gradlew clean은 codegen 디렉터리를 지운 뒤 CMake가 재구성되면서
# codegen JNI 경로가 없어 실패할 수 있음. 대신 build/.cxx만 삭제하고 bundleRelease 로 빌드합니다.
#
# 사용 예:
#   ./clean-build.sh                         → bundleRelease (기본, 버전 자동 증가)
#   ./clean-build.sh assembleRelease         → 릴리즈 APK (버전 변경 없음)
#   ./clean-build.sh stage assembleRelease   → Stage 환경으로 릴리즈 APK
#   ./clean-build.sh stage                   → Stage 환경으로 bundleRelease (버전 자동 증가)
set -e
cd "$(dirname "$0")"

STAGE_OPTS=()
if [[ "${1:-}" == "stage" || "${1:-}" == "--stage" ]]; then
  STAGE_OPTS=(-PPNT_STAGE=true -PPNT_API_BASE_URL=http://kimk1029.synology.me:9991)
  shift
fi

BUILD_TASK="${1:-bundleRelease}"

# bundleRelease 실행 시 versionCode/versionName 자동 증가
BUILD_GRADLE="app/build.gradle"
if [[ "$BUILD_TASK" == "bundleRelease" ]]; then
  # 현재 버전 읽기
  CURRENT_CODE=$(grep -oP '(?<=versionCode )\d+' "$BUILD_GRADLE")
  CURRENT_NAME=$(grep -oP '(?<=versionName ")[^"]+' "$BUILD_GRADLE")

  # versionCode +1
  NEW_CODE=$((CURRENT_CODE + 1))

  # versionName 패치 버전 +1 (예: 1.0.3 → 1.0.4)
  IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "$CURRENT_NAME"
  NEW_PATCH=$((V_PATCH + 1))
  NEW_NAME="${V_MAJOR}.${V_MINOR}.${NEW_PATCH}"

  # build.gradle 업데이트
  sed -i "s/versionCode ${CURRENT_CODE}/versionCode ${NEW_CODE}/" "$BUILD_GRADLE"
  sed -i "s/versionName \"${CURRENT_NAME}\"/versionName \"${NEW_NAME}\"/" "$BUILD_GRADLE"

  echo "[clean-build] Version bump: ${CURRENT_CODE} → ${NEW_CODE} / \"${CURRENT_NAME}\" → \"${NEW_NAME}\""
fi

echo "[clean-build] Removing build artifacts..."
rm -rf app/build build app/.cxx
echo "[clean-build] Running Gradle build (codegen will run automatically)..."
if [[ ${#STAGE_OPTS[@]} -gt 0 ]]; then
  echo "[clean-build] Environment: STAGE (PNT_API_BASE_URL=${STAGE_OPTS[1]#*=})"
fi
./gradlew "${STAGE_OPTS[@]}" "${@:-bundleRelease}" --no-daemon
echo "[clean-build] Done."
