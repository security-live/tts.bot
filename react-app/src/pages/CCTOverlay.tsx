import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAWSServices } from '../hooks/useAWSServices';
import { translateText } from '../services/awsService';

export default function CCTOverlay() {
  const [params] = useSearchParams();
  useAWSServices(); // ensure AWS is initialized

  const srcLang = params.get('src') ?? 'en';
  const targetLangParam = params.get('src') ?? 'en';

  const [currentText, setCurrentText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [targetLang, setTargetLang] = useState(targetLangParam);

  const recognitionRef = useRef<any>(null);

  // Listen for postMessage from parent window
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (!event.data || event.data.type !== 'cct-result') return;
      const { text, isFinal } = event.data;
      setCurrentText(text);
      if (isFinal && text.trim()) {
        try {
          const result = await translateText(text, 'auto', targetLang);
          setTranslatedText(result.translatedText);
        } catch { setTranslatedText(text); }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [targetLang]);

  // Apply CSS variables from URL params
  useEffect(() => {
    const cssVars = [
      'font-family', 'font-color', 'font-size', 'font-weight',
      'webkit-text-stroke-size', 'webkit-text-stroke-color',
      'bubble-background-color', 'border-color', 'border-width',
      'border-line-style', 'border-radius', 'hr-color',
      'outline-color', 'outline-offset', 'shadow-color',
      'shadow-offset-horizontal', 'shadow-offset-vertical', 'shadow-blur',
    ];
    for (const varName of cssVars) {
      const val = params.get(varName);
      if (val) document.documentElement.style.setProperty(`--${varName}`, val);
    }
  }, []);

  // Expose processResults for legacy cross-window compat
  useEffect(() => {
    (window as any).processResults = async (event: any) => {
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const text = results[i][0].transcript.trim();
        const isFinal = results[i].isFinal;
        setCurrentText(text);
        if (isFinal && text) {
          try {
            const result = await translateText(text, srcLang, targetLang);
            setTranslatedText(result.translatedText);
          } catch { setTranslatedText(text); }
        }
      }
    };
  }, [srcLang, targetLang]);

  const startMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in this browser.'); return; }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = srcLang;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = async (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setCurrentText(finalText || interim);
      if (finalText.trim()) {
        try {
          const result = await translateText(finalText, srcLang, targetLang);
          setTranslatedText(result.translatedText);
        } catch { setTranslatedText(finalText); }
      }
    };

    recognition.onend = () => {
      if (isListening) recognition.start();
    };

    recognition.start();
    setIsListening(true);
  };

  const stopMic = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="cct-overlay" style={{ background: 'transparent', minHeight: '100vh', padding: '1rem' }}>
      <div className="cct-controls mb-3 p-2 bg-dark rounded d-flex gap-2 align-items-center flex-wrap">
        <button
          className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-success'}`}
          onClick={isListening ? stopMic : startMic}
        >
          {isListening ? '⏹ Stop Mic' : '🎤 Start Mic'}
        </button>
        <div style={{ width: 140 }}>
          <label className="form-label text-white small mb-0">Target Language</label>
          <input
            className="form-control form-control-sm bg-dark text-white"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          />
        </div>
      </div>

      <div className="cct-display">
        {currentText && <div className="cct-text original">{currentText}</div>}
        {translatedText && translatedText !== currentText && (
          <div className="cct-text translated">{translatedText}</div>
        )}
      </div>
    </div>
  );
}
