// One-time purchase "Remove ads" via StoreKit / Play Billing.
// Order matters: the local flag is saved BEFORE the transaction is finished. If saving
// fails, the transaction stays open and the store delivers it again on the next start.
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type Purchase,
} from 'expo-iap';

import { stopAds } from '@/ads/ads';
import { NO_ADS_KEY, NO_ADS_SKU } from '@/ads/config';
import { setItem } from './kv';

export const purchasesSupported = true;

type Waiter = (result: 'bought' | 'cancelled' | 'failed') => void;
let connected: Promise<boolean> | null = null;
let waiter: Waiter | null = null;

async function grant(purchase: Purchase) {
  await setItem(NO_ADS_KEY, '1');
  stopAds();
  await finishTransaction({ purchase, isConsumable: false });
}

function connect(): Promise<boolean> {
  connected ??= (async () => {
    try {
      await initConnection();
      purchaseUpdatedListener(async (purchase) => {
        if (purchase.productId !== NO_ADS_SKU || purchase.purchaseState !== 'purchased') return;
        try {
          await grant(purchase);
          waiter?.('bought');
        } catch (e) {
          console.warn('[iap] could not store purchase', e);
          waiter?.('failed');
        }
        waiter = null;
      });
      purchaseErrorListener((e) => {
        if (!isUserCancelledError(e)) console.warn('[iap] purchase failed', e);
        waiter?.(isUserCancelledError(e) ? 'cancelled' : 'failed');
        waiter = null;
      });
      return true;
    } catch (e) {
      console.warn('[iap] no store connection', e);
      connected = null;
      return false;
    }
  })();
  return connected;
}

/**
 * Started once per launch: picks up purchases that were approved later
 * (Ask to Buy, pending payment) and restores the purchase after a reinstall.
 */
export async function initPurchases(adFree: boolean) {
  if (!(await connect()) || adFree) return;
  try {
    for (const p of await getAvailablePurchases()) {
      if (p.productId === NO_ADS_SKU && p.purchaseState === 'purchased') await grant(p);
    }
  } catch (e) {
    console.warn('[iap] checking purchases failed', e);
  }
}

/** Localized price from the store, or null if the store doesn't answer in time. */
export async function loadPrice(): Promise<string | null> {
  if (!(await connect())) return null;
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 8000));
  const products = fetchProducts({ skus: [NO_ADS_SKU], type: 'in-app' })
    .then((list) => (list ?? []).find((p) => p.id === NO_ADS_SKU)?.displayPrice ?? null)
    .catch(() => null);
  return Promise.race([products, timeout]);
}

export async function buyNoAds(): Promise<'bought' | 'cancelled' | 'failed'> {
  if (!(await connect())) return 'failed';
  return new Promise((resolve) => {
    waiter = resolve;
    requestPurchase({
      type: 'in-app',
      request: { apple: { sku: NO_ADS_SKU }, google: { skus: [NO_ADS_SKU] } },
    }).catch((e) => {
      waiter = null;
      resolve(isUserCancelledError(e) ? 'cancelled' : 'failed');
    });
  });
}

/** Apple requires a visible way to restore. Returns whether the purchase was found. */
export async function restoreNoAds(): Promise<boolean> {
  if (!(await connect())) return false;
  try {
    await restorePurchases();
    for (const p of await getAvailablePurchases()) {
      if (p.productId === NO_ADS_SKU && p.purchaseState === 'purchased') {
        await grant(p);
        return true;
      }
    }
  } catch (e) {
    console.warn('[iap] restore failed', e);
  }
  return false;
}
