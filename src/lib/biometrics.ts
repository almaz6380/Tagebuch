import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** Name of the biometric method, or null if none is set up on this device. */
export async function biometricLabel(): Promise<string | null> {
  if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Gesichtserkennung';
  }
  return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerabdruck';
}

export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Tagebuch entsperren',
    cancelLabel: 'PIN eingeben',
    // The app PIN is the fallback, not the device passcode.
    disableDeviceFallback: true,
    fallbackLabel: '',
  });
  return result.success;
}
