import React from 'react';
import { TextInput, StyleSheet, Platform, TextInputProps, View, Text } from 'react-native';

interface PixelInputProps extends TextInputProps {
  label?: string;
}

export const PixelInput: React.FC<PixelInputProps> = ({ label, style, ...props }) => {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor="#999"
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    width: '100%',
  },
  label: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 2, // 4 -> 2 (이전 스타일 복귀)
    borderColor: '#000',
    // 입체감 (오목하게 들어간 느낌) - 이전 스타일 유지하되 과하지 않게
    borderTopWidth: 2, // 6 -> 2
    borderLeftWidth: 2, // 6 -> 2
    borderRightWidth: 2, // 4 -> 2
    borderBottomWidth: 2, // 4 -> 2
    padding: 10, // 14 -> 10
    fontSize: 16, // 18 -> 16
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000',
  },
});
