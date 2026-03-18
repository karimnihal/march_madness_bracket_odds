import { lazy, Suspense } from 'react';
import useBracket from './hooks/useBracket';
import useIsMobile from './hooks/useIsMobile';
import DataSources from './components/DataSources';

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
  } = useBracket();

  const isMobile = useIsMobile();

  const sharedProps = {
    picks, makePick, makeFFPick, getGameTeams, odds, reset,
    fillRandomRound, fillRandomBracket, gameTree, teamsById, firstFourData,
  };

  if (isMobile) {
    return (
      <Suspense fallback={<div className="mobile-loading">Loading...</div>}>
        <MobileBracket {...sharedProps} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
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
          reset={reset}
          fillRandomRound={fillRandomRound}
          fillRandomBracket={fillRandomBracket}
        />
        <DataSources />
      </div>
    </Suspense>
  );
}
