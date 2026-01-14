import React from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle } from 'react-native';

interface PixelCardProps {
  children: React.ReactNode;
  title?: string; // 카드 상단 검은띠 제목
  style?: ViewStyle;
}

export const PixelCard: React.FC<PixelCardProps> = ({ children, title, style }) => {
  return (
    <View style={[styles.container, style]}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.headerText}>{title}</Text>
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2, // 4 -> 2 (이전 스타일 복귀)
    borderColor: '#000000',
    // 그림자 효과도 줄임
    borderBottomWidth: 4, // 8 -> 4
    borderRightWidth: 4, // 8 -> 4
    marginBottom: 16,
    paddingBottom: 12,
  },
  header: {
    backgroundColor: '#000000',
    paddingVertical: 6, // 8 -> 6
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  headerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    letterSpacing: 1,
  },
  content: {
    padding: 12, // 16 -> 12
  },
});
