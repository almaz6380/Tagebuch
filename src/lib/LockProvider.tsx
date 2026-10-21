import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { getItem, removeItem, setItem } from './kv';

const PIN_KEY = 'tagebuch.pin';

// The PIN is an access lock for the app UI; the entries themselves are not encrypted.
async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

function randomSalt() {
  return Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('');
}

type LockContextValue = {
  ready: boolean;
  hasPin: boolean;
  locked: boolean;
  unlock: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
};

const LockContext = createContext<LockContextValue | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    getItem(PIN_KEY).then((value) => {
      setStored(value);
      setLocked(!!value);
      setReady(true);
    });
  }, []);

  // Re-lock when the app goes to the background (native only; on web this
  // would fire on every tab switch).
  useEffect(() => {
    if (Platform.OS === 'web' || !stored) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setLocked(true);
    });
    return () => sub.remove();
  }, [stored]);

  const unlock = useCallback(
    async (pin: string) => {
      if (!stored) return true;
      const [salt, hash] = stored.split(':');
      const ok = (await hashPin(pin, salt)) === hash;
      if (ok) setLocked(false);
      return ok;
    },
    [stored],
  );

  const setPin = useCallback(async (pin: string) => {
    const salt = randomSalt();
    const value = `${salt}:${await hashPin(pin, salt)}`;
    await setItem(PIN_KEY, value);
    setStored(value);
  }, []);

  const clearPin = useCallback(async () => {
    await removeItem(PIN_KEY);
    setStored(null);
    setLocked(false);
  }, []);

  const value = useMemo(
    () => ({ ready, hasPin: !!stored, locked, unlock, setPin, clearPin }),
    [ready, stored, locked, unlock, setPin, clearPin],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used inside LockProvider');
  return ctx;
}
