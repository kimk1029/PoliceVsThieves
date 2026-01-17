import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import qr from 'qr.js';

interface QRCodeViewProps {
  value: string;
  size?: number;
  showValue?: boolean;
  padding?: number;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 200,
  showValue = true,
  padding = 20,
}) => {
  const modules = useMemo(() => {
    try {
      console.log('[QRCodeView] QR 코드 생성 중:', value);
      console.log('[QRCodeView] 데이터 길이:', value.length);
      const qrCode = qr(value);
      console.log('[QRCodeView] QR 코드 생성 성공');
      return qrCode.modules as boolean[][];
    } catch (err) {
      console.error('[QRCodeView] QR 코드 생성 실패:', err);
      return null;
    }
  }, [value]);

  if (!modules) {
    return (
      <View style={[styles.container, {width: size, height: size, padding}]}>
        <Text style={styles.hintText}>QR 생성 실패</Text>
      </View>
    );
  }

  const count = modules.length;
  const cellSize = Math.floor(size / count);
  const qrSize = cellSize * count;

  return (
    <View style={[styles.container, {width: size, height: size, padding}]}>
      <View style={[styles.qrWrap, {width: qrSize, height: qrSize}]}>
        {modules.map((row, r) => (
          <View key={`r-${r}`} style={styles.row}>
            {row.map((cell, c) => (
              <View
                key={`c-${r}-${c}`}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: cell ? '#000' : '#FFF',
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      {showValue ? <Text style={styles.codeText}>{value}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrWrap: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {},
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
    marginBottom: 5,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
  },
});
