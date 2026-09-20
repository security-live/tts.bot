import { useVoicesDataStore } from '../../store';

interface VoiceSelectProps {
  voiceId: string;
  voiceOption: string;
  onVoiceChange: (voice: string) => void;
  onOptionChange: (option: string) => void;
  label: string;
  selectId?: string;
}

export function VoiceSelect({ voiceId, voiceOption, onVoiceChange, onOptionChange, label, selectId }: VoiceSelectProps) {
  const { voicesDesc, voices } = useVoicesDataStore();

  const voiceOptions = voices[voiceId.toLowerCase()]?.voiceOptions ?? [];

  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <select
        id={selectId}
        className="form-select form-select-sm bg-dark text-white mb-1"
        value={voiceId}
        onChange={(e) => {
          onVoiceChange(e.target.value);
          // Auto-set first valid option
          const opts = voices[e.target.value.toLowerCase()]?.voiceOptions ?? [];
          if (opts.length > 0) onOptionChange(opts[0]);
        }}
      >
        {voicesDesc.map((v) => (
          <option key={v.Id} value={v.Id}>
            {v.LanguageCode} — {v.Id} ({v.Gender})
          </option>
        ))}
      </select>
      <select
        className="form-select form-select-sm bg-dark text-white"
        value={voiceOption}
        onChange={(e) => onOptionChange(e.target.value)}
      >
        {voiceOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
