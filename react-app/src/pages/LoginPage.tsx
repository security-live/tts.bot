import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

type View = 'landing' | 'streamer' | 'viewer';

export default function LoginPage() {
  const navigate = useNavigate();
  const { initialized, error } = useAWSServices();
  const {
    systemVoice, systemVoiceOption, defaultChatterVoice, defaultChatterVoiceOption,
    dstLangSelect, setVoice,
  } = useVoiceStore();
  const { } = useVoicesDataStore();

  const [view, setView] = useState<View>('landing');

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
    <div
      style={{
        backgroundColor: '#000',
        backgroundImage: 'url(/bg.jpg)',
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        fontFamily: '"Poppins", "Helvetica Neue Light", Helvetica, Arial, sans-serif',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        margin: 0,
      }}
    >
      <div style={{ maxWidth: 550, width: '100%', textAlign: 'center', padding: '0 20px' }}>

        {/* Logo */}
        <div style={{
          fontFamily: 'Poppins, sans-serif',
          marginBottom: 20,
          fontSize: 84,
          lineHeight: '80px',
          fontWeight: 900,
          textShadow: '-6px 8px 12px #000',
        }}>
          <img src="/profile_image.png" alt="tts.bot" style={{ height: 70, marginBottom: -10 }} />
          {' '}tts.bot for <span style={{ color: '#b36aff' }}>Twitch</span>
        </div>

        <h1 style={{ textShadow: '6px 8px 4px rgba(0,0,0,0.25)' }}>
          Access requires a{' '}
          <span style={{ color: '#b36aff' }}>
            <a style={{ color: '#b36aff' }} href="https://www.twitch.tv/signup" target="_blank" rel="noreferrer">
              Twitch
            </a>
          </span>{' '}
          account.
        </h1>

        {/* ── Landing: Streamer / Viewer choice ── */}
        {view === 'landing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="login-button btn" onClick={() => setView('streamer')}>
              Streamer
            </button>
            <button className="login-button btn" onClick={() => navigate('/viewer')}>
              Viewer
            </button>
          </div>
        )}

        {/* ── Streamer options ── */}
        {view === 'streamer' && (
          <>
            <h2 style={{ fontWeight: 100 }}>Streamer Options</h2>

            {!initialized && !error && (
              <div style={{ padding: '20px 0' }}>
                <div className="spinner-border text-light" role="status" />
                <p className="mt-2" style={{ opacity: 0.7 }}>Initializing AWS services…</p>
              </div>
            )}

            {error && (
              <div className="alert alert-danger">Failed to connect to AWS: {error.message}</div>
            )}

            {initialized && (
              <dl style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: 16 }}>
                  <VoiceSelect
                    label="System Voice"
                    voiceId={systemVoice}
                    voiceOption={systemVoiceOption}
                    onVoiceChange={(v) => setVoice('systemVoice', v)}
                    onOptionChange={(v) => setVoice('systemVoiceOption', v)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <VoiceSelect
                    label="Default Chatter Voice"
                    voiceId={defaultChatterVoice}
                    voiceOption={defaultChatterVoiceOption}
                    onVoiceChange={(v) => setVoice('defaultChatterVoice', v)}
                    onOptionChange={(v) => setVoice('defaultChatterVoiceOption', v)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Translation Language</label>
                  <select
                    style={{
                      width: '100%', padding: 12, borderRadius: 10,
                      border: '2px solid #b36aff', background: '#666', color: 'white',
                      boxSizing: 'border-box',
                    }}
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
              </dl>
            )}

            <h2 style={{ fontWeight: 100 }}>Choose your desired capabilities and click authenticate.</h2>

            <dl style={{ textAlign: 'left', marginBottom: 16 }}>
              <dd style={{ margin: '10px 0' }}>
                <input type="radio" id="moderation" name="capability" defaultChecked readOnly />
                <label htmlFor="moderation" style={{ marginLeft: 8 }}>Moderation (Recommended)</label>
              </dd>
              <dd style={{ margin: '10px 0' }}>
                <input type="radio" id="chat" name="capability" readOnly />
                <label htmlFor="chat" style={{ marginLeft: 8 }}>Basic Chat</label>
              </dd>
            </dl>

            <button
              className="login-button btn"
              onClick={() => handleLogin(true)}
              disabled={!initialized}
            >
              Authenticate
            </button>

            <div style={{ marginTop: 10 }}>
              <button
                className="login-button btn"
                style={{ fontSize: 13, padding: '12px 20px', opacity: 0.8 }}
                onClick={() => handleLogin(false)}
                disabled={!initialized}
              >
                Authenticate with minimal permissions
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <button
                className="login-button btn"
                style={{ fontSize: 13, padding: '12px 20px', opacity: 0.6 }}
                onClick={() => setView('landing')}
              >
                ← Back
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ fontSize: 10, marginTop: 30 }}>
          <p>Super Secure Login<br />Like Banks Have</p>
          <p>*** Voice Recognition is only supported with Chrome ***</p>
          <p>
            <a style={{ color: '#b36aff' }} href="https://aws.amazon.com/polly/" target="_blank" rel="noreferrer">
              Powered by Amazon Web Services (AWS) API Gateway, Lambda, DynamoDB, Polly and Translate
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
