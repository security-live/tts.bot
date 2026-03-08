import { getColorForUsername } from '../../services/chatProcessor';
import type { ChatMessage } from '../../types';

interface ChatBubbleProps {
  msg: ChatMessage;
  isCurrentlySpeaking: boolean;
  onTtsBan: (username: string) => void;
  onBan: (username: string) => void;
  onDontSpeak: (messageId: number) => void;
}

export function ChatBubble({ msg, isCurrentlySpeaking, onTtsBan, onBan, onDontSpeak }: ChatBubbleProps) {
  const color = msg.color ?? getColorForUsername(msg.username ?? '');
  const speakerIcon = msg.allowTTS ? '🔊' : '🔇';

  if (msg.type === 'system') {
    return (
      <div
        id={`msg-${msg.id}`}
        className="chat-bubble system-bubble mb-2 p-2"
        style={{ borderLeft: '3px solid #888', backgroundColor: isCurrentlySpeaking ? '#1a3a1a' : undefined }}
      >
        <div className="d-flex align-items-center gap-1 mb-1">
          <span className="small">🔊</span>
          <span className="text-muted small fw-bold" style={{ color: getColorForUsername('System') }}>System</span>
        </div>
        <span className="text-muted small" dangerouslySetInnerHTML={{ __html: msg.message }} />
      </div>
    );
  }

  return (
    <div
      id={`msg-${msg.id}`}
      className="chat-bubble mb-2 p-2"
      style={{
        borderLeft: `3px solid ${color}`,
        backgroundColor: isCurrentlySpeaking ? '#1a3a1a' : undefined,
        opacity: msg.allowTTS ? 1 : 0.7,
      }}
    >
      <div className="d-flex justify-content-between align-items-start">
        {/* Left: username + message */}
        <div className="flex-grow-1 me-2">
          <div className="mb-1">
            <span id={`msg-user-${msg.id}`} className="fw-bold" style={{ color }}>
              {msg.displayName ?? msg.username}
            </span>
            {msg.spokenName && msg.spokenName !== (msg.displayName ?? msg.username) && (
              <span className="text-muted small ms-1">({msg.spokenName})</span>
            )}
            {msg.platform && msg.platform !== 'Twitch' && (
              <span className="badge bg-secondary ms-1 small">{msg.platform}</span>
            )}
            {msg.voiceName && (
              <span className="text-muted ms-2" style={{ fontSize: '0.72rem' }}>{speakerIcon} {msg.voiceName}</span>
            )}
          </div>
          <span id={`msg-text-${msg.id}`} dangerouslySetInnerHTML={{ __html: msg.message }} />
          {msg.translatedMessage && (
            <div className="text-muted small mt-1" dangerouslySetInnerHTML={{ __html: msg.translatedMessage }} />
          )}
        </div>

        {/* Right: action buttons */}
        <div className="btn-group btn-group-sm flex-shrink-0">
          <button
            className="btn btn-outline-warning btn-xs py-0 px-1"
            title="TTS Ban"
            onClick={() => onTtsBan(msg.username ?? '')}
          >
            <i className="fa fa-volume-xmark" />
          </button>
          <button
            className="btn btn-outline-danger btn-xs py-0 px-1"
            title="Ban"
            onClick={() => onBan(msg.username ?? '')}
          >
            <i className="fa fa-gavel" />
          </button>
          <button
            className="btn btn-outline-secondary btn-xs py-0 px-1"
            title="Don't Speak"
            onClick={() => onDontSpeak(msg.id)}
          >
            <i className="fa fa-comment-slash" />
          </button>
        </div>
      </div>
    </div>
  );
}
