import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { getMessages } from '@/i18n';

/** Keys into the `lock` dictionary, so the name follows the app language. */
export type BiometricKind = 'faceId' | 'touchId' | 'face' | 'fingerprint';

/** Biometric method of this device, or null if none is set up. */
export async function biometricKind(): Promise<BiometricKind | null> {
  if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'faceId' : 'face';
  }
  return Platform.OS === 'ios' ? 'touchId' : 'fingerprint';
}

export async function authenticate(): Promise<boolean> {
  const t = getMessages().lock;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: t.biometricPrompt,
    cancelLabel: t.biometricCancel,
    // The app PIN is the fallback, not the device passcode.
    disableDeviceFallback: true,
    fallbackLabel: '',
  });
  return result.success;
}
