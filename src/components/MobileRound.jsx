import Game from './Game';
import { getPathProbForGame, getNormalizedMatchupOddsForGame } from '../utils/odds';

const REGIONS = ['East', 'South', 'West', 'Midwest'];

const ROUND_CONFIG = {
  R64: { prefix: 'R64', count: 8, round: 64, label: 'ROUND OF 64' },
  R32: { prefix: 'R32', count: 4, round: 32, label: 'ROUND OF 32' },
  S16: { prefix: 'S16', count: 2, round: 16, label: 'SWEET 16' },
  E8:  { prefix: 'E8',  count: 1, round: 8,  label: 'ELITE 8' },
};

export default function MobileRound({ roundTab, picks, onPick, getGameTeams, gameTree, onPickComplete }) {
  const config = ROUND_CONFIG[roundTab];
  if (!config) return null;
  const { prefix, count, round, label } = config;

  return (
    <div className="mobile-round-tab">
      <div className="mobile-round-label">{label}</div>
      {REGIONS.map((region) => (
        <div key={region} className="mobile-round-region">
          <div className="mobile-round-region-header">{region.toUpperCase()}</div>
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
                  gameId={gameId}
                  team1={team1}
                  team2={team2}
                  pick={picks[gameId]}
                  onPick={(teamId) => {
                    onPick(gameId, teamId);
                    if (teamId && onPickComplete) onPickComplete(gameId);
                  }}
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
