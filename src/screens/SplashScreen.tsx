import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  ImageBackground,
} from 'react-native';

const {width} = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({onFinish}) => {
  const [loadingText, setLoadingText] = useState('LOADING');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. 페이드인 & 스케일업 애니메이션
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. 로딩 바 애니메이션
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false, // width 변경은 native driver 지원 안함
    }).start(() => {
      // 애니메이션 끝나면 메인으로 이동
      setTimeout(onFinish, 200);
    });

    // 3. 로딩 텍스트 점멸 효과
    const interval = setInterval(() => {
      setLoadingText(prev => (prev.length > 9 ? 'LOADING' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const splashBg = require('../assets/images/copsbg.jpg');

  return (
    <ImageBackground source={splashBg} style={styles.container} resizeMode="cover">
      <StatusBar barStyle="light-content" backgroundColor="#120458" />
      
      {/* 반투명 오버레이 (텍스트 가독성 향상) */}
      <View style={styles.overlay} />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{scale: scaleAnim}],
          },
        ]}>
        
        {/* PIXEL LOGO */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoTop}>POLICE</Text>
          <Text style={styles.logoVs}>VS</Text>
          <Text style={styles.logoBottom}>THIEVES</Text>
        </View>

        <Text style={styles.editionText}>PIXEL ARCADE EDITION</Text>

        {/* LOADING BAR */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{loadingText}</Text>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {width: widthInterpolated},
              ]}
            />
          </View>
          <Text style={styles.versionText}>v1.0.0 BETA</Text>
        </View>
      </Animated.View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 4, 88, 0.6)', // Deep Night Blue 반투명 오버레이 (텍스트 가독성)
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    transform: [{rotate: '-5deg'}], // 약간 기울여서 역동적인 느낌
  },
  logoTop: {
    fontSize: 52,
    fontWeight: '900',
    color: '#00E5FF', // Cyan
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: '#FF0055', // Pink Shadow
    textShadowOffset: {width: 4, height: 4},
    textShadowRadius: 0,
    letterSpacing: -2,
  },
  logoVs: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F9F871', // Yellow
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: -5,
    textShadowColor: '#000',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 0,
  },
  logoBottom: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FF0055', // Pink
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: '#00E5FF', // Cyan Shadow
    textShadowOffset: {width: 4, height: 4},
    textShadowRadius: 0,
    letterSpacing: -2,
  },
  editionText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 4,
    marginBottom: 60,
    opacity: 0.8,
  },
  loadingContainer: {
    width: width * 0.7,
    alignItems: 'center',
  },
  loadingText: {
    color: '#F9F871',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  progressBarBg: {
    width: '100%',
    height: 24,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#FFF',
    padding: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E5FF',
  },
  versionText: {
    color: '#666',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 8,
    alignSelf: 'flex-end',
  },
});
