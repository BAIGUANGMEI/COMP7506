import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryStore = new Map<string, string>();

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS !== 'web') {
    return SecureStore.getItemAsync(key);
  }

  if (canUseLocalStorage()) {
    return window.localStorage.getItem(key);
  }

  return memoryStore.get(key) ?? null;
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  if (canUseLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  memoryStore.set(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  if (canUseLocalStorage()) {
    window.localStorage.removeItem(key);
    return;
  }

  memoryStore.delete(key);
}
