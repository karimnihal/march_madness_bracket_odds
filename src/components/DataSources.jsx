import { useState } from 'react';
import sourcesData from '../data/sources.json';

export default function DataSources() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="data-sources" id="about">
      <button
        type="button"
        className="data-sources-toggle"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
      >
        <span className="data-sources-toggle-icon">{isOpen ? '−' : '+'}</span>
        <span className="data-sources-toggle-label">ABOUT</span>
      </button>
      {isOpen && (
        <div className="data-sources-content">
          <h4 className="data-sources-heading">How To</h4>
          <ul className="data-sources-list">
            <li><strong>Pick winners:</strong> Click a team in any game tile to advance them. Click the same team again to clear that pick.</li>
            <li><strong>Later rounds unlock automatically:</strong> Once both feeder games have picks, the next-round matchup appears and becomes pickable.</li>
            <li><strong>Control buttons (top left):</strong> Use the menu to reset, fill a random round, or fill a full random bracket.</li>
            <li><strong>Share / download (top right):</strong> Download exports an image. Sharing uses a URL that encodes your current picks.</li>
            <li><strong>What the odds mean:</strong> Each tile shows win odds for the two teams. Later rounds also show MATCHUP and (for some rounds) EXACT PATH.</li>
          </ul>

          <h4 className="data-sources-heading">Matchup Win Odds</h4>
          <ul className="data-sources-list">
            <li><strong>Round of 64 games with posted lines:</strong> Win probabilities come from DraftKings moneylines, de-vigged.</li>
            <li><strong>Round of 64 games without posted lines:</strong> We use a seed-history–led blended model.</li>
            <li><strong>Round of 32 through Championship:</strong> We use the same blended model (historical seed-vs-seed records + seed advancement rates, adjusted by market strength).</li>
          </ul>

          <h4 className="data-sources-heading">EXACT PATH (S16, E8, F4)</h4>
          <p className="data-sources-para">
            EXACT PATH is shown for Sweet 16, Elite 8, and Final Four games. It is the probability that the exact currently shown pairing occurs, computed by multiplying the win probabilities across every feeder result required to produce that pairing (based on your picks along the path).
          </p>

          <h4 className="data-sources-heading">MATCHUP (R32 and Beyond)</h4>
          <p className="data-sources-para">
            MATCHUP is shown for Round of 32 and later. It is the probability of the currently shown pairing normalized against all potential pairings that could occur in that same game slot. This uses a reach-probability distribution (from our win-odds model) to account for all plausible opponents, not just the picked path.
          </p>

          <h4 className="data-sources-heading">Champion Box (AVG PRE-TOURNEY VEGAS ODDS)</h4>
          <p className="data-sources-para">
            When you pick a champion, the champ box above the final game shows the team’s average pre-tournament Vegas championship odds from major sportsbooks. We display it as an implied probability (1 in X) and also the average American odds (e.g. +350).
          </p>

          <h4 className="data-sources-heading">Exact Bracket Total Odds</h4>
          <p className="data-sources-para">
            EXACT BRACKET ODDS multiplies the win probability of your pick in every game where you have made a selection. Unpicked games are not included. The result is the probability that your entire bracket is correct.
            <br /><br />
            <em>Fun fact:</em> If every game were a pure 50/50 coin flip, the odds of a perfect bracket would be about <strong>1 in 9.22 quintillion</strong>.
          </p>

          <h4 className="data-sources-heading">Data Sources</h4>
          <ul className="data-sources-list data-sources-sources">
            {sourcesData.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="data-sources-link">
                  {s.label}
                </a>
                {' — '}
                {s.description}
                {s.citation && (
                  <span className="data-sources-citation"> ({s.citation})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
