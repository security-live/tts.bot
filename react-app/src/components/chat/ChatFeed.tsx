import { useEffect, useRef } from 'react';
import { useChatUiStore, useChattersStore } from '../../store';
import { ChatBubble } from './ChatBubble';
import type { AudioPlayer } from '../../audio/AudioPlayer';

interface ChatFeedProps {
  player: AudioPlayer;
  onTtsBan: (username: string) => void;
  onBan: (username: string) => void;
}

export function ChatFeed({ player, onTtsBan, onBan }: ChatFeedProps) {
  const { messages, currentSpeakingId } = useChatUiStore();
  const { updateChatter } = useChattersStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleDontSpeak = (messageId: number) => {
    player.SkipByID(messageId);
  };

  const handleTtsBan = (username: string) => {
    updateChatter(username, { ttsBanned: true });
    player.DumpByUser(username);
    onTtsBan(username);
  };

  return (
    <div
      className="chat-feed flex-grow-1 overflow-y-auto p-2"
      style={{ height: 0, minHeight: 0 }}
    >
      {messages.map((msg) => (
        <ChatBubble
          key={msg.id}
          msg={msg}
          isCurrentlySpeaking={msg.id === currentSpeakingId}
          onTtsBan={handleTtsBan}
          onBan={onBan}
          onDontSpeak={handleDontSpeak}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
