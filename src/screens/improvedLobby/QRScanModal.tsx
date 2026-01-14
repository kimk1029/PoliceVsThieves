import React from 'react';
import {Modal, Platform, Text, View} from 'react-native';
import {RNCamera} from 'react-native-camera';
import {PixelButton} from '../../components/pixel/PixelButton';

interface QRScanModalProps {
  visible: boolean;
  qrScannerSession: number;
  playerName: string;
  onScannedRaw: (raw: string) => void;
  onCancel: () => void;
}

export const QRScanModal: React.FC<QRScanModalProps> = ({
  visible,
  qrScannerSession,
  playerName,
  onScannedRaw,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={true} transparent={false} animationType="slide">
      <View style={{flex: 1, backgroundColor: '#000'}}>
        {/* 상단 안내 */}
        <View style={{padding: 16, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)'}}>
          <Text
            style={{
              color: '#00FF00',
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            }}
          >
            QR SCANNER
          </Text>
          <Text
            style={{
              color: '#FFFFFF',
              marginTop: 6,
              fontSize: 12,
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            }}
          >
            초록 프레임 안에 QR 코드를 맞춰주세요
          </Text>
          {!playerName.trim() && (
            <Text
              style={{
                color: '#FF0055',
                marginTop: 8,
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              }}
            >
              닉네임을 먼저 입력하세요
            </Text>
          )}
        </View>

        {/* 카메라 영역 */}
        <View style={{flex: 1, position: 'relative'}}>
          <RNCamera
            key={`rn-camera-${qrScannerSession}`}
            style={{flex: 1}}
            type={RNCamera.Constants.Type.back}
            flashMode={RNCamera.Constants.FlashMode.off}
            captureAudio={false}
            autoFocus={RNCamera.Constants.AutoFocus.on}
            // 러프하게: 타입 필터링 없이 data에서 6자리 코드만 뽑아서 처리(인식률↑)
            onBarCodeRead={(e: any) => {
              const raw = e?.data || e?.rawData || '';
              onScannedRaw(String(raw));
            }}
            // Google Vision 바코드 이벤트도 같이 받아서(환경마다 더 잘 잡힘) 인식률↑
            onGoogleVisionBarcodesDetected={(ev: any) => {
              const barcodes = ev?.barcodes || [];
              if (!Array.isArray(barcodes) || barcodes.length === 0) return;
              const first = barcodes[0];
              const raw = first?.data || first?.rawData || '';
              onScannedRaw(String(raw));
            }}
          />

          {/* 중앙 마커 프레임 */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: '25%',
              left: '12%',
              right: '12%',
              height: '40%',
              borderColor: '#00FF00',
              borderWidth: 4,
              borderRadius: 8,
            }}
          />
        </View>

        {/* 하단 CANCEL 고정 */}
        <View style={{padding: 16, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)'}}>
          <View style={{width: '70%'}}>
            <PixelButton text="CANCEL" variant="danger" size="medium" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

