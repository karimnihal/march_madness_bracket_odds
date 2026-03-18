import { formatOdds } from '../utils/odds';

export default function OddsTracker({ odds }) {
  const scrollToDataSources = () => {
    const el = document.getElementById('data-sources');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="odds-total">
      <span className="odds-total-label">EXACT BRACKET ODDS</span>
      <button
        type="button"
        className="odds-total-info"
        onClick={scrollToDataSources}
        title="See details in Data & Sources section below"
        aria-label="See details in Data & Sources section below"
      >
        &#9432;
      </button>
      <span className="odds-total-value">{formatOdds(odds.total)}</span>
    </div>
  );
}
