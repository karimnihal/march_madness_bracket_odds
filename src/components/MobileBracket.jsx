import { useState, useRef, useCallback } from 'react';
import MobileRound from './MobileRound';
import MobileFinalFour from './MobileFinalFour';
import MobileBracketOverview from './MobileBracketOverview';
import FirstFour from './FirstFour';
import OddsTracker from './OddsTracker';
import DownloadButton from './DownloadButton';
import DataSources from './DataSources';
import { triggerToast } from './Toast';

const TABS = ['First Four', 'R64', 'R32', 'S16', 'E8', 'Championship', 'Full'];

const REGIONS = ['East', 'South', 'West', 'Midwest'];
const ROUND_GAME_IDS = {};
for (const { tab, prefix, count } of [
  { tab: 'R64', prefix: 'R64', count: 8 },
  { tab: 'R32', prefix: 'R32', count: 4 },
  { tab: 'S16', prefix: 'S16', count: 2 },
  { tab: 'E8',  prefix: 'E8',  count: 1 },
]) {
  const ids = [];
  for (const region of REGIONS) {
    for (let i = 1; i <= count; i++) ids.push(`${region}-${prefix}-${i}`);
  }
  ROUND_GAME_IDS[tab] = ids;
}
const CHAMP_GAME_IDS = ['F4-1', 'F4-2', 'CHAMP'];

export default function MobileBracket({ picks, makePick, makeFFPick, getGameTeams, odds, reset, fillRandomRound, fillRandomBracket, gameTree, teamsById, firstFourData, getShareURL }) {
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef(null);
  const programmaticScroll = useRef(false);
  const scrollTimeout = useRef(null);

  // Scroll to tab when activeTab changes programmatically (tab button click)
  const scrollToTab = useCallback((idx) => {
    const el = scrollRef.current;
    if (!el) return;
    programmaticScroll.current = true;
    el.scrollTo({ left: idx * el.offsetWidth, behavior: 'smooth' });
    // Release lock after scroll animation completes
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      programmaticScroll.current = false;
    }, 500);
  }, []);

  const handleTabClick = useCallback((idx) => {
    setActiveTab(idx);
    scrollToTab(idx);
  }, [scrollToTab]);

  // Sync tab state from swipe gestures (ignore programmatic scrolls)
  const handleScroll = () => {
    if (programmaticScroll.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    if (idx >= 0 && idx < TABS.length && idx !== activeTab) {
      setActiveTab(idx);
    }
  };

  // Find next unpicked game and scroll/swipe to it
  const advanceToNext = useCallback((justPickedId) => {
    setTimeout(() => {
      const tab = TABS[activeTab];

      let tabGameIds = [];
      if (ROUND_GAME_IDS[tab]) tabGameIds = ROUND_GAME_IDS[tab];
      else if (tab === 'Championship') tabGameIds = CHAMP_GAME_IDS;
      else return;

      // Find next unpicked game in current tab after the one just picked
      const justPickedIdx = tabGameIds.indexOf(justPickedId);
      for (let i = justPickedIdx + 1; i < tabGameIds.length; i++) {
        const gid = tabGameIds[i];
        const [t1, t2] = getGameTeams(gid);
        if (t1 && t2 && !t1.placeholder && !t2.placeholder && !picks[gid]) {
          const el = document.getElementById(`game-${gid}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      // Check earlier games in case they became available
      for (let i = 0; i <= justPickedIdx; i++) {
        const gid = tabGameIds[i];
        const [t1, t2] = getGameTeams(gid);
        if (t1 && t2 && !t1.placeholder && !t2.placeholder && !picks[gid]) {
          const el = document.getElementById(`game-${gid}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      // Tab complete — find next tab with unpicked games
      for (let offset = 1; offset < TABS.length; offset++) {
        const nextIdx = (activeTab + offset) % TABS.length;
        const nextTab = TABS[nextIdx];
        let nextIds = ROUND_GAME_IDS[nextTab] || (nextTab === 'Championship' ? CHAMP_GAME_IDS : []);
        for (const gid of nextIds) {
          const [t1, t2] = getGameTeams(gid);
          if (t1 && t2 && !t1.placeholder && !t2.placeholder && !picks[gid]) {
            handleTabClick(nextIdx);
            setTimeout(() => {
              const el = document.getElementById(`game-${gid}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 600);
            return;
          }
        }
      }
    }, 200);
  }, [activeTab, picks, getGameTeams, handleTabClick]);

  const renderTabContent = (tabIndex) => {
    const tab = TABS[tabIndex];
    if (tab === 'First Four') {
      return (
        <FirstFour
          firstFourData={firstFourData}
          picks={picks}
          onPick={makeFFPick}
          teamsById={teamsById}
        />
      );
    }
    if (tab === 'Full') {
      return (
        <MobileBracketOverview
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
          getShareURL={getShareURL}
        />
      );
    }
    if (tab === 'Championship') {
      return (
        <MobileFinalFour
          picks={picks}
          makePick={makePick}
          getGameTeams={getGameTeams}
          gameTree={gameTree}
          teamsById={teamsById}
          onPickComplete={advanceToNext}
        />
      );
    }
    return (
      <MobileRound
        roundTab={tab}
        picks={picks}
        onPick={makePick}
        getGameTeams={getGameTeams}
        gameTree={gameTree}
        onPickComplete={advanceToNext}
      />
    );
  };

  const SHORT = { 'First Four': 'FF', 'R64': '64', 'R32': '32', 'S16': '16', 'E8': 'E8', 'Championship': 'CH', 'Full': 'ALL' };
  const LABELS = { 'First Four': 'First 4', 'R64': 'Rd of 64', 'R32': 'Rd of 32', 'S16': 'Sweet 16', 'E8': 'Elite 8', 'Championship': 'Champ', 'Full': 'Full' };

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
            <button className="header-btn" onClick={() => {
              navigator.clipboard.writeText(getShareURL()).then(() => triggerToast('Link copied!'));
            }}>LINK</button>
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
            onClick={() => handleTabClick(i)}
          >
            {SHORT[tab]}
            <span className="mobile-tab-label">{LABELS[tab]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
