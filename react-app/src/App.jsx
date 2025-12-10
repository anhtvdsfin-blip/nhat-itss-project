import React, { useState } from 'react';
import Recorder from './components/Recorder';
import OptionsPanel from './components/OptionsPanel';
import logo from './images/logo.png';
import howToUse from './images/howToUse_button.png';
// howToUsePage image removed — using text content for the how-to page
// YÊU CẦU CSS:
// 1. .app-root: Thiết lập chiều cao và bố cục cơ bản.
// 2. .vertical-layout: Cần có 'display: flex;' và 'flex-direction: column;' để xếp Recorder và Options dọc.
// 3. .recorder-area: Cần có 'flex-grow: 0;' (Cố định) và 'flex-shrink: 0;'.
// 4. .options-area: Cần có 'flex-grow: 1;' và 'overflow-y: auto;' (Cuộn) cho khung lựa chọn.

export default function App() {
  const [text, setText] = useState('');
  const [pinnedTranslation, setPinnedTranslation] = useState(null);
  const [route, setRoute] = useState('home'); // 'home' | 'howto'

  return (
    <div className="app-root">
      <header className="sticky-header">
        <div className="header-top">
          <div className="header-left">
            <button className="logo-btn" onClick={() => setRoute('home')}>
              <img src={logo} alt="Logo" className="logo-img" />
            </button>
          </div>

          <div className="header-right">
            <button className="howto-btn" onClick={() => setRoute('howto')}>
              <img src={howToUse} alt="How to use" className="howto-img" />
            </button>
          </div>
        </div>

        {/* Move Recorder component into header so all controls + mic logic live here */}
        <div className="header-bottom">
          <Recorder
            value={text}
            onChange={setText}
            onPinTranslation={setPinnedTranslation}
          />
        </div>
      </header>

      <main className="main-content">
        {route === 'home' && (
          // Đã đổi tên class bố cục từ page-layout sang vertical-layout để sử dụng CSS dọc
          <div className="vertical-layout"> 
            
            {/* Recorder moved to header; body no longer shows recorder */}
            
            {/* Options Panel (Phần dưới, CUỘN) */}
            <aside className="options-area">
              <OptionsPanel 
                text={text} 
                onRequestPin={(t)=>setPinnedTranslation(t)} 
                pinned={pinnedTranslation} 
              />
            </aside>
            
          </div>
        )}

        {route === 'howto' && (
          <div className="howto" style={{ minHeight: '100vh', padding: '28px 20px', boxSizing: 'border-box' }}>
            {/* Header back button removed — bottom pink button remains */}

            <div style={{ maxWidth: 980, margin: '80px auto 40px', background: 'white', color: 'black', padding: '22px 26px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.06)', lineHeight: 1.7 }}>
              <h2 style={{ textAlign: 'center', marginTop: 0 }}>🌐 Web利用ガイド（ウェブ使用説明書）</h2>
              <p style={{ marginTop: 6, marginBottom: 12 }}>🏫 日本語会話学習支援システム<br/>このウェブサイトは、学生が日本語の会話をより理解し、練習できるようにサポートするための学習支援ツールです。以下の機能を利用して、授業中の理解を深めましょう。</p>

              <h3>① 音声を録音してテキストに変換する</h3>
              <p><strong>📖 説明</strong><br/>教師がマイクをオンにして説明を行うと、その音声が自動的に文字に変換されます。学生が聞き取れなかった場合でも、発言内容をテキストで確認できます。</p>
              <p><strong>🎯 使い方</strong><br/>教師が話しているとき、画面に文字が自動表示されます。読みながら内容を理解してください。聞き取れなかった部分をテキストで確認できます。</p>

              <h3>② 手動でテキストを入力・修正できる</h3>
              <p><strong>📖 説明</strong><br/>誤字や文法の間違いがあった場合、教師がテキストを簡単に修正できます。</p>
              <p><strong>🎯 使い方</strong><br/>教師が修正モードに切り替えます。テキストの誤りを修正し、更新ボタンを押します。修正版がすぐに学生画面に反映されます。</p>

              <h3>③ 語彙の意味説明・同義語・使用例を提供する</h3>
              <p><strong>📖 説明</strong><br/>難しい単語を選択すると、その単語の意味・同義語・使用例が日本語とベトナム語で表示されます。</p>
              <p><strong>🎯 使い方</strong><br/>理解できない単語をクリックします。単語の意味・例文・ベトナム語訳がポップアップで表示されます。会話中の語彙理解を深めましょう。</p>

              <h3>④ 文の種類（命令文・疑問文・平叙文）を判別し、学生が取るべき行動を提示する</h3>
              <p><strong>📖 説明</strong><br/>教師の発言を文の種類ごとに分析し、学生がどう対応すべきかを提示します。</p>
              <p><strong>🎯 使い方</strong><br/>教師の話した文が自動で分類されます。画面に「命令文」「質問文」「説明文」などが表示されます。学生は「答える」「聞く」「理解する」など、指示された行動を確認して行いましょう。</p>

              <h3>⑤ 原文をベトナム語に翻訳する</h3>
              <p><strong>📖 説明</strong><br/>発言内容をベトナム語に自動翻訳します。日本語の理解が難しい場合に使用します。</p>
              <p><strong>🎯 使い方</strong><br/>「翻訳」ボタンをクリックします。テキストが自動的にベトナム語に翻訳されます。原文と訳文を見比べて理解を深めましょう。</p>

              <h4>💡 学習のポイント</h4>
              <ul>
                <li>わからない単語が出たら、すぐにクリックして意味を確認しましょう。</li>
                <li>音声と文字の両方で学ぶことで、リスニング力と読解力を同時に伸ばせます。</li>
                <li>間違いを恐れず、会話練習を積極的に行いましょう。</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20, marginBottom: 40 }}>
              <button
                onClick={() => setRoute('home')}
                style={{
                  padding: '12px 28px',
                  background: '#ffdaeb', /* updated pink tone */
                  color: 'black',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(255,218,235,0.18)'
                }}
              >
                ホームページに戻る
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}