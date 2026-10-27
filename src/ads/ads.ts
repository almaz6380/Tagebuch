// AdMob: consent (UMP), then Apple's tracking prompt, then the SDK.
// The SDK sends no ad request before mobileAds().initialize(), so nothing leaves
// the device before the user has answered the consent form.
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { AppState, Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  TestIds,
} from 'react-native-google-mobile-ads';

import { getItem } from '@/lib/kv';
import { adUnit, NO_ADS_KEY } from './config';
import { getAdState, setAdState } from './state';

export const adsSupported = true;

const SAVES_PER_AD = 3;
const MIN_GAP_MS = 120_000;
const NO_AD_AFTER_START_MS = 60_000;
const MAX_PER_SESSION = 4;

const startedAt = Date.now();
let initPromise: Promise<void> | null = null;
let personalized = false;
let interstitial: InterstitialAd | null = null;
let loaded = false;
let saves = 0;
let shown = 0;
let lastShown = 0;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reads the purchase flag. Runs before anything else so buyers never see a consent form. */
export async function loadAdFree(): Promise<boolean> {
  const adFree = (await getItem(NO_ADS_KEY).catch(() => null)) === '1';
  setAdState({ adFree });
  return adFree;
}

/**
 * iOS only shows the tracking prompt while the app is active, and silently drops a
 * request made too early after launch (the callback then still says "undetermined").
 * Apple rejected Mahjong Royale twice for a prompt it never saw, hence retries.
 */
async function askTracking() {
  if (Platform.OS !== 'ios') return;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (AppState.currentState !== 'active') {
      await new Promise<void>((resolve) => {
        const sub = AppState.addEventListener('change', (s) => {
          if (s === 'active') {
            sub.remove();
            resolve();
          }
        });
      });
    }
    await wait(1000);
    const { status } = await requestTrackingPermissionsAsync();
    if (status !== PermissionStatus.UNDETERMINED) return;
  }
}

async function run() {
  if (await loadAdFree()) return;
  try {
    const info = await AdsConsent.gatherConsent();
    setAdState({
      privacyOptions: info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    });
    await askTracking();
    if (!info.canRequestAds && !(await AdsConsent.getConsentInfo()).canRequestAds) {
      console.warn('[ads] no consent to request ads');
      return;
    }
    const choices = await AdsConsent.getUserChoices();
    const tracking = Platform.OS !== 'ios' || (await getTrackingPermissionsAsync()).granted;
    personalized = choices.selectPersonalisedAds && tracking;
    await mobileAds().initialize();
    // A purchase may have arrived while the consent form was open.
    if (getAdState().adFree) return;
    setAdState({ ready: true });
    loadInterstitial();
  } catch (e) {
    console.warn('[ads] start failed', e);
  }
}

/** Safe to call repeatedly; the work happens once per app start. */
export function initAds(): Promise<void> {
  initPromise ??= run();
  return initPromise;
}

export function adRequestOptions() {
  return { requestNonPersonalizedAdsOnly: !personalized };
}

function loadInterstitial() {
  if (getAdState().adFree) return;
  loaded = false;
  interstitial = InterstitialAd.createForAdRequest(adUnit('interstitial', TestIds.INTERSTITIAL), adRequestOptions());
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true;
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    lastShown = Date.now();
    loadInterstitial();
  });
  interstitial.addAdEventListener(AdEventType.ERROR, (e) => {
    console.warn('[ads] interstitial failed', e);
    loaded = false;
    // Try again later instead of hammering the network.
    setTimeout(() => {
      if (!loaded) loadInterstitial();
    }, 60_000);
  });
  interstitial.load();
}

/** After an entry was saved: every third save, with generous gaps. */
export function maybeShowInterstitial() {
  saves++;
  const s = getAdState();
  if (!s.ready || s.adFree || !interstitial || !loaded) return;
  const now = Date.now();
  if (saves % SAVES_PER_AD !== 0) return;
  if (now - startedAt < NO_AD_AFTER_START_MS || now - lastShown < MIN_GAP_MS || shown >= MAX_PER_SESSION) return;
  shown++;
  loaded = false;
  try {
    interstitial.show().catch((e) => console.warn('[ads] show failed', e));
  } catch (e) {
    console.warn('[ads] show failed', e);
  }
}

/** Called right after the ad-free purchase. */
export function stopAds() {
  setAdState({ adFree: true, ready: false });
  interstitial?.removeAllListeners();
  interstitial = null;
}

/** EU users must be able to change their ad consent at any time. */
export async function showAdPrivacyOptions() {
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch (e) {
    console.warn('[ads] privacy options failed', e);
  }
}
