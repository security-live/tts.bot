/**
 * Backend API integration for tts.bot voice config persistence.
 * API: https://api.tts.bot/tts/{channel}/{username}
 */

const API_BASE = 'https://api.tts.bot/tts';

export interface TtsChatterApiConfig {
  voice: string;
  voice_option: string;
  spoken_name: string;
  ttsBanned: boolean;
  display_name: string;
}

export async function loadVoiceFromApi(
  channel: string,
  username: string
): Promise<TtsChatterApiConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/${channel}/${username}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.Item) {
      return {
        voice: (data.Item.voice ?? 'brian').toLowerCase(),
        voice_option: data.Item.voice_option ?? 'standard',
        spoken_name: data.Item.spoken_name ?? username,
        ttsBanned: data.Item.ttsBanned ?? false,
        display_name: data.Item.display_name ?? username,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadGlobalVoiceFromApi(
  username: string
): Promise<TtsChatterApiConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/all/${username}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.Item) {
      return {
        voice: (data.Item.voice ?? 'brian').toLowerCase(),
        voice_option: data.Item.voice_option ?? 'standard',
        spoken_name: data.Item.spoken_name ?? username,
        ttsBanned: data.Item.ttsBanned ?? false,
        display_name: data.Item.display_name ?? username,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveTtsConfig(
  channel: string,
  username: string,
  config: TtsChatterApiConfig,
  accessToken: string
): Promise<void> {
  try {
    const payload = {
      data: [{
        login: username,
        voice: config.voice,
        voice_option: config.voice_option,
        spoken_name: config.spoken_name,
        ttsBanned: config.ttsBanned,
        display_name: config.display_name,
        access_token: accessToken,
      }],
    };
    await fetch(`${API_BASE}/${channel}/${username}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('saveTtsConfig error:', err);
  }
}
