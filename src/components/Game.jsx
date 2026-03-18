import { matchupProb, formatOdds } from '../utils/odds';

export default function Game({ team1, team2, pick, onPick, round, moneylines, pathProb, matchupOddsProb, gameId }) {
  const shouldShowDerivedOdds = round < 64;
  const showExactPathOdds = round < 32 && round !== 2; // S16, E8, F4 only (not R32, not final)
  const pathValue = pathProb != null ? formatOdds(pathProb) : '';
  const matchupValue = matchupOddsProb != null ? formatOdds(matchupOddsProb) : '';

  const renderExactPathOdds = () => {
    if (!shouldShowDerivedOdds || !showExactPathOdds) return null;
    return (
      <div className="game-exact-path-odds">
        <span className="game-matchup-prob-label">EXACT PATH ODDS</span>
        <span className={`game-matchup-prob-value ${pathProb == null ? 'game-matchup-prob-value--empty' : ''}`}>{pathValue}</span>
      </div>
    );
  };

  const renderMatchupOdds = () => {
    if (!shouldShowDerivedOdds) return null;
    return (
      <div className="game-derived-odds">
        <div className="game-derived-odds-row">
          <span className="game-matchup-prob-label">MATCHUP ODDS</span>
          <span className={`game-matchup-prob-value ${matchupOddsProb == null ? 'game-matchup-prob-value--empty' : ''}`}>{matchupValue}</span>
        </div>
      </div>
    );
  };

  if (!team1 && !team2) {
    return (
      <div className="game game--empty" id={gameId ? `game-${gameId}` : undefined}>
        {renderExactPathOdds()}
        <div className="game-slot" />
        <div className="game-slot" />
        {renderMatchupOdds()}
      </div>
    );
  }

  const bothReady = team1 && team2 && !team1.placeholder && !team2.placeholder;

  let prob1 = null;
  let prob2 = null;
  if (bothReady) {
    if ((round === 64) && moneylines && moneylines !== false) {
      prob1 = matchupProb(team1, team2, 64, moneylines);
    } else {
      prob1 = matchupProb(team1, team2, round, null);
    }
    prob2 = 1 - prob1;
  }

  const formatPct = (p) => {
    if (p == null) return '';
    const pct = p * 100;
    if (pct < 0.01) return '< 0.01%';
    if (pct < 0.1) return '< 0.1%';
    return `${pct.toFixed(1)}%`;
  };

  const renderTeam = (team, prob) => {
    if (!team) return <div className="game-slot game-slot--empty" />;

    const isPicked = pick === team.id;
    const isLoser = pick && pick !== team.id;
    const isPlaceholder = team.placeholder;

    return (
      <div
        className={`game-slot ${isPicked ? 'game-slot--picked' : ''} ${isLoser ? 'game-slot--loser' : ''} ${isPlaceholder ? 'game-slot--placeholder' : ''}`}
        onClick={() => {
          if (!isPlaceholder) {
            onPick(isPicked ? null : team.id);
          }
        }}
      >
        <span className="team-seed">{team.seed}</span>
        <span className="team-name">{team.placeholder ? team.name : team.shortName}</span>
        <span className="team-odds">{formatPct(prob)}</span>
      </div>
    );
  };

  return (
    <div className={`game ${pick ? 'game--picked' : ''}`} id={gameId ? `game-${gameId}` : undefined}>
      {renderExactPathOdds()}
      {renderTeam(team1, prob1)}
      {renderTeam(team2, prob2)}
      {renderMatchupOdds()}
    </div>
  );
}
