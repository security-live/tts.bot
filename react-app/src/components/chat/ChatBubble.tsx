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
      className="chat-bubble mb-2"
      style={{
        borderLeft: `3px solid ${color}`,
        backgroundColor: isCurrentlySpeaking ? '#1a3a1a' : undefined,
        opacity: msg.allowTTS ? 1 : 0.7,
      }}
    >
      {/* username-container */}
      <div className="d-flex justify-content-between align-items-start px-2 pt-2">
        <div>
          <span id={`msg-user-${msg.id}`} className="fw-bold" style={{ color }}>
            {msg.displayName ?? msg.username}
          </span>
          {msg.spokenName && msg.spokenName !== (msg.displayName ?? msg.username) && (
            <span className="text-muted small ms-1">({msg.spokenName})</span>
          )}
          {msg.platform && msg.platform !== 'Twitch' && (
            <span className="badge bg-secondary ms-1 small">{msg.platform}</span>
          )}
        </div>
        <div className="text-muted small text-end ms-2 flex-shrink-0" style={{ maxWidth: '40%' }}>
          {msg.voiceName}
        </div>
      </div>

      {/* message-container */}
      <div className="px-2 pb-1">
        <span className="me-1">{speakerIcon}</span>
        <span id={`msg-text-${msg.id}`} dangerouslySetInnerHTML={{ __html: msg.message }} />
        {msg.translatedMessage && (
          <div className="text-muted small mt-1" dangerouslySetInnerHTML={{ __html: msg.translatedMessage }} />
        )}
      </div>

      {/* buttons-container */}
      <div className="d-flex justify-content-center pb-1">
        <div className="btn-group btn-group-sm">
          <button
            className="btn btn-outline-warning btn-xs py-0 px-2"
            title="TTS Ban"
            onClick={() => onTtsBan(msg.username ?? '')}
          >
            <i className="fa fa-volume-xmark" />
            <div><span className="small">TTS Ban</span></div>
          </button>
          <button
            className="btn btn-outline-danger btn-xs py-0 px-2"
            title="Ban"
            onClick={() => onBan(msg.username ?? '')}
          >
            <i className="fa fa-gavel" />
            <div><span className="small">Ban</span></div>
          </button>
          <button
            className="btn btn-outline-secondary btn-xs py-0 px-2"
            title="Don't Speak"
            onClick={() => onDontSpeak(msg.id)}
          >
            <i className="fa fa-comment-slash" />
            <div><span className="small">Skip</span></div>
          </button>
        </div>
      </div>
    </div>
  );
}
