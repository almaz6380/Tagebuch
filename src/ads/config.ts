// The only place with AdMob ad unit IDs. The app IDs (with "~") live in app.json,
// plugin "react-native-google-mobile-ads"; ad unit IDs have a "/".
// Until the real units exist these are Google's sample units. scripts/asc.py and
// scripts/play.py refuse to submit while a sample ID is left here or in app.json.
import { Platform } from 'react-native';

const SAMPLE_PUBLISHER = '3940256099942544';

const UNITS = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2435281174',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/9214589741',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
};

const platformUnits = Platform.OS === 'ios' ? UNITS.ios : UNITS.android;

/** Debug builds always get test ads, so nobody clicks their own live ads. */
export function adUnit(kind: 'banner' | 'interstitial', testId: string): string {
  return __DEV__ ? testId : platformUnits[kind];
}

export const USES_SAMPLE_UNITS = Object.values(platformUnits).some((id) => id.includes(SAMPLE_PUBLISHER));

/** Purchase that turns ads off for good. */
export const NO_ADS_SKU = 'io.github.almaz6380.tagebuch.noads';
/** Local flag, set before the store transaction is finished. */
export const NO_ADS_KEY = 'tagebuch.noads';
