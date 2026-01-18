#import "AppConfig.h"

@implementation AppConfig

RCT_EXPORT_MODULE(AppConfig)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSDictionary *)constantsToExport
{
  NSDictionary *info = [[NSBundle mainBundle] infoDictionary];

  id apiRaw = info[@"PNT_API_BASE_URL"];
  NSString *apiBaseUrl = ([apiRaw isKindOfClass:[NSString class]] && [(NSString *)apiRaw length] > 0)
      ? (NSString *)apiRaw
      : @"http://localhost:9001";

  id stageRaw = info[@"PNT_STAGE"];
  BOOL isStage = NO;
  if ([stageRaw isKindOfClass:[NSNumber class]]) {
    isStage = [(NSNumber *)stageRaw boolValue];
  } else if ([stageRaw isKindOfClass:[NSString class]]) {
    NSString *s = [[(NSString *)stageRaw stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] lowercaseString];
    isStage = [s isEqualToString:@"1"] || [s isEqualToString:@"true"] || [s isEqualToString:@"yes"];
  }

  // TURN server config (for WebRTC P2P across different networks)
  id turnUrlRaw = info[@"PNT_TURN_URL"];
  NSString *turnUrl = ([turnUrlRaw isKindOfClass:[NSString class]] && [(NSString *)turnUrlRaw length] > 0)
      ? (NSString *)turnUrlRaw
      : @"";

  id turnUsernameRaw = info[@"PNT_TURN_USERNAME"];
  NSString *turnUsername = ([turnUsernameRaw isKindOfClass:[NSString class]] && [(NSString *)turnUsernameRaw length] > 0)
      ? (NSString *)turnUsernameRaw
      : @"";

  id turnCredentialRaw = info[@"PNT_TURN_CREDENTIAL"];
  NSString *turnCredential = ([turnCredentialRaw isKindOfClass:[NSString class]] && [(NSString *)turnCredentialRaw length] > 0)
      ? (NSString *)turnCredentialRaw
      : @"";

  NSLog(@"[AppConfig] PNT_API_BASE_URL=%@ PNT_STAGE=%@ TURN_URL=%@", apiBaseUrl, isStage ? @"true" : @"false", turnUrl.length > 0 ? turnUrl : @"(not set)");

  return @{
    @"API_BASE_URL": apiBaseUrl,
    @"IS_STAGE": @(isStage),
    @"TURN_URL": turnUrl,
    @"TURN_USERNAME": turnUsername,
    @"TURN_CREDENTIAL": turnCredential,
  };
}

@end

