import ResponsiveOverview from './components/ResponsiveOverview';
import useBracket from './hooks/useBracket';
import DataSources from './components/DataSources';
import Toast from './components/Toast';

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
    getShareURL,
  } = useBracket();

  const sharedProps = {
    picks, makePick, makeFFPick, getGameTeams, odds, reset,
    fillRandomRound, fillRandomBracket, gameTree, teamsById, firstFourData, getShareURL,
  };

  return (
    <div className="app">
      <ResponsiveOverview {...sharedProps} />
      <DataSources />
      <Toast />
    </div>
  );
}
