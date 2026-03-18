import Region from './Region';
import Game from './Game';
import OddsTracker from './OddsTracker';
import FirstFour from './FirstFour';
import { getPathProbForGame, getNormalizedMatchupOddsForGame, formatOdds, formatVegasChampOdds } from '../utils/odds';
import { SITE_DOMAIN } from '../config';

export default function Bracket({ picks, makePick, getGameTeams, gameTree, teamsById, odds, firstFourData, makeFFPick }) {
  const renderFinalGame = (gameId) => {
    const [team1, team2] = getGameTeams(gameId);
    const pathProb = getPathProbForGame(gameId, gameTree, picks, getGameTeams);
    const matchupOddsProb = getNormalizedMatchupOddsForGame(gameId, gameTree, picks, getGameTeams);
    return (
      <Game
        team1={team1}
        team2={team2}
        pick={picks[gameId]}
        onPick={(teamId) => makePick(gameId, teamId)}
        round={gameTree[gameId].round}
        pathProb={pathProb}
        matchupOddsProb={matchupOddsProb}
      />
    );
  };

  return (
    <div className="bracket" id="bracket-root">
      <div className="bracket-header bracket-header--sticky">
        <h1 className="app-title">MARCH MADNESS 2026</h1>
        <OddsTracker odds={odds} />
      </div>
      <div className="bracket-sides">
        <div className="bracket-side bracket-side--left">
          <Region region="East" picks={picks} onPick={makePick} getGameTeams={getGameTeams} gameTree={gameTree} side="left" />
          <Region region="South" picks={picks} onPick={makePick} getGameTeams={getGameTeams} gameTree={gameTree} side="left" />
        </div>

        <div className="bracket-center">
          <div className="bracket-header bracket-header--inline">
            <h1 className="app-title">MARCH MADNESS 2026</h1>
            <OddsTracker odds={odds} />
          </div>
          <FirstFour
            className="first-four--overlay"
            firstFourData={firstFourData}
            picks={picks}
            onPick={makeFFPick}
            teamsById={teamsById}
          />
          <div className="final-four">
            <div className="final-four-game final-four-game--left">
              {renderFinalGame('F4-1')}
            </div>
            <div className="championship-center">
              {picks['CHAMP'] && teamsById[picks['CHAMP']] && (
                <div className="champion-display">
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
              <div className="championship-game">
                {renderFinalGame('CHAMP')}
              </div>
            </div>
            <div className="final-four-game final-four-game--right">
              {renderFinalGame('F4-2')}
            </div>
          </div>
        </div>

        <div className="bracket-side bracket-side--right">
          <Region region="West" picks={picks} onPick={makePick} getGameTeams={getGameTeams} gameTree={gameTree} side="right" />
          <Region region="Midwest" picks={picks} onPick={makePick} getGameTeams={getGameTeams} gameTree={gameTree} side="right" />
        </div>
      </div>
      <div className="bracket-watermark">
        <span className="bracket-watermark-line1">MAKE A BRACKET AT</span>
        <span className="bracket-watermark-line2">{SITE_DOMAIN.toUpperCase()}</span>
      </div>
    </div>
  );
}
