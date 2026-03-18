import Game from './Game';
import { getPathProbForGame, getNormalizedMatchupOddsForGame } from '../utils/odds';

const roundConfig = [
  { round: 64, count: 8, prefix: 'R64' },
  { round: 32, count: 4, prefix: 'R32' },
  { round: 16, count: 2, prefix: 'S16' },
  { round: 8, count: 1, prefix: 'E8' },
];

export default function Region({ region, picks, onPick, getGameTeams, gameTree, side }) {
  return (
    <div className={`region region--${side}`}>
      <h3 className="region-title">{region.toUpperCase()}</h3>
      <div className="region-rounds">
        {roundConfig.map(({ round, count, prefix }) => (
          <div key={prefix} className={`round round--${prefix.toLowerCase()}`}>
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
        ))}
      </div>
    </div>
  );
}
