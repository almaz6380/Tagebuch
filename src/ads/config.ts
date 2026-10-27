// The only place with AdMob ad unit IDs. The app IDs (with "~") live in app.json,
// plugin "react-native-google-mobile-ads"; ad unit IDs have a "/".
// scripts/asc.py and scripts/play.py refuse to submit if Google's sample IDs ever
// end up here or in app.json.
import { Platform } from 'react-native';

const UNITS = {
  ios: {
    banner: 'ca-app-pub-8860791993288062/6639349865',
    interstitial: 'ca-app-pub-8860791993288062/5261147025',
  },
  android: {
    banner: 'ca-app-pub-8860791993288062/5480638872',
    interstitial: 'ca-app-pub-8860791993288062/1541393865',
  },
};

const platformUnits = Platform.OS === 'ios' ? UNITS.ios : UNITS.android;

/** Debug builds always get test ads, so nobody clicks their own live ads. */
export function adUnit(kind: 'banner' | 'interstitial', testId: string): string {
  return __DEV__ ? testId : platformUnits[kind];
}

/** Purchase that turns ads off for good. */
export const NO_ADS_SKU = 'io.github.almaz6380.tagebuch.noads';
/** Local flag, set before the store transaction is finished. */
export const NO_ADS_KEY = 'tagebuch.noads';
