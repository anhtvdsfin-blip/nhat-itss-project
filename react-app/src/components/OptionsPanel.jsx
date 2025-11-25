import React, { useState } from 'react';

function Tag({ title, children, type }) {
  return (
    <div className={`tag-card tag-${type}`}>
      <h4>{title}</h4>
      <div className="tag-body">{children}</div>
      <div className="tag-actions">
        <button className="small-icon" title="Check">☑️</button>
        <button className="small-icon" title="Delete">🗑️</button>
      </div>
    </div>
  );
}

export default function OptionsPanel({ text = '', onRequestPin, pinned }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE = 'http://localhost:4000/api';

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

  const addVocab = async () => {
    if (!text) return;
    try {
      const data = await postJSON('analyze', { text }); // use analyze to get vocabulary list
      const vocabItems = (data.vocabulary || []).map(v => ({
        type: 'vocab',
        id: Date.now() + Math.random(),
        content: {
          word: v.word || v.word,
          pos: v.pos || v.pos,
          meaning: v.meaning_vi || v.meaning || v.meaning_vi || v.meaning || '—',
          example: v.example || text
        }
      }));
      setTags(t => [...vocabItems, ...t]);
    } catch (e) {
      setError('Vocab failed: ' + (e.message || e));
    }
  };

  const addAnalysis = async () => {
    if (!text) return;
    try {
      const data = await postJSON('analyze', { text });
      const analysisTag = {
        type: 'analysis',
        id: Date.now(),
        content: {
          sentenceType: data.sentenceType || data.type || '—',
          keywords: data.keywords || []
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
          vi: data.vi || data.translation || '—'
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
      const data = await postJSON('vocab', { word });
      const tag = {
        type: 'vocab',
        id: Date.now(),
        content: {
          word: data.word || word,
          pos: data.pos || '—',
          meaning: data.meaning_vi || data.meaning || '—',
          example: (data.examples && data.examples[0]) || ''
        }
      };
      setTags(t => [tag, ...t]);
    } catch (e) {
      setError('Vocab lookup failed: ' + (e.message || e));
    }
  };

  return (
    <div className="options-panel">
      <div className="options-controls">
        <button onClick={addVocab} disabled={!text || loading}>Giải thích từ</button>
        <button onClick={addAnalysis} disabled={!text || loading}>Phân tích nội dung</button>
        <button onClick={addTranslation} disabled={!text || loading}>Dịch sang Tiếng Việt</button>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">⚠️ {error}</div>}

      <div className="tags-list">
        {pinned && (
          <div className="pinned">
            <strong>Đã ghim:</strong>
            <div>{pinned}</div>
          </div>
        )}
        {tags.length === 0 && <div className="empty">Chọn options để hiển thị thẻ...</div>}
        {tags.map(tag => (
          <Tag key={tag.id} title={tag.type} type={tag.type}>
            {tag.type === 'vocab' && (
              <div>
                <div><strong>{tag.content.word}</strong> — {tag.content.pos}</div>
                <div>{tag.content.meaning}</div>
                <div className="example">{tag.content.example}</div>
                <div style={{marginTop:8}}>
                  <button onClick={() => addSingleVocabLookup(tag.content.word)}>Chi tiết từ</button>
                </div>
              </div>
            )}
            {tag.type === 'analysis' && (
              <div>
                <div>Loại câu: {tag.content.sentenceType}</div>
                <div>Keywords: {tag.content.keywords.join(', ')}</div>
              </div>
            )}
            {tag.type === 'translation' && (
              <div>
                <div><em>{tag.content.jp}</em></div>
                <div>{tag.content.vi}</div>
                <button className="pin-btn" onClick={() => onRequestPin && onRequestPin(tag.content.vi)}>Ghim bản dịch</button>
              </div>
            )}
          </Tag>
        ))}
      </div>

      <div className="choose-box">
        <div className="choose-inner">
          <div className="plus">+</div>
          <div>Choose options</div>
        </div>
      </div>
    </div>
  );
}
