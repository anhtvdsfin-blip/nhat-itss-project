import React, { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Recorder from './components/Recorder';
import OptionsPanel from './components/OptionsPanel';
import HowToUse from './pages/HowToUse';
import logo from './images/logo.png';
import howToUse from './images/howToUse_button.png';

function HomePage() {
  const [text, setText] = useState('');

  return (
    <div className="app-root">
      <header className="sticky-header">
        <div className="header-top">
          <div className="header-left">
            <Link to="/" className="logo-btn">
              <img src={logo} alt="Logo" className="logo-img" />
            </Link>
          </div>

          <div className="header-right">
            <Link to="/howtouse" className="howto-btn">
              <img src={howToUse} alt="How to use" className="howto-img" />
            </Link>
          </div>
        </div>

        <div className="header-bottom">
          <Recorder value={text} onChange={setText} />
        </div>
      </header>

      <main className="main-content">
        <div className="vertical-layout">
          <aside className="options-area">
            <OptionsPanel text={text} />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/howtouse" element={<HowToUse />} />
    </Routes>
  );
}