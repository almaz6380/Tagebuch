import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { authenticate, biometricKind, type BiometricKind } from './biometrics';
import { getItem, removeItem, setItem } from './kv';

const PIN_KEY = 'tagebuch.pin';
const BIOMETRIC_KEY = 'tagebuch.biometric';

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
  /** Face ID, fingerprint … or null if the device has no biometrics set up. */
  biometricName: BiometricKind | null;
  biometricEnabled: boolean;
  setBiometricEnabled: (on: boolean) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
};

const LockContext = createContext<LockContextValue | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [biometricName, setBiometricName] = useState<BiometricKind | null>(null);
  const [biometricOn, setBiometricOn] = useState(false);

  useEffect(() => {
    Promise.all([getItem(PIN_KEY), getItem(BIOMETRIC_KEY), biometricKind().catch(() => null)]).then(([value, bio, name]) => {
      setStored(value);
      setLocked(!!value);
      setBiometricOn(bio === '1');
      setBiometricName(name);
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
    await removeItem(BIOMETRIC_KEY);
    setStored(null);
    setBiometricOn(false);
    setLocked(false);
  }, []);

  const setBiometricEnabled = useCallback(async (on: boolean) => {
    // Confirm with a scan before turning it on, so it's known to work.
    if (on && !(await authenticate())) return;
    if (on) await setItem(BIOMETRIC_KEY, '1');
    else await removeItem(BIOMETRIC_KEY);
    setBiometricOn(on);
  }, []);

  const biometricEnabled = biometricOn && !!biometricName && !!stored;

  const unlockWithBiometrics = useCallback(async () => {
    if (!biometricEnabled) return false;
    const ok = await authenticate();
    if (ok) setLocked(false);
    return ok;
  }, [biometricEnabled]);

  const value = useMemo(
    () => ({
      ready,
      hasPin: !!stored,
      locked,
      unlock,
      setPin,
      clearPin,
      biometricName,
      biometricEnabled,
      setBiometricEnabled,
      unlockWithBiometrics,
    }),
    [ready, stored, locked, unlock, setPin, clearPin, biometricName, biometricEnabled, setBiometricEnabled, unlockWithBiometrics],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used inside LockProvider');
  return ctx;
}
