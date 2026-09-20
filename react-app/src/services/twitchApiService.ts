import { TWITCH_CLIENT_ID } from '../constants';

async function twitchFetch(path: string, accessToken: string, options: RequestInit = {}) {
  return fetch(`https://api.twitch.tv/helix/${path}`, {
    ...options,
    headers: {
      'client-id': TWITCH_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
}

export async function getTwitchUser(accessToken: string): Promise<{ login: string; id: string } | null> {
  try {
    const res = await twitchFetch('users', accessToken);
    if (!res.ok) return null;
    const data = await res.json();
    return { login: data.data[0].login, id: data.data[0].id };
  } catch {
    return null;
  }
}

export async function getTwitchUserByLogin(login: string, accessToken: string): Promise<string | null> {
  try {
    const res = await twitchFetch(`users?login=${login}`, accessToken);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function banUser(broadcasterId: string, moderatorId: string, userId: string, accessToken: string) {
  await twitchFetch(`moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ data: { user_id: userId } }),
  });
}

export async function unbanUser(broadcasterId: string, moderatorId: string, userId: string, accessToken: string) {
  await twitchFetch(
    `moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&user_id=${userId}`,
    accessToken,
    { method: 'DELETE' }
  );
}

export async function deleteChatMessage(broadcasterId: string, moderatorId: string, messageId: string, accessToken: string) {
  await twitchFetch(
    `moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&message_id=${messageId}`,
    accessToken,
    { method: 'DELETE' }
  );
}

export async function shoutoutUser(fromBroadcasterId: string, toBroadcasterId: string, moderatorId: string, accessToken: string) {
  await twitchFetch(
    `chat/shoutouts?from_broadcaster_id=${fromBroadcasterId}&to_broadcaster_id=${toBroadcasterId}&moderator_id=${moderatorId}`,
    accessToken,
    { method: 'POST' }
  );
}
