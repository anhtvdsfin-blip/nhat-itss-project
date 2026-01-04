import React, { useState, useRef, useEffect } from 'react';

function Tag({ title, children, type }) {
  return (
    <div className={`tag-card tag-${type}`}>
      <h4>
        {type === 'vocab' && '言葉の説明'}
        {type === 'analysis' && '内容の分析'}
        {type === 'translation' && '翻訳'}
      </h4>
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
  const [optionsVisible, setOptionsVisible] = useState(false); // State quản lý hiển thị Options Menu
  const [activeButton, setActiveButton] = useState(null); // State quản lý button đang active
  const [popupPos, setPopupPos] = useState({ left: 0, top: 0 });
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
      
      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">⚠️ {error}</div>}

      {/* Vùng Choose options: click để hiện popup tại vị trí click */}
      <div className="choose-box" ref={containerRef} onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const left = e.clientX - rect.left;
        const top = e.clientY - rect.top;
        setPopupPos({ left, top });
        setOptionsVisible(true);
      }}>
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
      {/* KẾT THÚC: Logic hiển thị Options Menu / Choose Box */}

      <div className="tags-list">
        {pinned && (
          <div className="pinned">
            <strong>Đã ghim:</strong>
            <div>{pinned}</div>
          </div>
        )}
        {tags.map(tag => (
          <Tag key={tag.id} type={tag.type}>
            {tag.type === 'vocab' && (
              <div>
                <div><strong>{tag.content.word}</strong> — {tag.content.pos}</div>
                <div>{tag.content.meaning}</div>
                <div className="example">{tag.content.example}</div>
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
              </div>
            )}
          </Tag>
        ))}
      </div>
    </div>
  );
}