let bttvEmotes: string[] = [];
let ffzEmotes: string[] = [];
let twitchId = 0;

export function getBttvEmotes() { return bttvEmotes; }
export function getFfzEmotes() { return ffzEmotes; }
export function getTwitchId() { return twitchId; }

export async function loadFFZEmotes(username: string): Promise<void> {
  bttvEmotes = [];
  ffzEmotes = [];

  try {
    const roomRes = await fetch(`https://api.frankerfacez.com/v1/_room/${username}`);
    if (!roomRes.ok) return;
    const roomData = await roomRes.json();
    twitchId = roomData.room?.twitch_id ?? 0;
    const setId = roomData.room?.set;

    const setRes = await fetch(`https://api.frankerfacez.com/v1/set/${setId}`);
    if (!setRes.ok) return;
    const setData = await setRes.json();
    for (const emote of setData.set?.emoticons ?? []) {
      ffzEmotes.push(` ${emote.code} `);
    }
  } catch (err) {
    console.warn('loadFFZEmotes error:', err);
  }
}

export async function loadBTTVEmotes(): Promise<void> {
  if (!twitchId) return;
  try {
    const res = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${twitchId}`);
    if (!res.ok) return;
    const data = await res.json();
    for (const emote of [...(data.channelEmotes ?? []), ...(data.sharedEmotes ?? [])]) {
      bttvEmotes.push(` ${emote.code} `);
    }
  } catch (err) {
    console.warn('loadBTTVEmotes error:', err);
  }
}

export async function loadBTTVGlobalEmotes(): Promise<void> {
  try {
    const res = await fetch('https://api.betterttv.net/3/cached/emotes/global');
    if (!res.ok) return;
    const data = await res.json();
    for (const emote of data ?? []) {
      bttvEmotes.push(` ${emote.code} `);
    }
  } catch (err) {
    console.warn('loadBTTVGlobalEmotes error:', err);
  }
}
