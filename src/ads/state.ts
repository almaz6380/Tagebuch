// Ad state shared by the banner, the editor and the settings, like the i18n store.
import { useSyncExternalStore } from 'react';

type State = {
  /** null until the saved purchase flag has been read. */
  adFree: boolean | null;
  /** True once consent, tracking prompt and SDK start are done. */
  ready: boolean;
  /** EU: the consent form must be reachable again from the settings. */
  privacyOptions: boolean;
};

let state: State = { adFree: null, ready: false, privacyOptions: false };
const listeners = new Set<() => void>();

export function getAdState(): State {
  return state;
}

export function setAdState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useAdState(): State {
  return useSyncExternalStore(subscribe, getAdState, getAdState);
}

/** Banners only when the SDK is up and nothing was bought. */
export function useShowAds(): boolean {
  const s = useAdState();
  return s.ready && s.adFree === false;
}
