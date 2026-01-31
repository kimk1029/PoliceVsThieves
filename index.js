/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// AdMob 초기화는 AdBanner 컴포넌트에서 처리
// 여기서는 초기화하지 않아도 AdMob이 자동으로 초기화됨

AppRegistry.registerComponent(appName, () => App);
