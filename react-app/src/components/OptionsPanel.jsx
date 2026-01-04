import React, { useState, useRef, useEffect } from 'react';

function Tag({ title, children, type, onDelete, entering }) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  const copyTagText = async () => {
    if (!containerRef.current) return;
    const text = containerRef.current.innerText || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
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
      // ignore
    }
  };

  return (
    <div className={`tag-card tag-${type} ${entering ? 'tag-card-enter' : ''}`} ref={containerRef}>
      <h4>
        {type === 'vocab' && '言葉の説明'}
        {type === 'analysis' && '内容の分析'}
        {type === 'translation' && '翻訳'}
      </h4>
      <div className="tag-body">{children}</div>
      <div className="tag-actions">
        {copied && <div className="copy-badge small-copy-badge">コピーしました</div>}
        <button className={`small-icon ${copied ? 'small-icon-copied' : ''}`} type="button" title="コピー" onClick={copyTagText}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4" />
            <path d="M5 9H15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
          </svg>
        </button>
        <button
          className="small-icon"
          type="button"
          title="削除"
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

export default function OptionsPanel({ text = '' }) {
  const [tags, setTags] = useState([]);
  const [enteringIds, setEnteringIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [activeButton, setActiveButton] = useState(null);
  const [popupPos, setPopupPos] = useState({ left: 0, top: 0 });
  const [selectedVocabIndex, setSelectedVocabIndex] = useState(null);
  const containerRef = useRef(null);
  const popupRef = useRef(null);

  const BASE = 'https://nhat-itss-project-be.vercel.app/api';

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
      let vocabList = Array.isArray(data.vocabList) ? data.vocabList : [];
      if (!vocabList || vocabList.length === 0) {
        // fallback: split inputText into simple tokens when backend provides no vocabList
        const tokens = inputText.split(/[\s、。，．,\.\u3000]+/).map(t => t.trim()).filter(Boolean);
        vocabList = tokens.map(t => ({ reading: t, kanji: t }));
      }

      const vocabTag = {
        type: 'vocab',
        id: Date.now() + Math.random(),
        content: {
          input: inputText,
          vocabList,
          provider: data.provider || 'fallback'
        }
      };
      setTags(t => [...t, vocabTag]);
      setEnteringIds(ids => [vocabTag.id, ...ids]);
      setTimeout(() => setEnteringIds(ids => ids.filter(i => i !== vocabTag.id)), 350);
    } catch (e) {
      setError('語彙失敗: ' + (e.message || e));
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
      setTags(t => [...t, analysisTag]);
      setEnteringIds(ids => [analysisTag.id, ...ids]);
      setTimeout(() => setEnteringIds(ids => ids.filter(i => i !== analysisTag.id)), 350);
    } catch (e) {
      setError('分析失敗: ' + (e.message || e));
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
      setTags(t => [...t, translation]);
      setEnteringIds(ids => [translation.id, ...ids]);
      setTimeout(() => setEnteringIds(ids => ids.filter(i => i !== translation.id)), 350);
    } catch (e) {
      setError('翻訳失敗: ' + (e.message || e));
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
      setTags(t => [...t, tag]);
      setEnteringIds(ids => [tag.id, ...ids]);
      setTimeout(() => setEnteringIds(ids => ids.filter(i => i !== tag.id)), 350);
    } catch (e) {
      setError('語彙検索失敗: ' + (e.message || e));
    }
  };

  const removeTag = (id) => {
    setTags((current) => current.filter((tag) => tag.id !== id));
  };

  return (
    <div className="options-wrapper">
      <div className="options-results">
        {loading && <div className="loading">読み込み中...</div>}
        {error && <div className="error">⚠️ {error}</div>}
        <div className="tags-list">
          {tags.length === 0 && !loading && !error && (
            <div className="empty">オプションを選択してカードを表示...</div>
          )}
          {tags.map(tag => (
            <Tag
              key={tag.id}
              type={tag.type}
              entering={enteringIds.includes(tag.id)}
              onDelete={() => removeTag(tag.id)}
            >
              {tag.type === 'vocab' && (
                <div>
                  {tag.content.vocabList?.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                        {tag.content.vocabList.map((vocab, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedVocabIndex(selectedVocabIndex === idx ? null : idx)}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #ccc',
                              borderRadius: '20px',
                              backgroundColor: selectedVocabIndex === idx ? '#e0f7fa' : '#f9f9f9',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            {vocab.kanji || vocab.reading}
                          </button>
                        ))}
                      </div>
                      {selectedVocabIndex !== null && tag.content.vocabList[selectedVocabIndex] && (
                        <div style={{
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '15px',
                          marginTop: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          backgroundColor: '#fff'
                        }}>
                          {(() => {
                            const vocab = tag.content.vocabList[selectedVocabIndex];
                            return (
                              <div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                                  {vocab.kanji || vocab.reading} ({vocab.reading})
                                  {vocab.hanViet && <span style={{ marginLeft: '10px', textTransform: 'uppercase', fontSize: '12px', color: '#666' }}>
                                    {vocab.hanViet}
                                  </span>}
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>意味:</strong> {vocab.meaning}
                                </div>
                                {vocab.synonyms?.length > 0 && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <strong>類義語:</strong> {vocab.synonyms.join(', ')}
                                  </div>
                                )}
                                {vocab.examples?.length > 0 && (
                                  <div>
                                    <strong>例:</strong>
                                    <div className="example" style={{ marginTop: '5px' }}>
                                      {vocab.examples.map((ex, exIdx) => (
                                        <div key={exIdx} style={{ marginBottom: '5px' }}>
                                          <em>{ex.jp}</em>
                                          <div>{ex.vi}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  {tag.content.provider === 'fallback' && (
                    <div className="warning">⚠️ サンプルデータ（Gemini不足）。</div>
                  )}
                </div>
              )}
              {tag.type === 'analysis' && (
                <div>
                  {tag.content.sentences?.map((item, idx) => (
                    <div key={idx} className="analysis-line">
                      <div style={{ marginBottom: '8px' }}>
                        <strong>文の種類：</strong>
                        <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                          {item.typeVi || item.type || '—'}
                          {item.type && item.typeVi && item.typeVi !== item.type && (
                            <span> ({item.type})</span>
                          )}
                        </div>
                      </div>
                      {item.actionSuggestion && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong>学生がすべきこと：</strong>
                          <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                            {item.actionSuggestion}
                          </div>
                        </div>
                      )}
                      {item.mainIdea && <div style={{ marginTop: '8px' }}>主な考え: {item.mainIdea}</div>}
                    </div>
                  ))}
                  {tag.content.provider === 'fallback' && (
                    <div className="warning">⚠️ サンプル結果（Gemini不足）。</div>
                  )}
                </div>
              )}
              {tag.type === 'translation' && (
                <div>
                  <div><em>{tag.content.jp}</em></div>
                  <div>{tag.content.vi}</div>
                  {tag.content.provider && tag.content.provider !== 'gemini' && (
                    <div className="provider-note">ソース: {tag.content.provider}</div>
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
            <div>オプションを選択</div>
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