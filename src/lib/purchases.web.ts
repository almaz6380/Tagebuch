// No store in the browser.
export const purchasesSupported = false;

export async function initPurchases(_adFree: boolean) {}

export async function loadPrice(): Promise<string | null> {
  // Example price for the store screenshot (see ads.web.ts).
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('storeshot') ? '€2.99' : null;
}

export async function buyNoAds(): Promise<'bought' | 'cancelled' | 'failed'> {
  return 'failed';
}

export async function restoreNoAds(): Promise<boolean> {
  return false;
}
