export const LOCATION_LOG_TAG = '[LOC]';

export const logLocation = (...args: any[]) => {
  console.log(LOCATION_LOG_TAG, ...args);
};
