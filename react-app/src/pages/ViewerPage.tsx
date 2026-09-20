/**
 * Viewer page — allows chat viewers to configure their TTS voice and spoken name.
 * Mirrors viewer.html from the original webfront.
 */
import { useState, useEffect } from 'react';
import { useAWSServices } from '../hooks/useAWSServices';
import { VoiceSelect } from '../components/shared/VoiceSelect';
import { TWITCH_CLIENT_ID, TWITCH_SCOPES_MINIMAL } from '../constants';
import { saveTtsConfig } from '../services/ttsApiService';

function getRedirectUrl() {
  return `${window.location.origin}/viewer-callback`;
}

function buildTwitchAuthUrl() {
  return `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${getRedirectUrl()}&response_type=token&scope=${TWITCH_SCOPES_MINIMAL}`;
}

interface ViewerProfile {
  login: string;
  display_name: string;
  profile_image_url: string;
  id: string;
}

export default function ViewerPage() {
  const { initialized } = useAWSServices();

  const [accessToken, setAccessToken] = useState('');
  const [profile, setProfile] = useState<ViewerProfile | null>(null);
  const [voice, setVoice] = useState('brian');
  const [voiceOption, setVoiceOption] = useState('standard');
  const [spokenName, setSpokenName] = useState('');
  const [channel, setChannel] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Extract token from hash (viewer-callback redirect)
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const token = params.get('access_token') ?? localStorage.getItem('viewer_access_token') ?? '';
    if (token) {
      setAccessToken(token);
      localStorage.setItem('viewer_access_token', token);
      history.replaceState('', document.title, window.location.pathname);
    }
  }, []);

  // Fetch Twitch profile when we have a token
  useEffect(() => {
    if (!accessToken) return;
    fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        const user = data.data?.[0];
        if (user) {
          setProfile(user);
          setSpokenName(user.login);
        }
      })
      .catch(console.error);
  }, [accessToken]);

  const handleSave = async () => {
    if (!profile || !channel) {
      setSaveStatus('Please enter the streamer channel name.');
      return;
    }
    setSaveStatus('Saving…');
    await saveTtsConfig(channel, profile.login, {
      voice,
      voice_option: voiceOption,
      spoken_name: spokenName || profile.login,
      ttsBanned: false,
      display_name: profile.display_name,
    }, accessToken);
    setSaveStatus('Saved!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  if (!accessToken) {
    return (
      <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#1a1a2e' }}>
        <div className="card bg-dark text-white p-4" style={{ maxWidth: 480, width: '100%' }}>
          <h2 className="text-center mb-1">tts.bot</h2>
          <p className="text-center text-muted mb-4">Viewer Voice Configuration</p>
          <p className="text-muted small text-center mb-3">
            Log in with Twitch to configure your TTS voice and spoken name for streams that use tts.bot.
          </p>
          <div className="d-grid">
            <button
              className="btn btn-primary"
              onClick={() => { window.location.href = buildTwitchAuthUrl(); }}
            >
              Login with Twitch
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#1a1a2e' }}>
      <div className="card bg-dark text-white p-4" style={{ maxWidth: 560, width: '100%' }}>
        <h2 className="text-center mb-1">tts.bot</h2>
        <p className="text-center text-muted mb-4">Viewer Voice Configuration</p>

        {profile && (
          <div className="d-flex align-items-center gap-3 mb-4">
            <img
              src={profile.profile_image_url}
              alt={profile.display_name}
              style={{ width: 56, height: 56, borderRadius: '50%' }}
            />
            <div>
              <div className="fw-bold">{profile.display_name}</div>
              <div className="text-muted small">@{profile.login}</div>
            </div>
          </div>
        )}

        {!initialized && (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
            <span className="ms-2 text-muted small">Loading voices…</span>
          </div>
        )}

        {initialized && (
          <div className="vstack gap-3">
            <div>
              <label className="form-label small">Streamer Channel (whose chat you want to configure)</label>
              <input
                className="form-control form-control-sm bg-dark text-white"
                placeholder="streamer username"
                value={channel}
                onChange={(e) => setChannel(e.target.value.toLowerCase().trim())}
              />
            </div>

            <VoiceSelect
              label="Your TTS Voice"
              voiceId={voice}
              voiceOption={voiceOption}
              onVoiceChange={setVoice}
              onOptionChange={setVoiceOption}
            />

            <div>
              <label className="form-label small">Spoken Name (how TTS will say your name)</label>
              <input
                className="form-control form-control-sm bg-dark text-white"
                placeholder={profile?.login ?? 'your name'}
                value={spokenName}
                onChange={(e) => setSpokenName(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" onClick={handleSave} disabled={!channel}>
              Save Configuration
            </button>

            {saveStatus && (
              <div className={`alert py-2 ${saveStatus.includes('!') ? 'alert-success' : 'alert-info'}`}>
                {saveStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
