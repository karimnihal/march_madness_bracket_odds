import { formatOdds } from '../utils/odds';

export default function OddsTracker({ odds }) {
  const scrollToAbout = () => {
    const el = document.getElementById('about');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="odds-total">
      <span className="odds-total-label">EXACT BRACKET ODDS</span>
      <button
        type="button"
        className="odds-total-info"
        onClick={scrollToAbout}
        title="See details in About section below"
        aria-label="See details in About section below"
      >
        &#9432;
      </button>
      <span className="odds-total-value">{formatOdds(odds.total)}</span>
    </div>
  );
}
