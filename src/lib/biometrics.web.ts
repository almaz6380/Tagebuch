// No biometric unlock in the browser; the PIN is the only lock.
import type { BiometricKind } from './biometrics';

export async function biometricKind(): Promise<BiometricKind | null> {
  return null;
}

export async function authenticate(): Promise<boolean> {
  return false;
}
