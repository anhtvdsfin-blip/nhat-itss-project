import React, { useState, useRef, useEffect } from 'react';

function Tag({ title, children, type, onDelete }) {
  return (
    <div className={`tag-card tag-${type}`}>
      <h4>
        {type === 'vocab' && '言葉の説明'}
        {type === 'analysis' && '内容の分析'}
        {type === 'translation' && '翻訳'}
      </h4>
      <div className="tag-body">{children}</div>
      <div className="tag-actions">
        <button className="small-icon" type="button" title="Copy">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4" />
            <path d="M5 9H15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
          </svg>
        </button>
        <button
          className="small-icon"
          type="button"
          title="Delete"
          onClick={onDelete}
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
  );
}

export default function OptionsPanel({ text = '', pinned }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [activeButton, setActiveButton] = useState(null);
  const [popupPos, setPopupPos] = useState({ left: 0, top: 0 });
  const containerRef = useRef(null);
  const popupRef = useRef(null);

  const BASE = 'http://localhost:4000/api';

  useEffect(() => {
    function handleDocClick(e) {
      if (!containerRef.current) return;
      // if clicked inside popup or inside choose-box, do nothing
      if (containerRef.current.contains(e.target)) return;
      if (popupRef.current && popupRef.current.contains(e.target)) return;
      setOptionsVisible(false);
    }
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  async function postJSON(path, body) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || JSON.stringify(data));
      return data;
    } finally {
      setLoading(false);
    }
  }
  
  // Đã SỬA: Thêm setOptionsVisible(false) để đóng menu sau khi hành động hoàn tất
  const handleAction = (actionType, actionFn) => async () => {
    if (!text || loading) return;
    setActiveButton(actionType); 
    try {
      await actionFn();
    } finally {
      setActiveButton(null); 
      setOptionsVisible(false); // THAY ĐỔI TẠI ĐÂY: Đóng menu sau khi thực hiện xong
    }
  };


  const addVocab = async () => {
    const inputText = text?.trim();
    if (!inputText) return;
    try {
      const data = await postJSON('vocab/lookup', { input: inputText });
      const vocabTag = {
        type: 'vocab',
        id: Date.now() + Math.random(),
        content: {
          input: inputText,
          meaning: data.meaning || '—',
          synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
          examples: Array.isArray(data.examples) ? data.examples : [],
          provider: data.provider || 'unknown'
        }
      };
      setTags(t => [vocabTag, ...t]);
    } catch (e) {
      setError('Vocab failed: ' + (e.message || e));
    }
  };

  const addAnalysis = async () => {
    if (!text) return;
    try {
      const data = await postJSON('classify', { text });
      const analysisTag = {
        type: 'analysis',
        id: Date.now(),
        content: {
          sentences: Array.isArray(data.sentences) ? data.sentences : [],
          provider: data.provider || 'unknown'
        }
      };
      setTags(t => [analysisTag, ...t]);
    } catch (e) {
      setError('Analysis failed: ' + (e.message || e));
    }
  };

  const addTranslation = async () => {
    if (!text) return;
    try {
      const data = await postJSON('translate', { text });
      const translation = {
        type: 'translation',
        id: Date.now(),
        content: {
          jp: data.jp || text,
          vi: data.vi || data.translation || '—',
          provider: data.provider || 'unknown'
        }
      };
      setTags(t => [translation, ...t]);
    } catch (e) {
      setError('Translation failed: ' + (e.message || e));
    }
  };

  const addSingleVocabLookup = async (word) => {
    if (!word) return;
    try {
      const trimmed = word.trim();
      if (!trimmed) return;
      const data = await postJSON('vocab/lookup', { input: trimmed });
      const tag = {
        type: 'vocab',
        id: Date.now(),
        content: {
          input: trimmed,
          meaning: data.meaning || '—',
          synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
          examples: Array.isArray(data.examples) ? data.examples : [],
          provider: data.provider || 'unknown'
        }
      };
      setTags(t => [tag, ...t]);
    } catch (e) {
      setError('Vocab lookup failed: ' + (e.message || e));
    }
  };

  const removeTag = (id) => {
    setTags((current) => current.filter((tag) => tag.id !== id));
  };

  return (
    <div className="options-wrapper">
      <div className="options-results">
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">⚠️ {error}</div>}
        {pinned && (
          <div className="pinned">
            <strong>Đã ghim:</strong>
            <div>{pinned}</div>
          </div>
        )}
        <div className="tags-list">
          {tags.length === 0 && !loading && !error && (
            <div className="empty">Chọn options để hiển thị thẻ...</div>
          )}
          {tags.map(tag => (
            <Tag
              key={tag.id}
              type={tag.type}
              onDelete={() => removeTag(tag.id)}
            >
              {tag.type === 'vocab' && (
                <div>
                  <div><strong>{tag.content.input}</strong></div>
                  <div>{tag.content.meaning || '—'}</div>
                  {tag.content.synonyms?.length > 0 && (
                    <div>Synonyms: {tag.content.synonyms.join(', ')}</div>
                  )}
                  {tag.content.examples?.length > 0 && (
                    <div className="example">
                      {tag.content.examples.map((ex, idx) => (
                        <div key={idx}>
                          <em>{ex.jp}</em>
                          <div>{ex.vi}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {tag.content.provider === 'fallback' && (
                    <div className="warning">⚠️ Dữ liệu mẫu (thiếu Gemini).</div>
                  )}
                </div>
              )}
              {tag.type === 'analysis' && (
                <div>
                  {tag.content.sentences?.map((item, idx) => (
                    <div key={idx} className="analysis-line">
                      <div>
                        <strong>{item.typeVi || item.type || '—'}</strong>
                        {item.type && item.typeVi && item.typeVi !== item.type && (
                          <span> ({item.type})</span>
                        )}
                        {': '}{item.normalized || item.original}
                      </div>
                      {item.mainIdea && <div>Main idea: {item.mainIdea}</div>}
                      {item.actionSuggestion && <div>Suggestion: {item.actionSuggestion}</div>}
                    </div>
                  ))}
                  {tag.content.provider === 'fallback' && (
                    <div className="warning">⚠️ Kết quả mẫu (thiếu Gemini).</div>
                  )}
                </div>
              )}
              {tag.type === 'translation' && (
                <div>
                  <div><em>{tag.content.jp}</em></div>
                  <div>{tag.content.vi}</div>
                  {tag.content.provider && tag.content.provider !== 'gemini' && (
                    <div className="provider-note">Nguồn: {tag.content.provider}</div>
                  )}
                </div>
              )}
            </Tag>
          ))}
        </div>
      </div>

      <div className="options-panel">
        <div
          className="choose-box"
          ref={containerRef}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const left = e.clientX - rect.left;
            const top = e.clientY - rect.top;
            setPopupPos({ left, top });
            setOptionsVisible(true);
          }}
        >
          <div className="choose-inner">
            <div className="plus">+</div>
            <div>Choose options</div>
          </div>
          {optionsVisible && (
            <div
              className="options-popup"
              ref={popupRef}
              style={{ left: popupPos.left, top: popupPos.top }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleAction('vocab', addVocab)}
                disabled={!text || loading}
                className={activeButton === 'vocab' ? 'options-btn-active' : ''}
              >
                言葉の説明
              </button>
              <button
                onClick={handleAction('analysis', addAnalysis)}
                disabled={!text || loading}
                className={activeButton === 'analysis' ? 'options-btn-active' : ''}
              >
                内容の分析
              </button>
              <button
                onClick={handleAction('translation', addTranslation)}
                disabled={!text || loading}
                className={activeButton === 'translation' ? 'options-btn-active' : ''}
              >
                翻訳
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}