import React, { useEffect, useRef, useState } from 'react';

export default function Recorder({ value, onChange, onPinTranslation }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Browser does not support SpeechRecognition');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ja-JP';
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      onChange(transcript);
    };
    rec.onerror = (e) => {
      setError(e.error || 'Recognition error');
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => { recognitionRef.current = null; };
  }, [onChange]);

  const toggleListen = async () => {
    setError(null);
    if (!recognitionRef.current) {
      setError('Microphone not available');
      return;
    }
    if (!listening) {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (e) {
        setError(e.message || 'Could not start');
      }
    } else {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(value || '');
    } catch {
      setError('Copy failed');
    }
  };

  const clearText = () => {
    onChange('');
    onPinTranslation && onPinTranslation(null);
  };

  return (
    <div className="recorder">
      <div className="input-card">
        <div className="input-label">Input text</div>
        {error && <div className="error">⚠️ {error}</div>}
        {!value && !editing && <div className="hint">No input</div>}

        <textarea
          className="input-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={!editing}
          placeholder="話してください..."
          rows={4}
        />

        {/* Giữ lại các nút điều khiển */}
        <div className="input-controls">
          <button className={`icon-btn mic-btn ${listening ? 'active' : ''}`} onClick={toggleListen} title="Mic" aria-pressed={listening} aria-label="Toggle microphone">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 14a3.99 3.99 0 0 0 4-4V6a4 4 0 0 0-8 0v4a4 4 0 0 0 4 4z" fill="currentColor"/>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={() => setEditing(e => !e)} title="Chỉnh sửa">
            ✏️
          </button>
          <button className="icon-btn" onClick={copyText} title="Sao chép">
            📋
          </button>
          <button className="icon-btn" onClick={clearText} title="Xóa">
            🗑️
          </button>
        </div>

        
      </div>
    </div>
  );
}