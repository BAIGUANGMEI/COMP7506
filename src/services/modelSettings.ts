import type { ModelSettings } from '@/domain/types';
import { deleteSecureItem, getSecureItem, setSecureItem } from '@/services/secureStorage';

export const KIMI_API_KEY_REF = 'kimi.apiKey';

export const DEFAULT_KIMI_SETTINGS: ModelSettings = {
  id: 'kimi',
  name: 'Kimi',
  apiBase: 'https://api.moonshot.ai/v1',
  apiKeyRef: KIMI_API_KEY_REF,
  chatModel: 'kimi-k2.6',
  visionModel: 'kimi-k2.6',
  supportsFiles: true,
  supportsVision: true,
  hasApiKey: false,
};

const SETTINGS_KEY = 'studyvault.modelSettings';

export async function loadModelSettings(): Promise<ModelSettings> {
  const rawSettings = await getSecureItem(SETTINGS_KEY);
  const rawKey = await getSecureItem(KIMI_API_KEY_REF);

  if (!rawSettings) {
    return {
      ...DEFAULT_KIMI_SETTINGS,
      hasApiKey: Boolean(rawKey),
    };
  }

  try {
    const parsed = JSON.parse(rawSettings) as Partial<ModelSettings>;
    return {
      ...DEFAULT_KIMI_SETTINGS,
      ...parsed,
      apiKeyRef: KIMI_API_KEY_REF,
      hasApiKey: Boolean(rawKey),
    };
  } catch {
    return {
      ...DEFAULT_KIMI_SETTINGS,
      hasApiKey: Boolean(rawKey),
    };
  }
}

export async function saveModelSettings(settings: ModelSettings, apiKey?: string): Promise<ModelSettings> {
  const nextSettings = {
    ...settings,
    apiKeyRef: KIMI_API_KEY_REF,
    hasApiKey: Boolean(apiKey) || settings.hasApiKey,
  };

  if (apiKey && apiKey.trim()) {
    await setSecureItem(KIMI_API_KEY_REF, apiKey.trim());
    nextSettings.hasApiKey = true;
  }

  await setSecureItem(
    SETTINGS_KEY,
    JSON.stringify({
      id: nextSettings.id,
      name: nextSettings.name,
      apiBase: nextSettings.apiBase,
      chatModel: nextSettings.chatModel,
      visionModel: nextSettings.visionModel,
      supportsFiles: nextSettings.supportsFiles,
      supportsVision: nextSettings.supportsVision,
    }),
  );

  return nextSettings;
}

export async function getKimiApiKey(): Promise<string | null> {
  return getSecureItem(KIMI_API_KEY_REF);
}

export async function clearKimiApiKey(): Promise<ModelSettings> {
  await deleteSecureItem(KIMI_API_KEY_REF);
  const settings = await loadModelSettings();
  return {
    ...settings,
    hasApiKey: false,
  };
}
