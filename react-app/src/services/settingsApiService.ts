const API_BASE = 'https://api.tts.bot';

export async function loadSettingsFromApi(channel: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API_BASE}/settings/${channel}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.settings ?? null;
  } catch {
    return null;
  }
}

export async function saveSettingsToApi(
  channel: string,
  settings: Record<string, unknown>,
  accessToken: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings/${channel}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, settings }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
