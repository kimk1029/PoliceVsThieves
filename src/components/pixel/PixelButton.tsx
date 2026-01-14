import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';

interface PixelButtonProps {
  onPress: () => void;
  text: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  onPress,
  text,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  // 🎨 테마 색상 (Neon Cyberpunk + Gameboy 3D Style)
  const getTheme = () => {
    if (disabled) {
      return {
        face: '#AAAAAA',
        highlight: '#CCCCCC',
        depth: '#555555',
        border: '#222222',
        text: '#666666',
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          face: '#EEEEEE',
          highlight: '#FFFFFF',
          depth: '#888888',
          border: '#000000',
          text: '#000000',
        };
      case 'danger':
        return {
          face: '#FF0055',
          highlight: '#FF4488',
          depth: '#990033',
          border: '#330011',
          text: '#FFFFFF',
        };
      case 'success':
        return {
          face: '#00AAFF',
          highlight: '#44CCFF',
          depth: '#005599',
          border: '#002244',
          text: '#FFFFFF',
        };
      case 'primary':
      default:
        return {
          face: '#222222',
          highlight: '#444444',
          depth: '#000000',
          border: '#000000',
          text: '#FFFFFF',
        };
    }
  };

  const theme = getTheme();

  // 📏 사이즈 설정 (요청: 버튼 크기 줄임, 입체감은 유지)
  const getSize = () => {
    switch (size) {
      case 'small': 
        return { 
          height: 36, // 48 -> 36
          fontSize: 12, // 14 -> 12
          borderWidth: 2, // 3 -> 2
          depth: 4, // 6 -> 4
        };
      case 'large': 
        // 하단 EXIT, START 버튼용 (40% 축소 요청)
        return { 
          height: 48, // 80 -> 48
          fontSize: 16, // 28 -> 16
          borderWidth: 3, // 6 -> 3
          depth: 6, // 14 -> 6 (부담스럽지 않은 깊이)
        };
      default: // medium
        return { 
          height: 44, // 64 -> 44
          fontSize: 14, // 20 -> 14
          borderWidth: 2, // 4 -> 2
          depth: 5, // 10 -> 5
        };
    }
  };

  const { height, fontSize, borderWidth, depth } = getSize();

  // 눌렸을 때의 이동 거리
  const translateY = isPressed ? depth : 0;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => !disabled && setIsPressed(true)}
      onPressOut={() => !disabled && setIsPressed(false)}
      disabled={disabled}
      style={[
        styles.container, 
        style, 
        { height: height + depth }
      ]}
    >
      {/* 🌑 1. 그림자 (고정) */}
      <View
        style={[
          styles.layer,
          {
            backgroundColor: theme.depth,
            borderColor: theme.border,
            borderWidth: borderWidth,
            borderRadius: 6,
            top: depth,
            height: height,
          },
        ]}
      />

      {/* 🌕 2. 버튼 윗면 (이동) */}
      <View
        style={[
          styles.layer,
          {
            backgroundColor: theme.face,
            borderColor: theme.border,
            borderWidth: borderWidth,
            borderRadius: 6,
            height: height,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* ✨ 3. 상단 하이라이트 */}
        {!disabled && (
          <View
            style={{
              position: 'absolute',
              top: borderWidth,
              left: borderWidth,
              right: borderWidth,
              height: borderWidth * 1.5,
              backgroundColor: theme.highlight,
              opacity: 0.5,
              borderRadius: 4,
            }}
          />
        )}
        
        {/* 텍스트 */}
        <View style={styles.contentContainer}>
          <Text
            style={[
              styles.text,
              {
                color: theme.text,
                fontSize: fontSize,
                textShadowColor: 'rgba(0,0,0,0.3)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 0,
              },
              textStyle,
            ]}
          >
            {text}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    marginVertical: 4, // 간격도 줄임
  },
  layer: {
    width: '100%',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
