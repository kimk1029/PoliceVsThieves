const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const customConfig = {
  resolver: {
    // 안드로이드 임시 빌드 폴더들을 감시 대상에서 제외합니다.
    blockList: [
      /node_modules\/.*\/android\/build\/.*/,
      /android\/app\/build\/.*/,
    ],
  },
};

module.exports = mergeConfig(defaultConfig, customConfig);