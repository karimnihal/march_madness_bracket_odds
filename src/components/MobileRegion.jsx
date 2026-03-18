import Game from './Game';
import { getPathProbForGame, getNormalizedMatchupOddsForGame } from '../utils/odds';

const roundConfig = [
  { round: 64, count: 8, prefix: 'R64', label: 'ROUND OF 64' },
  { round: 32, count: 4, prefix: 'R32', label: 'ROUND OF 32' },
  { round: 16, count: 2, prefix: 'S16', label: 'SWEET 16' },
  { round: 8, count: 1, prefix: 'E8', label: 'ELITE 8' },
];

export default function MobileRegion({ region, picks, onPick, getGameTeams, gameTree }) {
  return (
    <div className="mobile-region">
      <h3 className="mobile-region-title">{region.toUpperCase()}</h3>
      {roundConfig.map(({ round, count, prefix, label }) => (
        <div key={prefix} className="mobile-round">
          <div className="mobile-round-label">{label}</div>
          <div className="mobile-round-games">
            {Array.from({ length: count }, (_, i) => {
              const gameId = `${region}-${prefix}-${i + 1}`;
              const game = gameTree[gameId];
              const [team1, team2] = getGameTeams(gameId);
              const pathProb = round < 64
                ? getPathProbForGame(gameId, gameTree, picks, getGameTeams)
                : null;
              const matchupOddsProb = round < 64
                ? getNormalizedMatchupOddsForGame(gameId, gameTree, picks, getGameTeams)
                : null;

              return (
                <Game
                  key={gameId}
                  team1={team1}
                  team2={team2}
                  pick={picks[gameId]}
                  onPick={(teamId) => onPick(gameId, teamId)}
                  round={round}
                  moneylines={game?.moneylines}
                  pathProb={pathProb}
                  matchupOddsProb={matchupOddsProb}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
