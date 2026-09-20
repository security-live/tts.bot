import { useRef, useEffect } from 'react';
import { AudioPlayer } from '../audio/AudioPlayer';
import { useVoiceStore, useVoicesDataStore, useChatUiStore } from '../store';

let playerInstance: AudioPlayer | null = null;

export function useAudioPlayer(): AudioPlayer {
  const { systemVoice, systemVoiceOption } = useVoiceStore();
  const { voices } = useVoicesDataStore();
  const { setQueueCount, setCurrentSpeakingId } = useChatUiStore();

  // Singleton — one AudioPlayer for the lifetime of the app
  if (!playerInstance) {
    playerInstance = new AudioPlayer();
  }

  // Keep the player's accessors up to date with latest store state
  const systemVoiceRef = useRef(systemVoice);
  const systemVoiceOptionRef = useRef(systemVoiceOption);
  const voicesRef = useRef(voices);

  useEffect(() => { systemVoiceRef.current = systemVoice; }, [systemVoice]);
  useEffect(() => { systemVoiceOptionRef.current = systemVoiceOption; }, [systemVoiceOption]);
  useEffect(() => { voicesRef.current = voices; }, [voices]);

  useEffect(() => {
    playerInstance!.configure({
      getSystemVoice: () => systemVoiceRef.current,
      getSystemVoiceOption: () => systemVoiceOptionRef.current,
      getVoices: () => voicesRef.current,
      onQueueCount: setQueueCount,
      onSpeakingId: setCurrentSpeakingId,
    });
  }, []);

  return playerInstance;
}
