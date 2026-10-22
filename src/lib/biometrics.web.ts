// No biometric unlock in the browser; the PIN is the only lock.
export async function biometricLabel(): Promise<string | null> {
  return null;
}

export async function authenticate(): Promise<boolean> {
  return false;
}
