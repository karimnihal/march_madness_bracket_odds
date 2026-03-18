import { useState, useRef, useEffect } from 'react';
import MobileRegion from './MobileRegion';
import MobileFinalFour from './MobileFinalFour';
import OddsTracker from './OddsTracker';
import DownloadButton from './DownloadButton';
import DataSources from './DataSources';

const TABS = ['East', 'South', 'West', 'Midwest', 'Final Four'];

export default function MobileBracket({ picks, makePick, makeFFPick, getGameTeams, odds, reset, fillRandomRound, fillRandomBracket, gameTree, teamsById, firstFourData }) {
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef(null);
  const isScrolling = useRef(false);

  // Sync scroll position when tab tapped
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isScrolling.current) return;
    el.scrollTo({ left: activeTab * el.offsetWidth, behavior: 'smooth' });
  }, [activeTab]);

  // Sync tab when user swipes
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    if (idx !== activeTab) {
      isScrolling.current = true;
      setActiveTab(idx);
      requestAnimationFrame(() => { isScrolling.current = false; });
    }
  };

  const renderTabContent = (tabIndex) => {
    const tab = TABS[tabIndex];
    if (tab === 'Final Four') {
      return (
        <MobileFinalFour
          picks={picks}
          makePick={makePick}
          getGameTeams={getGameTeams}
          gameTree={gameTree}
          teamsById={teamsById}
          firstFourData={firstFourData}
          makeFFPick={makeFFPick}
        />
      );
    }
    return (
      <MobileRegion
        region={tab}
        picks={picks}
        onPick={makePick}
        getGameTeams={getGameTeams}
        gameTree={gameTree}
      />
    );
  };

  return (
    <div className="mobile-app">
      <div className="mobile-header">
        <div className="mobile-header-row">
          <div className="mobile-header-left">
            <button className="header-btn" onClick={fillRandomRound}>RND</button>
            <button className="header-btn" onClick={fillRandomBracket}>ALL</button>
          </div>
          <h1 className="mobile-title">MM 2026</h1>
          <div className="mobile-header-right">
            <DownloadButton />
            <button className="header-btn" onClick={reset}>RST</button>
          </div>
        </div>
        <OddsTracker odds={odds} />
      </div>

      <div className="mobile-panels" ref={scrollRef} onScroll={handleScroll}>
        {TABS.map((tab, i) => (
          <div key={tab} className="mobile-panel">
            {renderTabContent(i)}
          </div>
        ))}
      </div>

      <DataSources />

      <nav className="mobile-tab-bar">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`mobile-tab ${i === activeTab ? 'mobile-tab--active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab === 'Final Four' ? 'F4' : tab.slice(0, 1)}
            <span className="mobile-tab-label">{tab === 'Final Four' ? 'Final 4' : tab}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
