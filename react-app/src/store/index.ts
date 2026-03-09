import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ChatterConfig,
  ChatMessage,
  ConnectionStatus,
  AppearanceSettings,
  PollyVoice,
  VoiceLookup,
} from '../types';
import { DEFAULT_SYSTEM_VOICE, DEFAULT_CHATTER_VOICE } from '../constants';

// ─── Persisted state ────────────────────────────────────────────────────────

interface AuthState {
  accessToken: string;
  twitchUsername: string;
  setAccessToken: (token: string) => void;
  setTwitchUsername: (username: string) => void;
  clearAuth: () => void;
}

interface VoiceState {
  systemVoice: string;
  systemVoiceOption: string;
  defaultChatterVoice: string;
  defaultChatterVoiceOption: string;
  stsVoice: string;
  stsVoiceOption: string;
  stsLang: string;
  chatVoice: string;
  chatVoiceOption: string;
  dstLangSelect: string;
  srcLangSelect: string;
  setVoice: (key: keyof Omit<VoiceState, SetVoiceKeys>, value: string) => void;
}
type SetVoiceKeys = 'setVoice';

interface ChattersState {
  chatters: Record<string, ChatterConfig>;
  setChatters: (chatters: Record<string, ChatterConfig>) => void;
  setChatter: (username: string, config: ChatterConfig) => void;
  updateChatter: (username: string, patch: Partial<ChatterConfig>) => void;
}

interface SettingsState {
  cbEveryoneTTS: boolean;
  cbModTTS: boolean;
  cbSubTTS: boolean;
  cbVipTTS: boolean;
  cbSpeak: boolean;
  cbSpeakEmotesTTS: boolean;
  cbDedupEmotesTTS: boolean;
  cbTranslateEmotesTTS: boolean;
  cbAutoTranslateChat: boolean;
  cbDeleteCommands: boolean;
  cbReadWhispers: boolean;
  cbReadWhispersModsOnly: boolean;
  cbActuallyWhisperWhispers: boolean;
  cbAutoShoutoutRaids: boolean;
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
  txtWebsocketURL: string;
  cbSendTextToAWSWebsocket: boolean;
  txtAWSWebsocketURL: string;
  cbPauseTTSOnSpeech: boolean;
  cbSTS: boolean;
  cbSendSpeechTranslation: boolean;
  cbVoiceRecognition: boolean;
  cbPoofMessage: boolean;
  txtPoofRegex: string;
  cbBanHammer: boolean;
  txtBanRegex: string;
  txtBanConfirmRegex: string;
  cbUseFinalResultsOnly: boolean;
  txtTTSWaitTime: number;
  chatLangSelect: string;
  setSetting: <K extends keyof Omit<SettingsState, 'setSetting'>>(key: K, value: SettingsState[K]) => void;
}

interface AppearanceState extends AppearanceSettings {
  setAppearance: <K extends keyof Omit<AppearanceState, 'setAppearance'>>(key: K, value: AppearanceState[K]) => void;
}

// ─── Session-only state (not persisted) ─────────────────────────────────────

interface ConnectionState {
  channel: string;
  connectionStatus: ConnectionStatus;
  setChannel: (channel: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

interface ChatUiState {
  messages: ChatMessage[];
  queueCount: number;
  isPaused: boolean;
  currentSpeakingId: number;
  addMessage: (msg: ChatMessage) => void;
  setQueueCount: (count: number) => void;
  setIsPaused: (paused: boolean) => void;
  setCurrentSpeakingId: (id: number) => void;
  clearMessages: () => void;
}

interface VoicesDataState {
  voices: Record<string, VoiceLookup>;
  voicesDesc: PollyVoice[];
  awsInitialized: boolean;
  setVoicesData: (voices: Record<string, VoiceLookup>, desc: PollyVoice[]) => void;
  setAwsInitialized: (initialized: boolean) => void;
}

// ─── Store creation ──────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: localStorage.getItem('access_token') ?? '',
      twitchUsername: '',
      setAccessToken: (token) => set({ accessToken: token }),
      setTwitchUsername: (username) => set({ twitchUsername: username }),
      clearAuth: () => set({ accessToken: '', twitchUsername: '' }),
    }),
    { name: 'tts-auth', storage: createJSONStorage(() => localStorage) }
  )
);

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      systemVoice: DEFAULT_SYSTEM_VOICE,
      systemVoiceOption: 'neural',
      defaultChatterVoice: DEFAULT_CHATTER_VOICE,
      defaultChatterVoiceOption: 'standard',
      stsVoice: DEFAULT_SYSTEM_VOICE,
      stsVoiceOption: 'neural',
      stsLang: 'en',
      chatVoice: DEFAULT_CHATTER_VOICE,
      chatVoiceOption: 'standard',
      dstLangSelect: navigator.language?.substring(0, 2) ?? 'en',
      srcLangSelect: 'auto',
      setVoice: (key, value) => set({ [key]: value }),
    }),
    { name: 'tts-voice', storage: createJSONStorage(() => localStorage) }
  )
);

export const useChattersStore = create<ChattersState>()(
  persist(
    (set) => ({
      chatters: {
        system: {
          voice: 'brian',
          voice_option: 'neural',
          display_name: 'System',
          spoken_name: 'System',
          ttsBanned: false,
        },
        gpt: {
          voice: 'gregory',
          voice_option: 'neural',
          display_name: 'ChatGPT',
          spoken_name: 'ChatGPT 4o Mini',
          ttsBanned: false,
        },
      },
      setChatters: (chatters) => set({ chatters }),
      setChatter: (username, config) =>
        set((state) => ({ chatters: { ...state.chatters, [username]: config } })),
      updateChatter: (username, patch) =>
        set((state) => ({
          chatters: {
            ...state.chatters,
            [username]: { ...state.chatters[username], ...patch },
          },
        })),
    }),
    { name: 'tts-chatters', storage: createJSONStorage(() => localStorage) }
  )
);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cbEveryoneTTS: false,
      cbModTTS: false,
      cbSubTTS: false,
      cbVipTTS: false,
      cbSpeak: true,
      cbSpeakEmotesTTS: false,
      cbDedupEmotesTTS: false,
      cbTranslateEmotesTTS: false,
      cbAutoTranslateChat: true,
      cbDeleteCommands: false,
      cbReadWhispers: false,
      cbReadWhispersModsOnly: false,
      cbActuallyWhisperWhispers: false,
      cbAutoShoutoutRaids: false,
      cbReplaceAtNames: true,
      cbSpeakOtherAtNames: false,
      cbUserLevDistance: false,
      cbChatLevDistance: false,
      txtUserLevPct: 75,
      txtUserLevTime: 300,
      txtChatLevPct: 75,
      txtChatLevTime: 300,
      cbUseVoiceForSelectedLanguage: false,
      cbSpeakTranslation: false,
      cbSetLangFromLastChat: false,
      cbRouteChatThroughWebsocket: false,
      cbSendTextToWebsocket: false,
      txtWebsocketURL: '',
      cbSendTextToAWSWebsocket: false,
      txtAWSWebsocketURL: '',
      cbPauseTTSOnSpeech: false,
      cbSTS: false,
      cbSendSpeechTranslation: false,
      cbVoiceRecognition: false,
      cbPoofMessage: false,
      txtPoofRegex: 'poof|pop|skip',
      cbBanHammer: false,
      txtBanRegex: 'ban hammer',
      txtBanConfirmRegex: 'confirm ban',
      cbUseFinalResultsOnly: false,
      txtTTSWaitTime: 2,
      chatLangSelect: 'en',
      setSetting: (key, value) => set({ [key]: value }),
    }),
    { name: 'tts-settings', storage: createJSONStorage(() => localStorage) }
  )
);

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      fontFamily: 'Arial',
      fontWeight: '900',
      fontSize: 48,
      fontColor: '#ffffff',
      fontColorOpacity: 1,
      webkitTextStrokeSize: 2,
      webkitTextStrokeColor: '#000000',
      webkitTextStrokeColorOpacity: 1,
      bubbleBackgroundColor: '#000000',
      bubbleBackgroundOpacity: 0,
      borderColor: '#ffffff',
      borderColorOpacity: 1,
      borderWidth: 0,
      borderLineStyle: 'solid',
      borderRadius: 0,
      hrColor: '#ffffff',
      hrColorOpacity: 0.3,
      outlineColor: '#000000',
      outlineColorOpacity: 1,
      outlineOffset: 0,
      shadowColor: '#000000',
      shadowColorOpacity: 1,
      shadowOffsetHorizontal: 2,
      shadowOffsetVertical: 2,
      shadowBlur: 4,
      setAppearance: (key, value) => set({ [key]: value }),
    }),
    { name: 'tts-appearance', storage: createJSONStorage(() => localStorage) }
  )
);

export const useConnectionStore = create<ConnectionState>()((set) => ({
  channel: '',
  connectionStatus: 'disconnected',
  setChannel: (channel) => set({ channel }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));

export const useChatUiStore = create<ChatUiState>()((set) => ({
  messages: [],
  queueCount: 0,
  isPaused: false,
  currentSpeakingId: 0,
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages.slice(-200), msg],
    })),
  setQueueCount: (count) => set({ queueCount: count }),
  setIsPaused: (paused) => set({ isPaused: paused }),
  setCurrentSpeakingId: (id) => set({ currentSpeakingId: id }),
  clearMessages: () => set({ messages: [] }),
}));

export const useVoicesDataStore = create<VoicesDataState>()((set) => ({
  voices: {},
  voicesDesc: [],
  awsInitialized: false,
  setVoicesData: (voices, voicesDesc) => set({ voices, voicesDesc }),
  setAwsInitialized: (initialized) => set({ awsInitialized: initialized }),
}));
