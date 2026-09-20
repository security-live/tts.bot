/**
 * Voice recognition hook — mirrors vr_function() from the original script.js.
 * Detects streamer speech to pause TTS, sends text to websockets,
 * and optionally performs speech-to-speech translation.
 */
import { useEffect, useRef, useCallback } from 'react';
import { translateText } from '../services/awsService';
import type { AudioPlayer } from '../audio/AudioPlayer';
import type { ChatterConfig } from '../types';

// Extend window for webkit SpeechRecognition
declare const webkitSpeechRecognition: any;

export interface VoiceRecognitionOptions {
  enabled: boolean;
  lang: string;
  stsEnabled: boolean;
  stsLang: string;
  stsVoice: string;
  stsVoiceOption: string;
  sendSpeechTranslation: boolean;
  pauseOnSpeech: boolean;
  poofEnabled: boolean;
  poofRegex: string;
  banHammerEnabled: boolean;
  banRegex: string;
  banConfirmRegex: string;
  useFinalResultsOnly: boolean;
  waitTimeSec: number;
  channel: string;
  customWsReady: boolean;
  awsWsReady: boolean;
  chatters: Record<string, ChatterConfig>;
  player: AudioPlayer | null;
  onStreamerSpeaking: (speaking: boolean) => void;
  onAddMessage: (text: string, translated: string) => void;
  onSendToCustomWs: (text: string, isFinal: boolean, started: number, ended: number, confidence: number) => void;
  onSendToAwsWs: (text: string, isFinal: boolean, started: number, ended: number, confidence: number) => void;
  onSaySts: (text: string) => void;
}

export function useVoiceRecognition(opts: VoiceRecognitionOptions) {
  const recognitionRef = useRef<any>(null);
  const activeRef = useRef(false);
  const streamerLastSpokeRef = useRef(0);
  const waitingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const streamerSpeaking = useCallback((speaking: boolean) => {
    optsRef.current.onStreamerSpeaking(speaking);
    if (speaking) {
      optsRef.current.player?.setStreamerSpeaking(true);
    } else {
      optsRef.current.player?.setStreamerSpeaking(false);
    }
  }, []);

  const justWaitAMoment = useCallback(() => {
    const o = optsRef.current;
    if (!waitingIntervalRef.current) {
      waitingIntervalRef.current = setInterval(justWaitAMoment, 500);
    }
    const waitMs = o.waitTimeSec * 1000;
    const diff = Date.now() - streamerLastSpokeRef.current;
    if (diff >= waitMs) {
      if (waitingIntervalRef.current) {
        clearInterval(waitingIntervalRef.current);
        waitingIntervalRef.current = null;
      }
      streamerSpeaking(false);
    }
  }, [streamerSpeaking]);

  const runImmediateVoiceCommand = useCallback((text: string) => {
    const o = optsRef.current;
    if (o.poofEnabled && new RegExp(o.poofRegex, 'i').test(text)) {
      o.player?.Skip();
    }
  }, []);

  const runVoiceCommand = useCallback((text: string) => {
    const o = optsRef.current;
    const lower = text.toLowerCase();
    if (lower.includes('tts pause')) {
      o.player?.Pause();
    } else if (o.banHammerEnabled && new RegExp(o.banRegex, 'i').test(text)) {
      o.player?.Ban();
    } else if (o.banHammerEnabled && new RegExp(o.banConfirmRegex, 'i').test(text)) {
      o.player?.BanConfirm(() => {});
    } else if (
      lower.includes('for the lulz') ||
      lower.includes('for the lols') ||
      lower.includes('why not')
    ) {
      o.player?.BanConfirmLulz(() => {}, () => {});
    } else if (lower.includes(' no') && !lower.includes('know')) {
      o.player?.BanCancel();
    } else if (lower.includes('tts continue')) {
      o.player?.Continue();
    } else if (lower.includes('tts dump') || lower.includes('tds dump')) {
      o.player?.Dump();
    }
  }, []);

  const startRecognition = useCallback(() => {
    const o = optsRef.current;
    if (!o.pauseOnSpeech && !o.customWsReady && !o.awsWsReady && !o.stsEnabled) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (typeof webkitSpeechRecognition !== 'undefined' ? webkitSpeechRecognition : null);
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    let speechStarted = Date.now();

    recognition.lang = o.lang;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onend = () => {
      streamerLastSpokeRef.current = Date.now();
      justWaitAMoment();
      if (activeRef.current) {
        startRecognition();
      }
    };

    recognition.onresult = async (event: any) => {
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const text = results[i][0].transcript.trim();
        const confidence = results[i][0].confidence;

        if (results[i].isFinal) {
          runVoiceCommand(text);
          if (o.customWsReady) {
            o.onSendToCustomWs(text, true, speechStarted, Date.now(), confidence);
          }
          if (o.awsWsReady) {
            o.onSendToAwsWs(text, true, speechStarted, Date.now(), confidence);
          }

          if (o.stsEnabled) {
            const srcLang = o.lang;
            const dstLang = o.stsLang;

            if (srcLang === dstLang) {
              if (o.sendSpeechTranslation) o.onSaySts(text);
              o.onAddMessage(text, '');
              o.player?.Speak('', text, '', {
                username: 'sts',
                tts_voice: o.stsVoice,
                tts_voice_option: o.stsVoiceOption,
              } as any, 'text', 0);
            } else {
              try {
                const result = await translateText(text, srcLang, dstLang);
                const translatedText = result.translatedText;
                if (o.sendSpeechTranslation) {
                  o.onSaySts(`${text} ( ${translatedText} )`);
                }
                o.onAddMessage(text, translatedText);
                o.player?.Speak('', translatedText, '', {
                  username: 'sts',
                  tts_voice: o.stsVoice,
                  tts_voice_option: o.stsVoiceOption,
                } as any, 'text', 0);
              } catch (err) {
                console.error('STS translate error:', err);
              }
            }
          }
        } else {
          // Interim result
          speechStarted = Date.now();
          streamerLastSpokeRef.current = Date.now();
          streamerSpeaking(true);
          runImmediateVoiceCommand(text);

          if (!o.useFinalResultsOnly && o.awsWsReady) {
            o.onSendToAwsWs(text, false, speechStarted, Date.now(), confidence);
          }
          if (o.customWsReady) {
            o.onSendToCustomWs(text, false, speechStarted, Date.now(), confidence);
          }
        }
      }

      streamerLastSpokeRef.current = Date.now();
      justWaitAMoment();
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('VR start error:', err);
    }
  }, [justWaitAMoment, runVoiceCommand, runImmediateVoiceCommand, streamerSpeaking]);

  useEffect(() => {
    if (opts.enabled) {
      activeRef.current = true;
      startRecognition();
    } else {
      activeRef.current = false;
      try { recognitionRef.current?.stop(); } catch { }
      recognitionRef.current = null;
      if (waitingIntervalRef.current) {
        clearInterval(waitingIntervalRef.current);
        waitingIntervalRef.current = null;
      }
    }
    return () => {
      activeRef.current = false;
      try { recognitionRef.current?.stop(); } catch { }
      if (waitingIntervalRef.current) clearInterval(waitingIntervalRef.current);
    };
  }, [opts.enabled, startRecognition]);
}
