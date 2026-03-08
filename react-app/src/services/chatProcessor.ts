/**
 * Core chat processing pipeline — ported from doChat() in script.js.
 * Pure functions, no React dependencies.
 */
import { translateText, selectRandomVoiceByLanguageCode } from './awsService';
import { getBttvEmotes, getFfzEmotes } from './emoteService';
import type { ChatterConfig, TwitchUserstate, VoiceLookup, PollyVoice, ChatMessage, AudioMessage } from '../types';
import { DEFAULT_COLORS, INJECT_SCRIPT_REWARD_ID } from '../constants';

// ── Helpers ──────────────────────────────────────────────────────────────────

const hashCode = (str: string) =>
  str.split('').reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0);

export const getColorForUsername = (username: string) =>
  DEFAULT_COLORS[Math.abs(hashCode(username)) % (DEFAULT_COLORS.length - 1)];

export function escapeRegExp(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function getHTMLEntityEncoding(char: string) {
  const map: Record<string, string> = {
    '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;', '&': '&amp;', ';': '&semi;',
  };
  return map[char] ?? char;
}


export function similarityPercentage(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 100;
  return ((longer.length - editDistance(longer, shorter)) / longer.length) * 100;
}

function editDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) { costs[j] = j; }
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1[i - 1] !== s2[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

export function getSpokenName(chatters: Record<string, ChatterConfig>, username: string): string {
  return chatters[username.toLowerCase()]?.spoken_name ?? username;
}

// ── TLD filtering ─────────────────────────────────────────────────────────────

let TLDsRegex: RegExp | null = null;

export function setTLDsRegex(regex: RegExp) {
  TLDsRegex = regex;
}

function filterLinks(text: string): string {
  if (!TLDsRegex) return text;
  try {
    const matches = [...text.matchAll(TLDsRegex)];
    for (const link of matches) {
      if (!link[3] && !link[4] && link[7]) {
        // likely not a web link
      } else if (link[7]) {
        text = text.replace(link[0], ' (Bad Link) ');
      } else if (link[6]) {
        text = text.replace(link[0], ' (Web Link) ');
      } else {
        text = text.replace(link[0], ' (WTF Link) ');
      }
    }
  } catch (e) {
    console.warn('filterLinks error:', e);
  }
  return text;
}

// ── Main doChat pipeline ─────────────────────────────────────────────────────

export interface DoChatContext {
  channel: string;
  sourceLanguage: string;
  targetLanguage: string;
  chatters: Record<string, ChatterConfig>;
  voices: Record<string, VoiceLookup>;
  voicesDesc: PollyVoice[];
  lastSpeaker: string;
  setLastSpeaker: (s: string) => void;
  localChattersData: Record<string, { lastMessages: { message: string; timestamp: number }[] }>;
  lastMessages: { message: string; timestamp: number }[];
  messageId: { current: number };
  settings: {
    cbSpeak: boolean;
    cbSpeakEmotesTTS: boolean;
    cbDedupEmotesTTS: boolean;
    cbTranslateEmotesTTS: boolean;
    cbAutoTranslateChat: boolean;
    cbDeleteCommands: boolean;
    cbEveryoneTTS: boolean;
    cbModTTS: boolean;
    cbSubTTS: boolean;
    cbVipTTS: boolean;
    cbReplaceAtNames: boolean;
    cbSpeakOtherAtNames: boolean;
    cbUserLevDistance: boolean;
    cbChatLevDistance: boolean;
    txtUserLevPct: number;
    txtUserLevTime: number;
    txtChatLevPct: number;
    txtChatLevTime: number;
    cbUseVoiceForSelectedLanguage: boolean;
    cbSpeakTranslation: boolean;
    cbSetLangFromLastChat: boolean;
    cbRouteChatThroughWebsocket: boolean;
    cbSendTextToWebsocket: boolean;
  };
  onAddMessage: (msg: ChatMessage) => void;
  onSpeak: (params: {
    prefix: string;
    text: string;
    userstate: TwitchUserstate;
    ssmlTextType: 'text' | 'ssml';
    messageId: number;
  }) => void;
  onSpeakCustom?: (msg: AudioMessage) => void;
  onAutoTranslate?: (username: string, translatedText: string, translatedFrom: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onRunChatCommand?: (channel: string, username: string, message: string, isMod: boolean) => void;
  onSetStsLang?: (langCode: string, voice: PollyVoice) => void;
  chatVoice?: string;
  chatVoiceOption?: string;
}

export async function doChat(
  userstate: TwitchUserstate,
  message: string,
  self: boolean,
  ctx: DoChatContext
) {
  if (self) return;

  // Ignore bot-translated messages
  if (/\(Translated from.*\)$/.test(message)) return;

  // Ignore inject-script reward
  if (userstate['custom-reward-id'] === INJECT_SCRIPT_REWARD_ID) {
    ctx.onDeleteMessage?.(userstate.id ?? '');
    return;
  }

  // Oneword guard
  if (/^(oneword|one word|!oneword)/i.test(message)) {
    ctx.messageId.current++;
    ctx.onAddMessage({
      id: ctx.messageId.current,
      type: 'system',
      message,
      allowTTS: false,
    });
    return;
  }

  let msg = message.trim() + ' ';
  const username = userstate.username;

  // Command handling
  if (/^\s*!/.test(msg)) {
    ctx.onRunChatCommand?.(ctx.channel, username, msg, userstate.mod);
    if (ctx.settings.cbDeleteCommands) {
      ctx.onDeleteMessage?.(userstate.id ?? '');
    }
    return;
  }

  // Chat routing via websocket — caller handles this upstream in onChat

  // Emote processing
  const speakEmotes = ctx.settings.cbSpeakEmotesTTS;
  const dedupEmotes = ctx.settings.cbDedupEmotesTTS;
  let matchedEmotes: RegExpMatchArray[] = [];

  if (!speakEmotes && userstate['emote-only']) {
    // will set allowTTS = false later
  } else if (!speakEmotes || (speakEmotes && dedupEmotes)) {
    const twitchEmotes: string[] = [];
    for (const key in userstate.emotes ?? {}) {
      const pos = userstate.emotes![key][0].split('-');
      twitchEmotes.push(msg.substring(parseInt(pos[0]), parseInt(pos[1]) + 1));
    }
    for (const emote of twitchEmotes) {
      const escaped = escapeRegExp(emote);
      const match = msg.match(escaped);
      if (match) matchedEmotes.push(match);
      msg = msg.replaceAll(emote, '');
    }
    for (const emote of getBttvEmotes()) {
      const match = msg.match(emote);
      if (match) matchedEmotes.push(match);
      msg = msg.replaceAll(emote, '');
    }
    for (const emote of getFfzEmotes()) {
      const match = msg.match(emote);
      if (match) matchedEmotes.push(match);
      msg = msg.replaceAll(emote, '');
    }
    matchedEmotes = matchedEmotes.filter(Boolean);
    if (speakEmotes && dedupEmotes) {
      for (const emote of matchedEmotes) msg += ' ' + emote[0];
    }
  }

  // Detect SSML
  let ssmlTextType: 'text' | 'ssml' = 'text';
  if (/(^\s*<speak>.*<\/speak>\s*$|\s*<speak>.*<\/speak>\s*p\d{1,3}\s*$)/.test(msg)) {
    ssmlTextType = 'ssml';
  }

  // Ensure chatter record
  if (!ctx.chatters[username]) {
    // caller should call ensureChatter first, but fallback:
    ctx.chatters[username] = {
      voice: ctx.voices[Object.keys(ctx.voices)[0]]?.name ?? 'Justin',
      voice_option: 'standard',
      display_name: userstate['display-name'],
      spoken_name: username,
      ttsBanned: false,
      color: userstate.color,
    };
  }

  // GPT moderation
  let allowTTS = false;
  let allowTTSmessage = '';

  if (userstate.gpt_type === 'moderation' && userstate.action) {
    const reason = userstate.action.match(/\s(.*)/);
    if (reason) {
      if (userstate.gpt_result === 'BAN') {
        allowTTS = false;
        allowTTSmessage += reason[1] + ' BAN - ';
        msg = 'THIS MESSAGE INTENTIONALLY LEFT BLANK BY AI (BAN)';
      } else if (userstate.gpt_result === 'TIMEOUT') {
        allowTTS = false;
        allowTTSmessage += reason[1] + ' TIMEOUT - ';
        msg = 'THIS MESSAGE INTENTIONALLY LEFT BLANK BY AI (TIMEOUT)';
      } else if (userstate.gpt_result === 'DOWNVOTE' || userstate.gpt_result === 'UPVOTE') {
        allowTTS = false; // will be recalculated below
      }
    }
  } else if (userstate.gpt_type === 'comical' && userstate.action) {
    allowTTSmessage += ' Speak Comic Relief - ';
    msg = `@${userstate['display-name']} ${userstate.action}`;
    allowTTS = false;
  } else {
    // Standard permission checks
    if (ctx.settings.cbEveryoneTTS) allowTTS = true;
    else if (ctx.settings.cbModTTS && userstate.mod) allowTTS = true;
    else if (ctx.settings.cbVipTTS && userstate.badges?.hasOwnProperty('vip')) allowTTS = true;
    else if (ctx.settings.cbSubTTS && userstate.subscriber) allowTTS = true;
  }

  // Emote-only block
  if (!speakEmotes && userstate['emote-only']) {
    allowTTS = false;
    allowTTSmessage += 'Message is emotes only - ';
  }

  // Comment delimiter block
  if (
    /^\s*(-|#|&lt;!--|;|\/{2})/.test(msg) ||
    /\s*@[a-zA-Z0-9_]+(\s+\s*-|\s*#|\s*&lt;!--|\s*;|\s*\/\/)/.test(msg)
  ) {
    allowTTS = false;
    allowTTSmessage += 'Commented out - ';
  }

  // TTS-banned check
  if (ctx.chatters[username]?.ttsBanned) {
    allowTTS = false;
    allowTTSmessage += 'TTS Silenced - ';
  }

  // Translate
  let translatedText = msg;
  let translatedFromMessage = '';
  let sourceLangCode = ctx.sourceLanguage;
  let identicalTranslation = false;

  if (msg.trim()) {
    try {
      const result = await translateText(msg, ctx.sourceLanguage, ctx.targetLanguage, true);
      translatedText = result.translatedText;
      sourceLangCode = result.sourceLangCode;
      identicalTranslation = msg.trim() === translatedText.trim();

      if (ctx.targetLanguage !== sourceLangCode) {
        if (ctx.targetLanguage === 'en') {
          translatedFromMessage = `Translated from ${sourceLangCode}`;
        } else {
          try {
            const t = await translateText(`Translated from ${sourceLangCode}`, 'en', ctx.targetLanguage);
            translatedFromMessage = t.translatedText;
          } catch { translatedFromMessage = `Translated from ${sourceLangCode}`; }
        }

        if (ctx.settings.cbAutoTranslateChat && !identicalTranslation) {
          ctx.onAutoTranslate?.(username, translatedText, translatedFromMessage);
        }

        if (ctx.settings.cbSetLangFromLastChat && !identicalTranslation) {
          const randomVoice = selectRandomVoiceByLanguageCode(ctx.voicesDesc, sourceLangCode);
          if (randomVoice) ctx.onSetStsLang?.(sourceLangCode, randomVoice);
        }
      }
    } catch (err) {
      console.error('Translation error:', err);
    }
  }

  let spokenText = translatedText
    .replace(/&/g, 'and')
    .replace(/_/g, ' ');

  const escapedTranslatedText = translatedText.replace(/[<>;&'"]/g, getHTMLEntityEncoding);
  const escapedMessage = msg.replace(/[<>;&'"]/g, getHTMLEntityEncoding);

  // Levenshtein dedup — per-user
  if (ctx.settings.cbUserLevDistance) {
    const userHistory = ctx.localChattersData[username];
    if (userHistory) {
      const now = Date.now();
      const maxTimeMs = ctx.settings.txtUserLevTime * 1000;
      for (const prevMsg of userHistory.lastMessages) {
        const sim = similarityPercentage(spokenText, prevMsg.message);
        if (sim > ctx.settings.txtUserLevPct && now - prevMsg.timestamp < maxTimeMs) {
          allowTTS = false;
          allowTTSmessage += `User Lev Distance ${Math.round(sim)}% - `;
          break;
        }
      }
      // Trim history
      const start = Math.max(0, userHistory.lastMessages.length - 20);
      userHistory.lastMessages = userHistory.lastMessages.slice(start);
    }
  }

  // Levenshtein dedup — global chat
  if (ctx.settings.cbChatLevDistance) {
    const now = Date.now();
    const maxTimeMs = ctx.settings.txtChatLevTime * 1000;
    for (const prevMsg of ctx.lastMessages) {
      const sim = similarityPercentage(spokenText, prevMsg.message);
      if (sim > ctx.settings.txtChatLevPct && now - prevMsg.timestamp < maxTimeMs) {
        allowTTS = false;
        allowTTSmessage += `Chat Lev Distance ${Math.round(sim)}% - `;
        break;
      }
    }
    const start = Math.max(0, ctx.lastMessages.length - 20);
    ctx.lastMessages.splice(0, ctx.lastMessages.length - start);
  }

  // @username replacement
  const userRegex = /@([A-Za-z0-9_]+)/g;
  const userMatches = [...spokenText.matchAll(userRegex)];
  const mentionedUsernames = new Set(userMatches.map(([, u]) => u));
  let bubbleText = escapedMessage;

  if (ctx.settings.cbReplaceAtNames && userMatches.length > 0) {
    for (const mentionedUser of mentionedUsernames) {
      const lower = mentionedUser.toLowerCase();
      if (ctx.chatters[lower]) {
        const spokenName = ctx.chatters[lower].spoken_name;
        const color = ctx.chatters[lower].color ?? getColorForUsername(lower);
        spokenText = spokenText.replaceAll(`@${mentionedUser}`, spokenName);
        bubbleText = bubbleText.replaceAll(
          `@${mentionedUser}`,
          `<strong style="color:${color}">@${mentionedUser}:</strong><span class="message-at-reference">(${spokenName.trim()})</span>`
        );
      }
    }
  }

  if (!ctx.settings.cbSpeakOtherAtNames && userMatches.length > 0) {
    const tmpAllow = allowTTS;
    allowTTS = false;
    allowTTSmessage = "Don't speak @ references - ";
    for (const mentionedUser of mentionedUsernames) {
      if (mentionedUser.toLowerCase() === ctx.channel) {
        if (tmpAllow) allowTTS = true;
      }
    }
  }

  // Translated bubble text
  const translatedMessageHTML =
    !identicalTranslation && ctx.targetLanguage !== sourceLangCode
      ? `${escapedTranslatedText} (${translatedFromMessage})`
      : '';

  ctx.messageId.current++;
  const msgId = ctx.messageId.current;

  const chatter = ctx.chatters[username];
  const voiceLabel = allowTTS
    ? `${chatter?.voice ?? ''} (${chatter?.voice_option ?? ''})`
    : `(${allowTTSmessage.replace(/ - $/, '')})`;

  ctx.onAddMessage({
    id: msgId,
    type: 'chat',
    username,
    displayName: userstate['display-name'],
    color: userstate.color ?? getColorForUsername(username),
    platform: userstate.platform,
    message: bubbleText,
    translatedMessage: translatedMessageHTML,
    allowTTS,
    allowTTSmessage,
    voiceName: voiceLabel,
    spokenName: chatter?.spoken_name ?? username,
  });

  if (!ctx.settings.cbSpeak || !allowTTS) {
    console.log('DENIED TTS:', allowTTSmessage, userstate);
    return;
  }

  // Filter links
  spokenText = filterLinks(spokenText);

  // Build prefix
  let platform_message = '';
  if (userstate.platform === 'Twitch Whisper') platform_message = 'Twitch Whisper';
  else if (userstate.platform && userstate.platform !== 'Twitch') platform_message = ` on ${userstate.platform}`;

  let prefix = '';
  if (userstate.chat_action) {
    ctx.setLastSpeaker('Unset-by-action');
    prefix = `<speak> ${getSpokenName(ctx.chatters, username)} </speak>`;
  } else if (ctx.lastSpeaker !== username) {
    const saysStr = `${getSpokenName(ctx.chatters, username)}${platform_message} says`;
    try {
      const t = await translateText(saysStr, 'en', ctx.targetLanguage);
      prefix = `<speak> ${t.translatedText} </speak>`;
    } catch {
      prefix = `<speak> ${saysStr} </speak>`;
    }
  }

  // Voice language matching
  let finalUserstate = { ...userstate };
  if (!msg.startsWith('~') && ctx.settings.cbUseVoiceForSelectedLanguage) {
    const chatterVoice = ctx.voices[ctx.chatters[username]?.voice ?? ''];
    if (chatterVoice && !chatterVoice.languageCode.startsWith(ctx.targetLanguage)) {
      const v = selectRandomVoiceByLanguageCode(ctx.voicesDesc, ctx.targetLanguage, chatterVoice.gender);
      if (v) {
        finalUserstate = {
          ...finalUserstate,
          tts_voice: v.Id,
          tts_voice_option: v.SupportedEngines[0],
        };
      }
    }
  }

  // Track for Levenshtein
  if (!ctx.localChattersData[username]) {
    ctx.localChattersData[username] = { lastMessages: [] };
  }
  const entry = { message: spokenText, timestamp: Date.now() };
  ctx.localChattersData[username].lastMessages.push(entry);
  ctx.lastMessages.push(entry);

  ctx.onSpeak({
    prefix,
    text: spokenText,
    userstate: finalUserstate,
    ssmlTextType,
    messageId: msgId,
  });

  ctx.setLastSpeaker(username);

  // Speak translation separately if enabled
  if (ctx.settings.cbSpeakTranslation && ctx.chatVoice && ctx.onSpeakCustom) {
    ctx.onSpeakCustom({
      text: translatedText,
      username: 'custom',
      voice: ctx.chatVoice,
      engine: ctx.chatVoiceOption,
      ssmlTextType: 'text',
      messageID: msgId,
    });
  }
}
