#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"copvsrobbers";
  // Required for New Architecture (Fabric) 3rd-party components registration
  // e.g. @mj-studio/react-native-naver-map's `RNCNaverMapView`.
  self.dependencyProvider = [RCTAppDependencyProvider new];
  NSString *bundleId = [[NSBundle mainBundle] bundleIdentifier];
  NSString *nmfClientId = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"NMFClientId"];
  NSLog(@"[AppDelegate] bundleId=%@ NMFClientId=%@", bundleId, nmfClientId);
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// NOTE:
// In RN 0.80, RCTAppDelegate (via RCTDefaultReactNativeFactoryDelegate) calls `bundleURL`.
// If it's not overridden, it throws: 'RCTAppDelegate::bundleURL not implemented'.
- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Keep this for compatibility with any codepaths/docs that mention `getBundleURL`.
- (NSURL *)getBundleURL
{
  return [self bundleURL];
}

// RCTBridge may still request the JS bundle URL via the bridge delegate method in some setups.
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
  return true;
}

@end
