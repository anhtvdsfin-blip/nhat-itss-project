import React, { useEffect, useRef, useState } from 'react';

export default function Recorder({ value, onChange, onPinTranslation }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleVerify = () => {
    if (!value || !value.trim()) {
      setError('No content to verify');
      return;
    }
    setError(null);
    if (typeof onPinTranslation === 'function') {
      onPinTranslation(value.trim());
    }
  };

  const clearText = () => {
    onChange('');
    onPinTranslation && onPinTranslation(null);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    if (!value || !value.trim()) {
      setError('No content to copy');
      return;
    }
    setError(null);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setError(e.message || 'Copy failed');
    }
  };

  return (
    <div className="recorder">
      <div className="input-card">
        <div className="input-label">Input text</div>
        {error && <div className="error">⚠️ {error}</div>}

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
          <button
            className={`icon-btn ${listening ? 'icon-btn-active' : ''}`}
            onClick={toggleListen}
            title="Microphone"
            aria-pressed={listening}
            aria-label="Toggle microphone"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15a4 4 0 0 0 4-4V7a4 4 0 0 0-8 0v4a4 4 0 0 0 4 4Z" />
              <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
              <path d="M12 19v3" />
              <path d="M8 22h8" />
            </svg>
          </button>

          <button
            className={`icon-btn ${editing ? 'icon-btn-active' : ''}`}
            onClick={() => setEditing((prev) => !prev)}
            title={editing ? 'Finish editing' : 'Edit'}
            aria-label="Edit text"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20h4.6a2 2 0 0 0 1.4-.6l9.4-9.4a2 2 0 0 0 0-2.8l-2.6-2.6a2 2 0 0 0-2.8 0L4 14.6A2 2 0 0 0 3.4 16v4Z" />
              <path d="M13.5 6.5 17.5 10.5" />
            </svg>
          </button>

          <button
            className="icon-btn"
            onClick={handleVerify}
            title="Verify"
            aria-label="Verify content"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12.5 9 17l11-11" />
            </svg>
          </button>

          <button
            className={`icon-btn ${copied ? 'icon-btn-copied' : ''}`}
            onClick={copyToClipboard}
            title={copied ? 'Copied' : 'Copy'}
            aria-label="Copy text"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>

          <button
            className="icon-btn"
            onClick={clearText}
            title="Delete"
            aria-label="Delete text"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6v14H5V6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}