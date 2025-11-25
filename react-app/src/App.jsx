import React, { useState } from 'react';
import Recorder from './components/Recorder';
import OptionsPanel from './components/OptionsPanel';

export default function App() {
  const [text, setText] = useState('');
  const [pinnedTranslation, setPinnedTranslation] = useState(null);
  const [route, setRoute] = useState('home'); // 'home' | 'howto'

  return (
    <div className="app-root">
      <header className="sticky-header">
        <div className="header-left">
          <button className="logo" onClick={() => setRoute('home')}>JT-Helper</button>
        </div>
        <nav className="header-right">
          <button onClick={() => setRoute('howto')}>How to use</button>
        </nav>
      </header>

      <main className="main-content">
        {route === 'home' && (
          <div className="page-layout">
            <section className="recorder-area">
              <Recorder value={text} onChange={setText} onPinTranslation={setPinnedTranslation} />
            </section>
            <aside className="options-area">
              <OptionsPanel text={text} onRequestPin={(t)=>setPinnedTranslation(t)} pinned={pinnedTranslation} />
            </aside>
          </div>
        )}

        {route === 'howto' && (
          <div className="howto">
            <h2>How to use</h2>
            <ul>
              <li>Click the microphone to start speech recognition.</li>
              <li>Edit transcript with "Chỉnh sửa".</li>
              <li>Use "Choose options" in the right panel to generate vocabulary, analysis, translation cards.</li>
            </ul>
            <button onClick={() => setRoute('home')}>Back</button>
          </div>
        )}
      </main>
    </div>
  );
}
