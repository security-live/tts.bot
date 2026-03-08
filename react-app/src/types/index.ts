export interface PollyVoice {
  Id: string;
  Name: string;
  LanguageCode: string;
  LanguageName: string;
  Gender: string;
  SupportedEngines: string[];
}

export interface VoiceLookup {
  name: string;
  engine: string;
  voiceOptions: string[];
  languageCode: string;
  gender: string;
}

export interface ChatterConfig {
  voice: string;
  voice_option: string;
  display_name: string;
  spoken_name: string;
  ttsBanned: boolean;
  color?: string;
  platform?: string;
}

export interface AudioMessage {
  prefix?: string;
  suffix?: string;
  text: string;
  username: string;
  tts_voice?: string;
  tts_voice_option?: string;
  tts_spoken_name?: string;
  voice?: string;
  engine?: string;
  ssmlTextType: 'text' | 'ssml';
  messageID: number;
}

export interface ChatMessage {
  id: number;
  type: 'chat' | 'system';
  username?: string;
  displayName?: string;
  color?: string;
  platform?: string;
  message: string;
  translatedMessage?: string;
  allowTTS: boolean;
  allowTTSmessage?: string;
  isCurrentlySpeaking?: boolean;
  voiceName?: string;
  spokenName?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface AppearanceSettings {
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  fontColor: string;
  fontColorOpacity: number;
  webkitTextStrokeSize: number;
  webkitTextStrokeColor: string;
  webkitTextStrokeColorOpacity: number;
  bubbleBackgroundColor: string;
  bubbleBackgroundOpacity: number;
  borderColor: string;
  borderColorOpacity: number;
  borderWidth: number;
  borderLineStyle: string;
  borderRadius: number;
  hrColor: string;
  hrColorOpacity: number;
  outlineColor: string;
  outlineColorOpacity: number;
  outlineOffset: number;
  shadowColor: string;
  shadowColorOpacity: number;
  shadowOffsetHorizontal: number;
  shadowOffsetVertical: number;
  shadowBlur: number;
}

export interface TwitchUserstate {
  username: string;
  'display-name': string;
  mod: boolean;
  subscriber: boolean;
  badges?: Record<string, string>;
  emotes?: Record<string, string[]>;
  'emote-only'?: boolean;
  color?: string;
  id?: string;
  platform?: string;
  tts_voice?: string;
  tts_voice_option?: string;
  tts_spoken_name?: string;
  'custom-reward-id'?: string;
  'msg-id'?: string;
  'system-msg'?: string;
  bits?: string;
  'badge-info'?: Record<string, string>;
  'user-id'?: string;
  chat_action?: boolean;
  gpt_type?: string;
  action?: string;
  gpt_result?: string;
}
