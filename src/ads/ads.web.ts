// No ads in the browser. `?storeshot` shows the ad settings anyway, only so that
// scripts/store-screenshots.mjs can photograph them for Apple's purchase review.
import { setAdState } from './state';

const storeshot = typeof location !== 'undefined' && new URLSearchParams(location.search).has('storeshot');

export const adsSupported = storeshot;

export async function loadAdFree(): Promise<boolean> {
  setAdState({ adFree: !storeshot });
  return !storeshot;
}

export async function initAds(): Promise<void> {}

export function adRequestOptions() {
  return { requestNonPersonalizedAdsOnly: true };
}

export function maybeShowInterstitial() {}

export function stopAds() {}

export async function showAdPrivacyOptions() {}
