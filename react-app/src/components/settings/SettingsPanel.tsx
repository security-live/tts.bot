import { useState } from 'react';
import { useSettingsStore, useVoiceStore, useAppearanceStore } from '../../store';
import { VoiceSelect } from '../shared/VoiceSelect';

interface SettingsPanelProps {
  channel: string;
  onClose: () => void;
}

type Tab = 'general' | 'voices' | 'translation' | 'filters' | 'appearance' | 'websocket' | 'cct' | 'vr';

export function SettingsPanel({ channel, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('general');
  const settings = useSettingsStore();
  const voice = useVoiceStore();
  const appearance = useAppearanceStore();

  const cb = (key: keyof typeof settings) => (
    <input
      type="checkbox"
      className="form-check-input"
      checked={settings[key] as boolean}
      onChange={(e) => settings.setSetting(key as any, e.target.checked)}
    />
  );

  const txt = (key: keyof typeof settings, type: 'text' | 'number' = 'text') => (
    <input
      type={type}
      className="form-control form-control-sm bg-dark text-white"
      value={settings[key] as string | number}
      onChange={(e) =>
        settings.setSetting(key as any, type === 'number' ? Number(e.target.value) : e.target.value)
      }
    />
  );

  const popupUrl = buildPopupUrl(channel, voice, appearance);

  return (
    <div className="settings-panel bg-dark text-white p-3 overflow-y-auto h-100">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Settings</h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>✕</button>
      </div>

      <ul className="nav nav-pills nav-fill mb-3 flex-wrap gap-1">
        {(['general', 'voices', 'translation', 'filters', 'appearance', 'websocket', 'vr', 'cct'] as Tab[]).map((t) => (
          <li key={t} className="nav-item">
            <button
              className={`nav-link py-1 px-2 small ${tab === t ? 'active' : 'text-white'}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          </li>
        ))}
      </ul>

      {/* ── General ─────────────────────────────────────────────────── */}
      {tab === 'general' && (
        <div className="vstack gap-2">
          {[
            ['cbEveryoneTTS', 'Everyone TTS'],
            ['cbModTTS', 'Mod TTS'],
            ['cbSubTTS', 'Sub TTS'],
            ['cbVipTTS', 'VIP TTS'],
            ['cbSpeak', 'Speak Messages'],
            ['cbAutoTranslateChat', 'Auto-translate chat'],
            ['cbDeleteCommands', 'Delete !commands'],
            ['cbReadWhispers', 'Read Whispers'],
            ['cbReadWhispersModsOnly', 'Mods-only Whispers'],
            ['cbActuallyWhisperWhispers', 'Whisper Effect'],
            ['cbAutoShoutoutRaids', 'Auto-shoutout Raids'],
          ].map(([key, label]) => (
            <div key={key} className="form-check">
              {cb(key as keyof typeof settings)}
              <label className="form-check-label ms-2">{label}</label>
            </div>
          ))}
        </div>
      )}

      {/* ── Voices ──────────────────────────────────────────────────── */}
      {tab === 'voices' && (
        <div>
          <VoiceSelect label="System Voice" voiceId={voice.systemVoice} voiceOption={voice.systemVoiceOption}
            onVoiceChange={(v) => voice.setVoice('systemVoice', v)} onOptionChange={(v) => voice.setVoice('systemVoiceOption', v)} />
          <VoiceSelect label="Default Chatter Voice" voiceId={voice.defaultChatterVoice} voiceOption={voice.defaultChatterVoiceOption}
            onVoiceChange={(v) => voice.setVoice('defaultChatterVoice', v)} onOptionChange={(v) => voice.setVoice('defaultChatterVoiceOption', v)} />
          <VoiceSelect label="STS Voice" voiceId={voice.stsVoice} voiceOption={voice.stsVoiceOption}
            onVoiceChange={(v) => voice.setVoice('stsVoice', v)} onOptionChange={(v) => voice.setVoice('stsVoiceOption', v)} />
          <VoiceSelect label="Chat TTS Voice" voiceId={voice.chatVoice} voiceOption={voice.chatVoiceOption}
            onVoiceChange={(v) => voice.setVoice('chatVoice', v)} onOptionChange={(v) => voice.setVoice('chatVoiceOption', v)} />
        </div>
      )}

      {/* ── Translation ──────────────────────────────────────────────── */}
      {tab === 'translation' && (
        <div className="vstack gap-3">
          <div>
            <label className="form-label small">Source Language (auto = detect)</label>
            <input className="form-control form-control-sm bg-dark text-white" value={voice.srcLangSelect}
              onChange={(e) => voice.setVoice('srcLangSelect', e.target.value)} />
          </div>
          <div>
            <label className="form-label small">Target Language</label>
            <input className="form-control form-control-sm bg-dark text-white" value={voice.dstLangSelect}
              onChange={(e) => voice.setVoice('dstLangSelect', e.target.value)} />
          </div>
          <div className="form-check">
            {cb('cbSpeakTranslation')}
            <label className="form-check-label ms-2">Speak translation with Chat Voice</label>
          </div>
          <div className="form-check">
            {cb('cbUseVoiceForSelectedLanguage')}
            <label className="form-check-label ms-2">Use voice matching target language</label>
          </div>
          <div className="form-check">
            {cb('cbSetLangFromLastChat')}
            <label className="form-check-label ms-2">Auto-set STS lang from chat</label>
          </div>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────── */}
      {tab === 'filters' && (
        <div className="vstack gap-3">
          <div className="form-check">
            {cb('cbSpeakEmotesTTS')}
            <label className="form-check-label ms-2">Speak Emotes</label>
          </div>
          <div className="form-check">
            {cb('cbDedupEmotesTTS')}
            <label className="form-check-label ms-2">Dedup Emotes</label>
          </div>
          <div className="form-check">
            {cb('cbReplaceAtNames')}
            <label className="form-check-label ms-2">Replace @names with spoken name</label>
          </div>
          <div className="form-check">
            {cb('cbSpeakOtherAtNames')}
            <label className="form-check-label ms-2">Speak @other references</label>
          </div>
          <hr />
          <div className="form-check">
            {cb('cbUserLevDistance')}
            <label className="form-check-label ms-2">Per-user duplicate filter (Levenshtein)</label>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small">Similarity %</label>
              {txt('txtUserLevPct', 'number')}
            </div>
            <div className="col-6">
              <label className="form-label small">Time window (s)</label>
              {txt('txtUserLevTime', 'number')}
            </div>
          </div>
          <div className="form-check">
            {cb('cbChatLevDistance')}
            <label className="form-check-label ms-2">Chat-wide duplicate filter</label>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small">Similarity %</label>
              {txt('txtChatLevPct', 'number')}
            </div>
            <div className="col-6">
              <label className="form-label small">Time window (s)</label>
              {txt('txtChatLevTime', 'number')}
            </div>
          </div>
        </div>
      )}

      {/* ── Appearance ───────────────────────────────────────────────── */}
      {tab === 'appearance' && (
        <div className="vstack gap-2">
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small">Font Family</label>
              <input className="form-control form-control-sm bg-dark text-white" value={appearance.fontFamily}
                onChange={(e) => appearance.setAppearance('fontFamily', e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small">Font Size (px)</label>
              <input type="number" className="form-control form-control-sm bg-dark text-white" value={appearance.fontSize}
                onChange={(e) => appearance.setAppearance('fontSize', Number(e.target.value))} />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small">Font Color</label>
              <input type="color" className="form-control form-control-color" value={appearance.fontColor}
                onChange={(e) => appearance.setAppearance('fontColor', e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small">Font Opacity</label>
              <input type="range" min={0} max={1} step={0.05} className="form-range" value={appearance.fontColorOpacity}
                onChange={(e) => appearance.setAppearance('fontColorOpacity', Number(e.target.value))} />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small">Stroke Color</label>
              <input type="color" className="form-control form-control-color" value={appearance.webkitTextStrokeColor}
                onChange={(e) => appearance.setAppearance('webkitTextStrokeColor', e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small">Stroke Size (px)</label>
              <input type="number" className="form-control form-control-sm bg-dark text-white" value={appearance.webkitTextStrokeSize}
                onChange={(e) => appearance.setAppearance('webkitTextStrokeSize', Number(e.target.value))} />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small">Shadow Color</label>
              <input type="color" className="form-control form-control-color" value={appearance.shadowColor}
                onChange={(e) => appearance.setAppearance('shadowColor', e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small">Shadow Blur (px)</label>
              <input type="number" className="form-control form-control-sm bg-dark text-white" value={appearance.shadowBlur}
                onChange={(e) => appearance.setAppearance('shadowBlur', Number(e.target.value))} />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small">Border Color</label>
              <input type="color" className="form-control form-control-color" value={appearance.borderColor}
                onChange={(e) => appearance.setAppearance('borderColor', e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small">Border Width (px)</label>
              <input type="number" className="form-control form-control-sm bg-dark text-white" value={appearance.borderWidth}
                onChange={(e) => appearance.setAppearance('borderWidth', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="form-label small">Border Style</label>
            <select className="form-select form-select-sm bg-dark text-white" value={appearance.borderLineStyle}
              onChange={(e) => appearance.setAppearance('borderLineStyle', e.target.value)}>
              {['solid', 'dashed', 'dotted', 'double', 'none'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── WebSocket ────────────────────────────────────────────────── */}
      {tab === 'websocket' && (
        <div className="vstack gap-3">
          <div className="form-check">
            {cb('cbSendTextToWebsocket')}
            <label className="form-check-label ms-2">Custom WebSocket</label>
          </div>
          {txt('txtWebsocketURL')}
          <div className="form-check">
            {cb('cbRouteChatThroughWebsocket')}
            <label className="form-check-label ms-2">Route chat through WebSocket</label>
          </div>
          <hr />
          <div className="form-check">
            {cb('cbSendTextToAWSWebsocket')}
            <label className="form-check-label ms-2">AWS WebSocket</label>
          </div>
          {txt('txtAWSWebsocketURL')}
        </div>
      )}

      {/* ── Voice Recognition ────────────────────────────────────────── */}
      {tab === 'vr' && (
        <div className="vstack gap-3">
          <div className="form-check">
            {cb('cbVoiceRecognition')}
            <label className="form-check-label ms-2">Enable Voice Recognition</label>
          </div>
          <div className="form-check">
            {cb('cbPauseTTSOnSpeech')}
            <label className="form-check-label ms-2">Pause TTS while speaking</label>
          </div>
          <div>
            <label className="form-label small">TTS Wait Time (seconds after speech ends)</label>
            {txt('txtTTSWaitTime', 'number')}
          </div>
          <hr />
          <div className="form-check">
            {cb('cbPoofMessage')}
            <label className="form-check-label ms-2">Poof (skip) on voice command</label>
          </div>
          <div>
            <label className="form-label small">Poof Regex</label>
            {txt('txtPoofRegex')}
          </div>
          <hr />
          <div className="form-check">
            {cb('cbBanHammer')}
            <label className="form-check-label ms-2">Voice Ban Hammer</label>
          </div>
          <div>
            <label className="form-label small">Ban Regex</label>
            {txt('txtBanRegex')}
          </div>
          <div>
            <label className="form-label small">Ban Confirm Regex</label>
            {txt('txtBanConfirmRegex')}
          </div>
          <hr />
          <div className="form-check">
            {cb('cbSTS')}
            <label className="form-check-label ms-2">Speech-to-Speech (STS)</label>
          </div>
          <div className="form-check">
            {cb('cbSendSpeechTranslation')}
            <label className="form-check-label ms-2">Send speech translation to chat</label>
          </div>
          <div>
            <label className="form-label small">STS Target Language</label>
            <input
              className="form-control form-control-sm bg-dark text-white"
              value={voice.stsLang}
              onChange={(e) => voice.setVoice('stsLang', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label small">Chat Output Language (for Send Message)</label>
            <input
              className="form-control form-control-sm bg-dark text-white"
              value={settings.chatLangSelect}
              onChange={(e) => settings.setSetting('chatLangSelect', e.target.value)}
            />
          </div>
          <div className="form-check">
            {cb('cbUseFinalResultsOnly')}
            <label className="form-check-label ms-2">Use final results only (no interim)</label>
          </div>
        </div>
      )}

      {/* ── CCT ─────────────────────────────────────────────────────── */}
      {tab === 'cct' && (
        <div className="vstack gap-3">
          <label className="form-label">CCT Popup URL</label>
          <input
            className="form-control form-control-sm bg-dark text-white"
            readOnly
            value={popupUrl}
          />
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => window.open(popupUrl, 'CCT Popup', 'width=800,height=600')}
            >
              Open CCT Popup
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => navigator.clipboard.writeText(popupUrl)}
            >
              Copy URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function rgba(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

interface VoiceStoreState { dstLangSelect: string }
interface AppearanceStoreState {
  fontFamily: string; fontColor: string; fontColorOpacity: number; fontSize: number;
  webkitTextStrokeColor: string; webkitTextStrokeColorOpacity: number;
  shadowColor: string; shadowColorOpacity: number; shadowBlur: number;
  borderColor: string; borderColorOpacity: number; borderWidth: number;
}

function buildPopupUrl(channel: string, voice: VoiceStoreState, appearance: AppearanceStoreState) {
  const hostname = window.location.hostname;
  let base = `https://securitylive.com/tts/translator.html`;
  if (hostname.includes('local.tts.bot')) base = `https://local.tts.bot/cct`;
  else if (hostname.includes('dev.tts.bot')) base = `https://dev.tts.bot/cct`;
  else if (hostname.includes('uat.tts.bot')) base = `https://uat.tts.bot/cct`;
  else if (hostname.includes('tts.bot')) base = `https://tts.bot/cct`;
  else base = `${window.location.origin}/cct`;

  const params = new URLSearchParams({
    src: voice.dstLangSelect,
    popup: 'aws',
    channel,
    'font-family': appearance.fontFamily,
    'font-color': rgba(appearance.fontColor, appearance.fontColorOpacity),
    'font-size': `${appearance.fontSize}px`,
    'webkit-text-stroke-color': rgba(appearance.webkitTextStrokeColor, appearance.webkitTextStrokeColorOpacity),
    'shadow-color': rgba(appearance.shadowColor, appearance.shadowColorOpacity),
    'shadow-blur': `${appearance.shadowBlur}px`,
    'border-color': rgba(appearance.borderColor, appearance.borderColorOpacity),
    'border-width': `${appearance.borderWidth}px`,
  });

  return `${base}?${params}`;
}
