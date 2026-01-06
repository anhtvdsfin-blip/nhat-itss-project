import React from 'react';
import { Link } from 'react-router-dom';
import howToUsePage from '../images/howtoUse.png';

export default function HowToUse() {
  return (
    <div className="howto-page-only">
      <div className="howto-content">
        <img src={howToUsePage} alt="How to use guide" />
        <Link to="/" className="howto-home-btn">ホームページに戻る
</Link>
      </div>
    </div>
  );
}
