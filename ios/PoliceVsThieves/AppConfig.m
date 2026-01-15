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

  NSLog(@"[AppConfig] PNT_API_BASE_URL=%@ PNT_STAGE=%@", apiBaseUrl, isStage ? @"true" : @"false");

  return @{
    @"API_BASE_URL": apiBaseUrl,
    @"IS_STAGE": @(isStage),
  };
}

@end

