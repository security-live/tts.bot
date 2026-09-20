import { synthesizeSpeech } from '../services/awsService';
import type { AudioMessage } from '../types';

type QueueCountCallback = (count: number) => void;
type SpeakingIdCallback = (id: number) => void;

// Fallback silent mp3 for error cases (1 second of silence)
const SILENCE_MP3 = new Uint8Array([
  0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

export class AudioPlayer {
  private messageQueue: AudioMessage[] = [];
  private isSpeaking = false;
  private _isPaused = false;
  private currentSpokenMessage: AudioMessage | null = null;
  private banMessage: AudioMessage | null = null;
  private audioElement: HTMLAudioElement;

  // Injected state accessors (set by the hook)
  private getSystemVoice: () => string = () => 'Brian';
  private getSystemVoiceOption: () => string = () => 'neural';
  private getVoices: () => Record<string, { name: string; voiceOptions: string[] }> = () => ({});
  private streamerIsSpeaking = false;

  private onQueueCount: QueueCountCallback = () => {};
  private onSpeakingId: SpeakingIdCallback = () => {};

  constructor() {
    this.audioElement = new Audio();
  }

  configure(opts: {
    getSystemVoice: () => string;
    getSystemVoiceOption: () => string;
    getVoices: () => Record<string, { name: string; voiceOptions: string[] }>;
    onQueueCount: QueueCountCallback;
    onSpeakingId: SpeakingIdCallback;
  }) {
    this.getSystemVoice = opts.getSystemVoice;
    this.getSystemVoiceOption = opts.getSystemVoiceOption;
    this.getVoices = opts.getVoices;
    this.onQueueCount = opts.onQueueCount;
    this.onSpeakingId = opts.onSpeakingId;
  }

  setStreamerSpeaking(speaking: boolean) {
    this.streamerIsSpeaking = speaking;
    if (!speaking && !this.isSpeaking && !this._isPaused) {
      this.speakNext();
    }
  }

  isPaused() {
    return this._isPaused;
  }

  isSpeakingNow() {
    return this.isSpeaking;
  }

  Speak(prefix: string, text: string, suffix: string, userstate: { username: string; tts_voice?: string; tts_voice_option?: string; tts_spoken_name?: string }, ssmlTextType: 'text' | 'ssml', mID: number) {
    const message: AudioMessage = {
      prefix,
      suffix,
      text,
      username: typeof userstate === 'string' ? userstate : userstate.username,
      ssmlTextType,
      tts_voice: typeof userstate === 'object' ? userstate.tts_voice : undefined,
      tts_voice_option: typeof userstate === 'object' ? userstate.tts_voice_option : undefined,
      tts_spoken_name: typeof userstate === 'object' ? userstate.tts_spoken_name : undefined,
      messageID: mID,
    };

    if (this.isSpeaking || this.streamerIsSpeaking || this._isPaused) {
      this.messageQueue.push(message);
      this.onQueueCount(this.messageQueue.length);
    } else {
      this.speakMessage(message).then(() => this.speakNext()).catch(console.error);
    }
  }

  async SpeakNow(text: string, username: string, ssmlTextType: 'text' | 'ssml', voice?: string, voiceOption?: string) {
    this.isSpeaking = true;
    const message: AudioMessage = {
      text,
      username,
      voice,
      engine: voiceOption,
      ssmlTextType,
      messageID: 0,
    };
    await this.speakMessage(message, true).catch(console.error);
    this.speakNext();
  }

  async SpeakNext(text: string, username: string, ssmlTextType: 'text' | 'ssml', voice?: string, mID = 0) {
    const message: AudioMessage = {
      text,
      username,
      voice,
      ssmlTextType,
      messageID: mID,
    };
    if (this.isSpeaking) {
      this.messageQueue.unshift(message);
      this.onQueueCount(this.messageQueue.length);
    } else {
      this.speakMessage(message).then(() => this.speakNext()).catch(console.error);
    }
  }

  async SpeakCustom(message: AudioMessage) {
    if (this.isSpeaking) {
      this.messageQueue.unshift(message);
      this.onQueueCount(this.messageQueue.length);
    } else {
      this.speakMessage(message).then(() => this.speakNext()).catch(console.error);
    }
  }

  async SpeakGame2TTS(speaker: string, text: string, voice: string, voiceOption: string) {
    const message: AudioMessage = {
      text,
      username: speaker,
      voice,
      engine: voiceOption,
      ssmlTextType: 'text',
      messageID: 0,
    };
    if (this.isSpeaking) {
      this.messageQueue.unshift(message);
      this.onQueueCount(this.messageQueue.length);
    } else {
      this.speakMessage(message).then(() => this.speakNext()).catch(console.error);
    }
  }

  async Pause() {
    this.audioElement.pause();
    this._isPaused = true;
  }

  async Continue() {
    this.audioElement.play().catch(console.error);
    this._isPaused = false;
    this.speakNext();
  }

  async Skip() {
    this.audioElement.pause();
    this.audioElement.dispatchEvent(new Event('skip'));
    this.isSpeaking = false;
    this.speakNext();
  }

  async SkipByID(id: number) {
    this.messageQueue = this.messageQueue.filter((m) => m.messageID !== id);
    this.onQueueCount(this.messageQueue.length);
  }

  async Dump() {
    this.messageQueue = [];
    this.audioElement.dispatchEvent(new Event('skip'));
    this.isSpeaking = false;
    this.onQueueCount(0);
  }

  async DumpByUser(username: string) {
    this.messageQueue = this.messageQueue.filter((m) => m.username !== username);
    this.audioElement.dispatchEvent(new Event('skip'));
    this.isSpeaking = false;
    this.onQueueCount(this.messageQueue.length);
    this.speakNext();
  }

  async PopLastMessage(username: string) {
    for (let i = this.messageQueue.length - 1; i >= 0; i--) {
      if (this.messageQueue[i].username === username) {
        this.messageQueue.splice(i, 1);
        this.onQueueCount(this.messageQueue.length);
        break;
      }
    }
  }

  async Ban() {
    if (!this.currentSpokenMessage) return;
    this.banMessage = { ...this.currentSpokenMessage, messageID: this.currentSpokenMessage.messageID };
    this.audioElement.pause();
    (this.banMessage as any).banInitiated = true;
    return this.banMessage.username;
  }

  async BanConfirm(ttsBanFn: (username: string) => void) {
    if (this.banMessage && (this.banMessage as any).banInitiated) {
      await this.DumpByUser(this.banMessage.username);
      ttsBanFn(this.banMessage.username);
      this.banMessage = null;
    }
  }

  async BanCancel() {
    this.banMessage = null;
  }

  async BanConfirmLulz(ttsBanFn: (username: string) => void, ttsUnbanFn: (username: string) => void) {
    if (this.banMessage && (this.banMessage as any).banInitiated) {
      this.isSpeaking = true;
      const user = this.banMessage.username;
      await this.DumpByUser(user);
      await this.SpeakNow(
        '<speak>Get the <say-as interpret-as="expletive">fudge</say-as> out of here ' + user + '</speak>',
        'system', 'ssml'
      );
      ttsBanFn(user);
      setTimeout(() => {
        this.SpeakNow(`<speak>Just kidding ${user}, we love you get back in here.</speak>`, 'system', 'ssml');
        ttsUnbanFn(user);
      }, 10000);
      this.isSpeaking = false;
      this.speakNext();
      this.banMessage = null;
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private resolveVoiceParams(message: AudioMessage): { voiceId: string; engine: string } {
    const voices = this.getVoices();

    if (message.username === 'system') {
      const sysVoice = this.getSystemVoice().toLowerCase();
      return {
        voiceId: voices[sysVoice]?.name ?? this.getSystemVoice(),
        engine: this.getSystemVoiceOption(),
      };
    }

    if (message.username === 'custom' && message.voice) {
      const v = message.voice.toLowerCase();
      return {
        voiceId: voices[v]?.name ?? message.voice,
        engine: message.engine ?? 'standard',
      };
    }

    const ttsVoice = (message.tts_voice ?? '').toLowerCase();
    return {
      voiceId: voices[ttsVoice]?.name ?? message.tts_voice ?? this.getSystemVoice(),
      engine: message.tts_voice_option ?? 'standard',
    };
  }

  private async getAudioStream(message: AudioMessage): Promise<Uint8Array> {
    try {
      const { voiceId, engine } = this.resolveVoiceParams(message);
      return await synthesizeSpeech({
        text: message.text,
        ssmlTextType: message.ssmlTextType,
        voiceId,
        engine,
      });
    } catch (err) {
      console.error('Polly error:', err);
      return SILENCE_MP3;
    }
  }

  private playAudioStream(audioStream: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([new Uint8Array(audioStream.buffer as ArrayBuffer)], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      this.audioElement.src = url;

      const onEnded = () => {
        this.audioElement.pause();
        this.audioElement.removeEventListener('ended', onEnded);
        this.audioElement.removeEventListener('skip', onEnded);
        this.audioElement.src = '';
        URL.revokeObjectURL(url);
        resolve();
      };

      this.audioElement.addEventListener('ended', onEnded);
      this.audioElement.addEventListener('skip', onEnded);

      this.audioElement.play().catch((err) => {
        this.audioElement.removeEventListener('ended', onEnded);
        this.audioElement.removeEventListener('skip', onEnded);
        reject(err);
      });
    });
  }

  private async speakMessage(message: AudioMessage, immediate = false) {
    this.isSpeaking = true;
    if (!immediate) {
      this.currentSpokenMessage = message;
    }

    this.onSpeakingId(message.messageID);

    // Speak prefix (always ssml)
    if (message.prefix?.trim()) {
      try {
        const prefixMsg: AudioMessage = {
          text: message.prefix.replace(/_/g, ' '),
          username: 'system',
          ssmlTextType: 'ssml',
          messageID: message.messageID,
        };
        const stream = await this.getAudioStream(prefixMsg);
        await this.playAudioStream(stream);
      } catch (err) {
        console.error('speak prefix:', err);
      }
    }

    // Small gap between prefix and main
    await new Promise((r) => setTimeout(r, 300));

    // Speak main text
    try {
      const stream = await this.getAudioStream(message);
      await this.playAudioStream(stream);
    } catch (err) {
      console.error('speak main text:', err);
    }

    // Speak suffix
    if (message.suffix?.trim()) {
      try {
        const suffixMsg: AudioMessage = {
          text: message.suffix,
          username: 'system',
          ssmlTextType: 'text',
          messageID: message.messageID,
        };
        const stream = await this.getAudioStream(suffixMsg);
        await this.playAudioStream(stream);
      } catch (err) {
        console.error('speak suffix:', err);
      }
    }

    this.onSpeakingId(0);
    this.isSpeaking = false;
  }

  private speakNext() {
    this.onQueueCount(this.messageQueue.length);
    if (!this.streamerIsSpeaking && !this.isSpeaking && !this._isPaused) {
      if (this.messageQueue.length > 0) {
        const next = this.messageQueue.shift()!;
        this.speakMessage(next).then(() => this.speakNext()).catch(console.error);
      }
    }
  }
}
