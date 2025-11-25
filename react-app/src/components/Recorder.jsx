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
    // cleanup
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
          placeholder="Kết quả nhận dạng hoặc nhập tay..."
          rows={4}
        />

        <div className="input-controls">
          <button className={`icon-btn ${listening ? 'active' : ''}`} onClick={toggleListen} title="Mic">
            🎤
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

        <div className="card-handle" aria-hidden="true" />
      </div>
    </div>
  );
}
