import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAuthStore,
  useChattersStore,
  useChatUiStore,
  useConnectionStore,
  useSettingsStore,
  useVoiceStore,
  useVoicesDataStore,
} from '../store';
import { useAWSServices } from '../hooks/useAWSServices';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useTwitchChat } from '../hooks/useTwitchChat';
import { getTwitchUser, deleteChatMessage, shoutoutUser, getTwitchUserByLogin, banUser } from '../services/twitchApiService';
import { loadFFZEmotes, loadBTTVEmotes, loadBTTVGlobalEmotes, getTwitchId } from '../services/emoteService';
import { doChat, getSpokenName } from '../services/chatProcessor';
import { translateText } from '../services/awsService';
import { loadVoiceFromApi, loadGlobalVoiceFromApi, saveTtsConfig } from '../services/ttsApiService';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { ChatFeed } from '../components/chat/ChatFeed';
import type { TwitchUserstate, ChatterConfig, AudioMessage } from '../types';

// Build TLD regex from the window global (loaded as a script in index.html)
declare const tmpTLDs: string[] | undefined;

function buildTLDRegex() {
  if (typeof tmpTLDs === 'undefined') return null;
  const sorted = [...tmpTLDs].sort((a, b) => b.length - a.length || a.localeCompare(b));
  const domains = sorted.join('|');
  return new RegExp(
    `(((([a-z]+:\\/\\/)?(www\\.)?([a-zA-Z0-9-]+\\.)+(?:${domains})(?:\\w*)?))\\b.*)`,
    'g'
  );
}

export default function StreamerDashboard() {
  const navigate = useNavigate();
  const { accessToken, twitchUsername, setTwitchUsername } = useAuthStore();
  const { connectionStatus, channel, setChannel, setConnectionStatus } = useConnectionStore();
  const { chatters, setChatter, updateChatter } = useChattersStore();
  const { queueCount, isPaused, setIsPaused, addMessage, clearMessages } = useChatUiStore();
  const { voices, voicesDesc } = useVoicesDataStore();
  const settings = useSettingsStore();
  const voiceStore = useVoiceStore();

  const { initialized } = useAWSServices();
  const player = useAudioPlayer();

  const [showSettings, setShowSettings] = useState(false);
  const [connected, setConnected] = useState(false);
  const [twitchId, setTwitchId] = useState(0);
  const [twitchUserId, setTwitchUserId] = useState('');
  const [channelInput, setChannelInput] = useState(channel);
  const [sendMessage, setSendMessage] = useState('');
  const [vrActive, setVrActive] = useState(false);
  const [streamerSpeaking, setStreamerSpeaking] = useState(false);

  const messageIdRef = useRef({ current: 0 });
  const lastSpeakerRef = useRef('');
  const localChattersDataRef = useRef<Record<string, { lastMessages: { message: string; timestamp: number }[] }>>({});
  const lastMessagesRef = useRef<{ message: string; timestamp: number }[]>([]);
  const twitchClientRef = useRef<any>(null);
  const websocketCustomRef = useRef<WebSocket | null>(null);
  const websocketProdRef = useRef<WebSocket | null>(null);

  // ── Auth check ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }
    // Fetch Twitch user info
    getTwitchUser(accessToken).then((user) => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      setTwitchUsername(user.login);
      setTwitchUserId(user.id);
      if (!channel) setChannel(user.login);
      setChannelInput(channel || user.login);
    });
  }, [accessToken]);

  // ── TLD Regex setup ──────────────────────────────────────────────────────

  useEffect(() => {
    const regex = buildTLDRegex();
    if (regex) {
      // Import setTLDsRegex lazily to avoid circular imports
      import('../services/chatProcessor').then(({ setTLDsRegex }) => setTLDsRegex(regex));
    }
  }, []);

  // ── Ensure chatter record ────────────────────────────────────────────────

  const ensureChatter = useCallback(async (username: string, userstate: Partial<TwitchUserstate>): Promise<ChatterConfig> => {
    if (chatters[username]) return chatters[username];

    // Try channel-specific config first, then global
    const channelConfig = await loadVoiceFromApi(channel || channelInput, username);
    if (channelConfig) {
      const newChatter: ChatterConfig = {
        voice: channelConfig.voice,
        voice_option: channelConfig.voice_option,
        display_name: channelConfig.display_name || userstate['display-name'] || username,
        spoken_name: channelConfig.spoken_name,
        ttsBanned: channelConfig.ttsBanned,
        color: userstate.color,
      };
      setChatter(username, newChatter);
      return newChatter;
    }

    const globalConfig = await loadGlobalVoiceFromApi(username);
    if (globalConfig) {
      const newChatter: ChatterConfig = {
        voice: globalConfig.voice,
        voice_option: globalConfig.voice_option,
        display_name: globalConfig.display_name || userstate['display-name'] || username,
        spoken_name: globalConfig.spoken_name,
        ttsBanned: globalConfig.ttsBanned,
        color: userstate.color,
      };
      setChatter(username, newChatter);
      return newChatter;
    }

    // Fall back to defaults
    const newChatter: ChatterConfig = {
      voice: voiceStore.defaultChatterVoice.toLowerCase(),
      voice_option: voiceStore.defaultChatterVoiceOption,
      display_name: userstate['display-name'] ?? username,
      spoken_name: username,
      ttsBanned: false,
      color: userstate.color,
    };
    setChatter(username, newChatter);
    return newChatter;
  }, [chatters, channel, channelInput, voiceStore.defaultChatterVoice, voiceStore.defaultChatterVoiceOption, setChatter]);

  // ── WebSocket management ─────────────────────────────────────────────────

  const websocketCustomConnect = useCallback(() => {
    const url = settings.txtWebsocketURL;
    if (!url) return;

    try {
      const ws = new WebSocket(url);
      websocketCustomRef.current = ws;

      ws.onopen = () => {
        console.log('Custom WS connected');
        localStorage.setItem('websocketURL', url);
      };

      ws.onmessage = (event) => {
        try {
          const command = JSON.parse(event.data);
          if (command.topic === 'TTS') {
            player.SpeakNow(command.text, command.username, 'text', command.voice);
          } else if (command.topic === 'game2tts') {
            setChatter(command.speaker, {
              voice: command.voice, voice_option: command.voice_option,
              display_name: command.speaker, spoken_name: command.speaker, ttsBanned: false,
            });
            player.SpeakGame2TTS(command.speaker, command.text, command.voice, command.voice_option);
          } else if (command.topic === 'GPT-Moderated') {
            handleChat(channel, command.userstate, command.message, false);
          } else {
            player.SpeakNow(`<speak>${event.data}</speak>`, 'system', 'ssml');
          }
        } catch { }
      };

      ws.onclose = () => setTimeout(websocketCustomConnect, 1000);
      ws.onerror = () => ws.close();
    } catch (err) {
      console.error('Custom WS connect error:', err);
    }
  }, [settings.txtWebsocketURL, channel]);

  const websocketAWSConnect = useCallback(() => {
    const url = settings.txtAWSWebsocketURL;
    if (!url) return;

    const ws = new WebSocket(`${url}/?channel=${channel}`);
    websocketProdRef.current = ws;

    ws.onopen = () => {
      localStorage.setItem('AWSWebsocketURL', url);
      ws.send(JSON.stringify({
        action: 'start',
        language: voiceStore.dstLangSelect,
        channel,
        access_token: accessToken,
        time: Date.now(),
      }));
    };

    ws.onclose = () => setTimeout(websocketAWSConnect, 1000);
    ws.onerror = () => ws.close();
  }, [settings.txtAWSWebsocketURL, channel, accessToken, voiceStore.dstLangSelect]);

  // ── Chat handler ─────────────────────────────────────────────────────────

  const handleChat = useCallback(async (
    ch: string,
    userstate: any,
    message: string,
    self: boolean
  ) => {
    const username = userstate.username as string;
    const chatter = await ensureChatter(username, userstate);

    const enrichedUserstate: TwitchUserstate = {
      ...userstate,
      platform: userstate.platform ?? 'Twitch',
      tts_voice: chatter.voice,
      tts_voice_option: chatter.voice_option,
      tts_spoken_name: chatter.spoken_name,
    };

    // Route through websocket if enabled
    if (settings.cbRouteChatThroughWebsocket && settings.cbSendTextToWebsocket &&
      websocketCustomRef.current?.readyState === WebSocket.OPEN) {
      websocketCustomRef.current.send(JSON.stringify({
        action: 'tts.bot-Chat', channel: ch, userstate: enrichedUserstate, message, time: Date.now(),
      }));
      return;
    }

    await doChat(enrichedUserstate, message, self, {
      channel: ch.replace('#', ''),
      sourceLanguage: voiceStore.srcLangSelect,
      targetLanguage: voiceStore.dstLangSelect,
      chatters,
      voices,
      voicesDesc,
      lastSpeaker: lastSpeakerRef.current,
      setLastSpeaker: (s) => { lastSpeakerRef.current = s; },
      localChattersData: localChattersDataRef.current,
      lastMessages: lastMessagesRef.current,
      messageId: messageIdRef.current,
      settings: {
        cbSpeak: settings.cbSpeak,
        cbSpeakEmotesTTS: settings.cbSpeakEmotesTTS,
        cbDedupEmotesTTS: settings.cbDedupEmotesTTS,
        cbTranslateEmotesTTS: settings.cbTranslateEmotesTTS,
        cbAutoTranslateChat: settings.cbAutoTranslateChat,
        cbDeleteCommands: settings.cbDeleteCommands,
        cbEveryoneTTS: settings.cbEveryoneTTS,
        cbModTTS: settings.cbModTTS,
        cbSubTTS: settings.cbSubTTS,
        cbVipTTS: settings.cbVipTTS,
        cbReplaceAtNames: settings.cbReplaceAtNames,
        cbSpeakOtherAtNames: settings.cbSpeakOtherAtNames,
        cbUserLevDistance: settings.cbUserLevDistance,
        cbChatLevDistance: settings.cbChatLevDistance,
        txtUserLevPct: settings.txtUserLevPct,
        txtUserLevTime: settings.txtUserLevTime,
        txtChatLevPct: settings.txtChatLevPct,
        txtChatLevTime: settings.txtChatLevTime,
        cbUseVoiceForSelectedLanguage: settings.cbUseVoiceForSelectedLanguage,
        cbSpeakTranslation: settings.cbSpeakTranslation,
        cbSetLangFromLastChat: settings.cbSetLangFromLastChat,
        cbRouteChatThroughWebsocket: settings.cbRouteChatThroughWebsocket,
        cbSendTextToWebsocket: settings.cbSendTextToWebsocket,
      },
      onAddMessage: addMessage,
      onSpeak: ({ prefix, text, userstate: us, ssmlTextType, messageId }) => {
        player.Speak(prefix, text, '', us as any, ssmlTextType, messageId);
      },
      onSpeakCustom: (msg: AudioMessage) => player.SpeakCustom(msg),
      onRunChatCommand: (ch, username, message, isMod) => {
        handleRunChatCommand(ch, username, message, isMod);
      },
      onAutoTranslate: (username, translatedText, from) => {
        twitchClientRef.current?.say(channel, `${chatters[username]?.display_name ?? username}: ${translatedText} (${from})`);
      },
      onDeleteMessage: (msgId) => {
        if (msgId) deleteChatMessage(twitchId.toString(), twitchUserId, msgId, accessToken);
      },
      chatVoice: voiceStore.chatVoice,
      chatVoiceOption: voiceStore.chatVoiceOption,
    });
  }, [chatters, voices, voicesDesc, voiceStore, settings, channel, twitchId, twitchUserId, accessToken, addMessage, player, ensureChatter]);

  // ── Event handlers ───────────────────────────────────────────────────────

  const onConnecting = useCallback(() => {
    messageIdRef.current.current++;
    addMessage({ id: messageIdRef.current.current, type: 'system', message: 'Connecting…', allowTTS: false });
  }, [addMessage]);

  const onConnected = useCallback(async () => {
    const targetLang = voiceStore.dstLangSelect;
    let msg = `<speak>Connected to channel ${getSpokenName(chatters, channel)}.</speak>`;
    try {
      const t = await translateText(msg, 'en', targetLang);
      msg = t.translatedText;
    } catch { }
    messageIdRef.current.current++;
    addMessage({ id: messageIdRef.current.current, type: 'system', message: 'Connected ✓', allowTTS: false });
    player.Speak('', msg, '', { username: 'system' } as any, 'ssml', messageIdRef.current.current);
    setChannel(channelInput);
  }, [voiceStore.dstLangSelect, chatters, channel, addMessage, player, channelInput, setChannel]);

  const onSub = useCallback(async (...args: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const systemMsg = args[4]?.['system-msg'];
      if (!systemMsg) return;
      messageIdRef.current.current++;
      addMessage({ id: messageIdRef.current.current, type: 'system', message: systemMsg, allowTTS: true });
      player.Speak('', systemMsg, '', { username: 'system' } as any, 'text', messageIdRef.current.current);

      if (!args[4]?.['msg-id']?.includes('gift') && args[3]) {
        const username = args[4]['display-name'];
        const chatter = await ensureChatter(username, args[4]);
        messageIdRef.current.current++;
        addMessage({ id: messageIdRef.current.current, type: 'chat', username, displayName: username, message: args[3], allowTTS: true });
        player.Speak(
          `<speak>Sub message from ${getSpokenName(chatters, username)} says </speak>`,
          args[3], '', { username, tts_voice: chatter.voice, tts_voice_option: chatter.voice_option } as any,
          'text', messageIdRef.current.current
        );
      }
    } catch (e) { console.error('onSub error:', e); }
  }, [addMessage, player, chatters, ensureChatter]);

  const onGiftSub = useCallback(async (...args: any[]) => {
    try {
      const systemMsg = args[5]?.['system-msg'];
      if (!systemMsg) return;
      messageIdRef.current.current++;
      addMessage({ id: messageIdRef.current.current, type: 'system', message: systemMsg, allowTTS: true });
      player.Speak('', systemMsg, '', { username: 'system' } as any, 'text', messageIdRef.current.current);
    } catch (e) { console.error('onGiftSub error:', e); }
  }, [addMessage, player]);

  const onRaid = useCallback(async (_ch: string, raider: string, viewers: string, _tags: any) => {
    try {
      const systemMsg = (`${raider} raided with ${viewers} viewers`).replace('_', ' ');
      messageIdRef.current.current++;
      addMessage({ id: messageIdRef.current.current, type: 'system', message: systemMsg, allowTTS: true });
      player.Speak('', systemMsg, '', { username: 'system' } as any, 'text', messageIdRef.current.current);

      if (settings.cbAutoShoutoutRaids && twitchUserId) {
        const raiderId = await getTwitchUserByLogin(raider, accessToken);
        if (raiderId) shoutoutUser(twitchUserId, raiderId, twitchUserId, accessToken);
      }
    } catch (e) { console.error('onRaid error:', e); }
  }, [addMessage, player, settings.cbAutoShoutoutRaids, twitchUserId, accessToken]);

  const onBan = useCallback((_ch: string, username: string, _reason: string) => {
    player.SpeakNext(`<speak>Hey chat, ${username} was banned, thought you should know.</speak>`, 'system', 'ssml');
  }, [player]);

  const onCheer = useCallback(async (_ch: string, userstate: any, message: string) => {
    const username = userstate.username;
    const chatter = await ensureChatter(username, userstate);
    const systemMsg = `${userstate['display-name']} just cheered ${userstate.bits} bits, thank you so much!`;
    messageIdRef.current.current++;
    addMessage({ id: messageIdRef.current.current, type: 'system', message: systemMsg, allowTTS: true });
    player.Speak('', systemMsg, '', { username: 'system' } as any, 'text', messageIdRef.current.current);

    messageIdRef.current.current++;
    addMessage({ id: messageIdRef.current.current, type: 'chat', username, displayName: userstate['display-name'], message, allowTTS: true });
    player.Speak(
      `<speak>${getSpokenName(chatters, username)} says </speak>`,
      message, '', { username, tts_voice: chatter.voice, tts_voice_option: chatter.voice_option } as any,
      'text', messageIdRef.current.current
    );
  }, [addMessage, player, chatters, ensureChatter]);

  const onWhisper = useCallback(async (from: string, userstate: any, message: string, self: boolean) => {
    if (self || !settings.cbReadWhispers) return;
    const username = from.replace('#', '').trim();
    const chatter = await ensureChatter(username, userstate);
    const prefix = `<speak>${getSpokenName(chatters, username)} whispers </speak>`;
    messageIdRef.current.current++;
    addMessage({ id: messageIdRef.current.current, type: 'chat', username, displayName: username, message, allowTTS: true });
    player.Speak(prefix, message, '', { username, tts_voice: chatter.voice, tts_voice_option: chatter.voice_option } as any, 'text', messageIdRef.current.current);
  }, [settings.cbReadWhispers, chatters, addMessage, player, ensureChatter]);

  // ── Connect ──────────────────────────────────────────────────────────────

  const handleConnect = useCallback(async () => {
    if (!channelInput.trim() || !accessToken) return;
    clearMessages();
    lastSpeakerRef.current = '';
    localChattersDataRef.current = {};
    lastMessagesRef.current = [];
    setChannel(channelInput.trim());
    setConnected(true);

    await loadFFZEmotes(twitchUsername);
    await loadBTTVEmotes();
    await loadBTTVGlobalEmotes();
    setTwitchId(getTwitchId());

    if (settings.cbSendTextToWebsocket) websocketCustomConnect();
    if (settings.cbSendTextToAWSWebsocket) websocketAWSConnect();
  }, [channelInput, accessToken, twitchUsername, settings, clearMessages, setChannel, websocketCustomConnect, websocketAWSConnect]);

  // ── Twitch chat hook ─────────────────────────────────────────────────────

  const chatClient = useTwitchChat({
    channel: channelInput,
    username: twitchUsername,
    accessToken,
    enabled: connected,
    onChat: handleChat,
    onAction: (ch, us, msg, self) => { (us as any).chat_action = true; handleChat(ch, us, msg, self); },
    onSub,
    onGiftSub,
    onRaid,
    onBan,
    onCheer,
    onWhisper,
    onConnecting,
    onConnected,
    onUsernotice: (msgid, _ch, _tags, msg) => console.log('usernotice:', msgid, msg),
    setConnectionStatus,
  });

  twitchClientRef.current = chatClient.current;

  // ── Voice Recognition ─────────────────────────────────────────────────────

  useVoiceRecognition({
    enabled: connected && vrActive,
    lang: voiceStore.dstLangSelect,
    stsEnabled: settings.cbSTS,
    stsLang: voiceStore.stsLang,
    stsVoice: voiceStore.stsVoice,
    stsVoiceOption: voiceStore.stsVoiceOption,
    sendSpeechTranslation: settings.cbSendSpeechTranslation,
    pauseOnSpeech: settings.cbPauseTTSOnSpeech,
    poofEnabled: settings.cbPoofMessage,
    poofRegex: settings.txtPoofRegex,
    banHammerEnabled: settings.cbBanHammer,
    banRegex: settings.txtBanRegex,
    banConfirmRegex: settings.txtBanConfirmRegex,
    useFinalResultsOnly: settings.cbUseFinalResultsOnly,
    waitTimeSec: settings.txtTTSWaitTime,
    channel,
    customWsReady: settings.cbSendTextToWebsocket && websocketCustomRef.current?.readyState === WebSocket.OPEN,
    awsWsReady: settings.cbSendTextToAWSWebsocket && websocketProdRef.current?.readyState === WebSocket.OPEN,
    chatters,
    player,
    onStreamerSpeaking: (speaking) => {
      setStreamerSpeaking(speaking);
      player.setStreamerSpeaking(speaking);
    },
    onAddMessage: (text, translated) => {
      messageIdRef.current.current++;
      addMessage({
        id: messageIdRef.current.current,
        type: 'chat',
        username: 'sts',
        displayName: channel,
        message: text,
        translatedMessage: translated || undefined,
        allowTTS: true,
        voiceName: `${voiceStore.stsVoice} (${voiceStore.stsVoiceOption})`,
        spokenName: channel,
      });
    },
    onSendToCustomWs: (text, isFinal, started, ended, confidence) => {
      if (websocketCustomRef.current?.readyState === WebSocket.OPEN) {
        websocketCustomRef.current.send(JSON.stringify({
          action: 'spokenText', text, isFinal, started, finished: ended, confidence, time: Date.now(),
        }));
      }
    },
    onSendToAwsWs: (text, isFinal, started, ended, confidence) => {
      if (websocketProdRef.current?.readyState === WebSocket.OPEN) {
        websocketProdRef.current.send(JSON.stringify({
          action: 'sendmessage', channel, language: voiceStore.dstLangSelect,
          message: text, started, finished: ended, confidence, isFinal, time: Date.now(),
        }));
      }
    },
    onSaySts: (text) => {
      twitchClientRef.current?.say(channel, text);
    },
  });

  // ── Pause / Skip ─────────────────────────────────────────────────────────

  const handlePause = () => {
    if (player.isPaused()) {
      player.Continue();
      setIsPaused(false);
    } else {
      player.Pause();
      setIsPaused(true);
    }
  };

  const handleSkip = () => player.Skip();
  const handleDump = () => player.Dump();

  const handleReadClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      messageIdRef.current.current++;
      addMessage({ id: messageIdRef.current.current, type: 'system', message: text, allowTTS: true });
      player.Speak('', text, '', { username: 'system' } as any, 'text', messageIdRef.current.current);
    } catch (err) { console.error('Clipboard read failed:', err); }
  };

  const handleSendMessage = async () => {
    if (!sendMessage.trim() || !twitchClientRef.current) return;
    try {
      const targetLang = settings.chatLangSelect;
      let textToSend = sendMessage;
      if (targetLang && targetLang !== 'auto') {
        try {
          const result = await translateText(sendMessage, 'auto', targetLang);
          textToSend = result.translatedText;
        } catch { /* send original if translation fails */ }
      }
      await twitchClientRef.current.say(channel, textToSend);
      setSendMessage('');
      // Show in chat feed
      messageIdRef.current.current++;
      addMessage({
        id: messageIdRef.current.current,
        type: 'chat',
        username: twitchUsername,
        displayName: twitchUsername,
        message: sendMessage,
        translatedMessage: textToSend !== sendMessage ? textToSend : undefined,
        allowTTS: false,
        allowTTSmessage: 'Local send',
      });
    } catch (err) { console.error('Send failed:', err); }
  };

  const handleRunChatCommand = useCallback((ch: string, username: string, message: string, isMod: boolean) => {
    const isOwner = username === ch;
    const chatter = chatters[username];
    const voicesCurrent = voices;
    const voicesDescCurrent = voicesDesc;

    if (message.startsWith('!setvoice')) {
      const parts = message.trim().split(' ');
      if (parts.length < 2) return;
      let voice = parts[1];
      let voiceOption = parts.length > 2 ? parts[2] : (chatter?.voice_option ?? voiceStore.defaultChatterVoiceOption);

      // Allow numeric index
      if (/^\d+$/.test(voice)) {
        const idx = parseInt(voice);
        voice = voicesDescCurrent[idx]?.Id ?? voice;
      }
      voice = voice.toLowerCase();
      if (!voicesCurrent[voice]) voice = voiceStore.defaultChatterVoice.toLowerCase();
      const supportedOptions = voicesCurrent[voice]?.voiceOptions ?? ['standard'];
      if (!supportedOptions.includes(voiceOption)) voiceOption = supportedOptions[0];

      const updated = { ...chatters[username], voice, voice_option: voiceOption };
      setChatter(username, updated);
      saveTtsConfig(ch, username, { ...updated, display_name: updated.display_name }, accessToken);

    } else if (message.startsWith('!setspoken') || message.startsWith('!setname')) {
      const spoken = message.replace(/^!(setspoken|setname)\s*/, '').trim() || username;
      const updated = { ...chatters[username], spoken_name: spoken };
      setChatter(username, updated);
      saveTtsConfig(ch, username, { ...updated, display_name: updated.display_name }, accessToken);

    } else if (message.startsWith('!voices')) {
      twitchClientRef.current?.action(ch, 'Configure your voice at: https://tts.bot/viewer');

    } else if (message.startsWith('!poof') || message.startsWith('!poop') || message.startsWith('!pop')) {
      player.PopLastMessage(username);

    } else if (message.startsWith('!ttsdump') || message.startsWith('!dump')) {
      const parts = message.trim().split(' ');
      if (parts.length < 2 && (isMod || isOwner)) {
        player.Dump();
      } else if (parts.length > 1 && (isMod || isOwner)) {
        player.DumpByUser(parts[1]);
      } else {
        player.DumpByUser(username);
      }

    } else if (message.startsWith('!ttsban') && (isMod || isOwner)) {
      const target = message.split(' ')[1]?.replace('@', '').toLowerCase();
      if (target) {
        player.DumpByUser(target);
        updateChatter(target, { ttsBanned: true });
        if (chatters[target]) {
          saveTtsConfig(ch, target, { ...chatters[target], ttsBanned: true, display_name: chatters[target].display_name }, accessToken);
        }
      }

    } else if (message.startsWith('!ttsunban') && (isMod || isOwner)) {
      const target = message.split(' ')[1]?.replace('@', '').toLowerCase();
      if (target) {
        updateChatter(target, { ttsBanned: false });
        if (chatters[target]) {
          saveTtsConfig(ch, target, { ...chatters[target], ttsBanned: false, display_name: chatters[target].display_name }, accessToken);
        }
      }

    } else if ((message.startsWith('!tts-pause') || message.startsWith('!ttspause')) && (isMod || isOwner)) {
      if (!player.isPaused()) {
        player.Pause();
        setIsPaused(true);
      }

    } else if ((message.startsWith('!tts-unpause') || message.startsWith('!ttsunpause')) && (isMod || isOwner)) {
      if (player.isPaused()) {
        player.Continue();
        setIsPaused(false);
      }
    }
  }, [chatters, voices, voicesDesc, voiceStore, player, accessToken, setChatter, updateChatter, setIsPaused]);

  const handleTtsBan = (username: string) => {
    updateChatter(username, { ttsBanned: true });
    if (chatters[username]) {
      saveTtsConfig(channel || channelInput, username, {
        ...chatters[username], ttsBanned: true, display_name: chatters[username].display_name,
      }, accessToken);
    }
  };

  const handleBan = async (username: string) => {
    if (!twitchUserId) return;
    const userId = await getTwitchUserByLogin(username, accessToken);
    if (userId) banUser(twitchUserId, twitchUserId, userId, accessToken);
  };

  const statusColor = connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'secondary';

  return (
    <div className="d-flex flex-column vh-100 bg-dark text-white">
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="topbar d-flex align-items-center gap-2 p-2 border-bottom border-secondary flex-shrink-0">
        <span className="fw-bold me-2">tts.bot</span>

        <span className={`badge bg-${statusColor} me-2`}>{connectionStatus}</span>

        {!connected && (
          <>
            <input
              type="text"
              className="form-control form-control-sm bg-dark text-white"
              style={{ width: 160 }}
              value={channelInput}
              placeholder="Channel"
              onChange={(e) => setChannelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={handleConnect}
              disabled={!initialized || !accessToken}
            >
              Go
            </button>
          </>
        )}

        {connected && (
          <span className="text-muted small">#{channelInput}</span>
        )}

        <div className="ms-auto d-flex gap-1 align-items-center">
          {streamerSpeaking && <span className="badge bg-info me-1">🎙 Speaking</span>}
          <span className="badge bg-secondary me-1">Queue: {queueCount}</span>
          <button className="btn btn-sm btn-outline-secondary" onClick={handlePause} title={isPaused ? 'Resume' : 'Pause'}>
            <i className={`fa fa-${isPaused ? 'play' : 'pause'}`} />
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={handleSkip} title="Skip">
            <i className="fa fa-forward-step" />
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={handleDump} title="Clear queue">
            <i className="fa fa-trash" />
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={handleReadClipboard} title="Read clipboard">
            <i className="fa fa-clipboard" />
          </button>
          {connected && (settings.cbVoiceRecognition || settings.cbPauseTTSOnSpeech) && (
            <button
              className={`btn btn-sm ${vrActive ? 'btn-danger' : 'btn-outline-secondary'}`}
              onClick={() => setVrActive((v) => !v)}
              title={vrActive ? 'Stop Voice Recognition' : 'Start Voice Recognition'}
            >
              <i className="fa fa-microphone" />
            </button>
          )}
          <button
            className={`btn btn-sm ${showSettings ? 'btn-secondary' : 'btn-outline-secondary'}`}
            onClick={() => setShowSettings((s) => !s)}
            title="Settings"
          >
            <i className="fa fa-gear" />
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-grow-1 d-flex overflow-hidden">
        {showSettings ? (
          <div className="w-100 h-100 overflow-hidden">
            <SettingsPanel channel={channelInput} onClose={() => setShowSettings(false)} />
          </div>
        ) : (
          <div className="d-flex flex-column flex-grow-1 overflow-hidden">
            <ChatFeed player={player} onTtsBan={handleTtsBan} onBan={handleBan} />

            {/* ── Message composer ──────────────────────────────────── */}
            {connected && (
              <div className="d-flex gap-2 p-2 border-top border-secondary flex-shrink-0">
                <input
                  type="text"
                  className="form-control form-control-sm bg-dark text-white"
                  value={sendMessage}
                  placeholder="Send a message…"
                  onChange={(e) => setSendMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="btn btn-sm btn-primary" onClick={handleSendMessage}>Send</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
