#!/bin/bash
# Android 앱 아이콘 업데이트 스크립트
# icon.png를 여백 없이 꽉 차게 리사이즈해서 모든 mipmap 폴더에 복사

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICON_SOURCE="$SCRIPT_DIR/src/assets/icons/icon.png"
RES_DIR="$SCRIPT_DIR/android/app/src/main/res"

# ImageMagick 확인
if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick이 설치되어 있지 않습니다."
    echo "   설치 방법:"
    echo "   - Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "   - macOS: brew install imagemagick"
    echo "   - Windows: https://imagemagick.org/script/download.php"
    exit 1
fi

CONVERT_CMD=""
if command -v magick &> /dev/null; then
    CONVERT_CMD="magick"
elif command -v convert &> /dev/null; then
    CONVERT_CMD="convert"
fi

# 원본 이미지 확인
if [ ! -f "$ICON_SOURCE" ]; then
    echo "❌ 아이콘 파일을 찾을 수 없습니다: $ICON_SOURCE"
    exit 1
fi

echo "🔄 아이콘 업데이트 시작..."
echo "   원본: $ICON_SOURCE"

# mipmap 해상도별 크기 정의
declare -A SIZES=(
    ["mipmap-mdpi"]="48"
    ["mipmap-hdpi"]="72"
    ["mipmap-xhdpi"]="96"
    ["mipmap-xxhdpi"]="144"
    ["mipmap-xxxhdpi"]="192"
)

# 각 mipmap 폴더에 아이콘 생성
for MIPMAP in "${!SIZES[@]}"; do
    SIZE="${SIZES[$MIPMAP]}"
    MIPMAP_DIR="$RES_DIR/$MIPMAP"
    
    if [ ! -d "$MIPMAP_DIR" ]; then
        echo "⚠️  폴더가 없습니다: $MIPMAP_DIR (건너뜀)"
        continue
    fi
    
    echo "   → $MIPMAP (${SIZE}x${SIZE})"
    
    # 여백 제거 후 정사각형으로 꽉 차게 리사이즈
    # -trim: 여백 제거
    # +repage: 캔버스 크기 조정
    # -resize ${SIZE}x${SIZE}^: 비율 유지하며 크기 조정 (^는 최소 크기 보장)
    # -gravity center: 중앙 정렬
    # -extent ${SIZE}x${SIZE}: 정사각형으로 확장 (잘려도 괜찮음)
    # -background transparent: 배경 투명 (하지만 여백이 없으므로 의미 없음)
    
    # ic_launcher.png 생성
    $CONVERT_CMD "$ICON_SOURCE" \
        -trim +repage \
        -resize "${SIZE}x${SIZE}^" \
        -gravity center \
        -extent "${SIZE}x${SIZE}" \
        -background white \
        -alpha remove \
        "$MIPMAP_DIR/ic_launcher.png"
    
    # ic_launcher_round.png 생성 (동일한 이미지)
    cp "$MIPMAP_DIR/ic_launcher.png" "$MIPMAP_DIR/ic_launcher_round.png"
done

echo "✅ 아이콘 업데이트 완료!"
echo ""
echo "📱 다음 단계:"
echo "   1. 앱을 다시 빌드하세요: cd android && ./gradlew clean && ./gradlew assembleDebug"
echo "   2. 또는 Android Studio에서 Rebuild Project"
