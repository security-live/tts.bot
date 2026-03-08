import { useEffect } from 'react';
import { useVoiceStore, useVoicesDataStore } from '../store';
import { useAWSServices } from '../hooks/useAWSServices';
import { VoiceSelect } from '../components/shared/VoiceSelect';
import { TWITCH_CLIENT_ID, TWITCH_SCOPES, TWITCH_SCOPES_MINIMAL } from '../constants';

function getRedirectUrl() {
  return `${window.location.origin}/callback`;
}

function buildTwitchAuthUrl(scopes: string) {
  return `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${getRedirectUrl()}&response_type=token&scope=${scopes}`;
}

function getUserLanguage() {
  return (navigator.language ?? 'en').substring(0, 2);
}

export default function LoginPage() {
  const { initialized, error } = useAWSServices();
  const {
    systemVoice, systemVoiceOption, defaultChatterVoice, defaultChatterVoiceOption,
    dstLangSelect, setVoice,
  } = useVoiceStore();
  const { } = useVoicesDataStore();

  useEffect(() => {
    if (!dstLangSelect) {
      setVoice('dstLangSelect', getUserLanguage());
    }
  }, []);

  const handleLogin = (fullPerms: boolean) => {
    const scopes = fullPerms ? TWITCH_SCOPES : TWITCH_SCOPES_MINIMAL;
    localStorage.setItem('page', 'streamer');
    window.location.href = buildTwitchAuthUrl(scopes);
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#1a1a2e' }}>
      <div className="card bg-dark text-white p-4" style={{ maxWidth: 600, width: '100%' }}>
        <h2 className="text-center mb-1">tts.bot</h2>
        <p className="text-center text-muted mb-4">by Security_Live</p>

        {!initialized && !error && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted">Initializing AWS services…</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger">Failed to connect to AWS: {error.message}</div>
        )}

        {initialized && (
          <>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <VoiceSelect
                  label="System Voice"
                  voiceId={systemVoice}
                  voiceOption={systemVoiceOption}
                  onVoiceChange={(v) => setVoice('systemVoice', v)}
                  onOptionChange={(v) => setVoice('systemVoiceOption', v)}
                />
              </div>
              <div className="col-md-6">
                <VoiceSelect
                  label="Default Chatter Voice"
                  voiceId={defaultChatterVoice}
                  voiceOption={defaultChatterVoiceOption}
                  onVoiceChange={(v) => setVoice('defaultChatterVoice', v)}
                  onOptionChange={(v) => setVoice('defaultChatterVoiceOption', v)}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">Translation Language</label>
              <select
                className="form-select form-select-sm bg-dark text-white"
                value={dstLangSelect}
                onChange={(e) => setVoice('dstLangSelect', e.target.value)}
              >
                <option value="">Choose your language</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="ru">Russian</option>
                <option value="it">Italian</option>
                <option value="pl">Polish</option>
                <option value="nl">Dutch</option>
                <option value="sv">Swedish</option>
                <option value="tr">Turkish</option>
              </select>
            </div>

            <div className="d-grid gap-2">
              <button
                className="btn btn-primary"
                onClick={() => handleLogin(true)}
              >
                Authorize on Twitch (Full Permissions)
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handleLogin(false)}
              >
                Authorize with minimal permissions
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
