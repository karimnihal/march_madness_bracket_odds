import useBracket from './hooks/useBracket';
import OddsTracker from './components/OddsTracker';
import FirstFour from './components/FirstFour';
import Bracket from './components/Bracket';
import DownloadButton from './components/DownloadButton';
import DataSources from './components/DataSources';

export default function App() {
  const {
    picks,
    makePick,
    makeFFPick,
    getGameTeams,
    odds,
    reset,
    fillRandomRound,
    fillRandomBracket,
    gameTree,
    teamsById,
    firstFourData,
  } = useBracket();

  return (
    <>
      <div className="desktop-only-gate">
        <h1>MARCH MADNESS<br />BRACKET PICKER</h1>
        <p>This app requires a desktop browser at 1100px or wider. Open it on your laptop or desktop to pick your bracket.</p>
      </div>
      <div className="app">
        <Bracket
          picks={picks}
          makePick={makePick}
          getGameTeams={getGameTeams}
          gameTree={gameTree}
          teamsById={teamsById}
          odds={odds}
          firstFourData={firstFourData}
          makeFFPick={makeFFPick}
        />
        <div className="action-buttons">
          <DownloadButton />
          <button className="reset-btn" onClick={reset}>RESET BRACKET</button>
          <button className="reset-btn" onClick={fillRandomRound}>RANDOM FILL REST OF ROUND</button>
          <button className="reset-btn random-btn" onClick={fillRandomBracket}>RANDOM FILL REST OF BRACKET</button>
        </div>
        <DataSources />
      </div>
    </>
  );
}
