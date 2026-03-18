import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAMP_GAME_IDS, LABELS, ROUND_GAME_IDS, SHORT, TABS } from './constants';

export default function MobileTabsShell({ picks, getGameTeams, renderTab, onActiveTabChange }) {
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef(null);
  const programmaticScroll = useRef(false);
  const scrollTimeout = useRef(null);

  useEffect(() => {
    onActiveTabChange?.(TABS[activeTab]);
  }, [activeTab, onActiveTabChange]);

  const scrollToTab = useCallback((idx) => {
    const el = scrollRef.current;
    if (!el) return;
    programmaticScroll.current = true;
    el.scrollTo({ left: idx * el.offsetWidth, behavior: 'smooth' });
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      programmaticScroll.current = false;
    }, 500);
  }, []);

  const handleTabClick = useCallback((idx) => {
    setActiveTab(idx);
    scrollToTab(idx);
  }, [scrollToTab]);

  const handleScroll = () => {
    if (programmaticScroll.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    if (idx >= 0 && idx < TABS.length && idx !== activeTab) {
      setActiveTab(idx);
    }
  };

  const advanceToNext = useCallback((justPickedId) => {
    setTimeout(() => {
      const tab = TABS[activeTab];

      let tabGameIds = [];
      if (ROUND_GAME_IDS[tab]) tabGameIds = ROUND_GAME_IDS[tab];
      else if (tab === 'Championship') tabGameIds = CHAMP_GAME_IDS;
      else return;

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

      for (let i = 0; i <= justPickedIdx; i++) {
        const gid = tabGameIds[i];
        const [t1, t2] = getGameTeams(gid);
        if (t1 && t2 && !t1.placeholder && !t2.placeholder && !picks[gid]) {
          const el = document.getElementById(`game-${gid}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      for (let offset = 1; offset < TABS.length; offset++) {
        const nextIdx = (activeTab + offset) % TABS.length;
        const nextTab = TABS[nextIdx];
        const nextIds = ROUND_GAME_IDS[nextTab] || (nextTab === 'Championship' ? CHAMP_GAME_IDS : []);
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
  }, [activeTab, getGameTeams, handleTabClick, picks]);

  return (
    <>
      <div className="mobile-panels" ref={scrollRef} onScroll={handleScroll}>
        {TABS.map((tab) => (
          <div key={tab} className="mobile-panel">
            {renderTab({ tab, onPickComplete: advanceToNext, isActive: TABS[activeTab] === tab })}
          </div>
        ))}
      </div>

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
    </>
  );
}

