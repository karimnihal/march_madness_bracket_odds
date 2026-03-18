import Game from './Game';
import { getPathProbForGame, getNormalizedMatchupOddsForGame, formatOdds, formatVegasChampOdds } from '../utils/odds';

export default function MobileFinalFour({ picks, makePick, getGameTeams, gameTree, teamsById, onPickComplete }) {
  const renderGame = (gameId) => {
    const [team1, team2] = getGameTeams(gameId);
    const pathProb = getPathProbForGame(gameId, gameTree, picks, getGameTeams);
    const matchupOddsProb = getNormalizedMatchupOddsForGame(gameId, gameTree, picks, getGameTeams);
    return (
      <Game
        key={gameId}
        gameId={gameId}
        team1={team1}
        team2={team2}
        pick={picks[gameId]}
        onPick={(teamId) => {
          makePick(gameId, teamId);
          if (teamId && onPickComplete) onPickComplete(gameId);
        }}
        round={gameTree[gameId].round}
        pathProb={pathProb}
        matchupOddsProb={matchupOddsProb}
      />
    );
  };

  return (
    <div className="mobile-final-four">
      <div className="mobile-round">
        <div className="mobile-round-label">FINAL FOUR</div>
        <div className="mobile-round-games">
          {renderGame('F4-1')}
          {renderGame('F4-2')}
        </div>
      </div>

      <div className="mobile-round">
        <div className="mobile-round-label">CHAMPIONSHIP</div>
        <div className="mobile-round-games">
          {renderGame('CHAMP')}
        </div>
      </div>

      {picks['CHAMP'] && teamsById[picks['CHAMP']] && (
        <div className="mobile-champion-display">
          <div className="champion-label">CHAMPION</div>
          <div className="champion-name">{teamsById[picks['CHAMP']].shortName}</div>
          <div className="champ-odds-block">
            <div className="champ-odds-label-block">
              <span className="champ-odds-label">AVG PRE-TOURNEY</span>
              <span className="champ-odds-label">VEGAS ODDS</span>
            </div>
            <div className="champ-odds-value-block">
              <span className="champ-odds-value">{formatOdds(teamsById[picks['CHAMP']].champProb)}</span>
              <span className="champ-odds-value champ-odds-value--american">{formatVegasChampOdds(teamsById[picks['CHAMP']])}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
