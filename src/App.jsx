import { lazy, Suspense } from 'react';
import useBracket from './hooks/useBracket';
import useDeviceMode from './hooks/useIsMobile';
import DataSources from './components/DataSources';
import Toast from './components/Toast';

const Bracket = lazy(() => import('./components/Bracket'));
const MobileBracket = lazy(() => import('./components/MobileBracket'));

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

  const mode = useDeviceMode();

  const sharedProps = {
    picks, makePick, makeFFPick, getGameTeams, odds, reset,
    fillRandomRound, fillRandomBracket, gameTree, teamsById, firstFourData, getShareURL,
  };

  if (mode === 'mobile') {
    return (
      <Suspense fallback={<div className="mobile-loading">Loading...</div>}>
        <MobileBracket {...sharedProps} />
        <Toast />
      </Suspense>
    );
  }

  // tablet + desktop both show full bracket (auto-zoom handles fitting)
  return (
    <Suspense fallback={null}>
      <div className="app">
        <Bracket {...sharedProps} />
        <DataSources />
        <Toast />
      </div>
    </Suspense>
  );
}
