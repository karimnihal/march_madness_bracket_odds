import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SECTIONS = [
  { id: 'r64', label: '64' },
  { id: 'r32', label: '32' },
  { id: 's16', label: '16' },
  { id: 'e8', label: 'E8' },
  { id: 'championship', label: 'CH' },
  { id: 'full', label: 'ALL' },
];

function getLayout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isPortrait = h >= w;
  return { isPortrait };
}

export default function OverlayPanelShell({ onRenderPanel, onFullModeChange }) {
  const [active, setActive] = useState('full'); // default to Full mode
  const [layout, setLayout] = useState(getLayout);
  const [landscapeNavHidden, setLandscapeNavHidden] = useState(true);
  const panelRef = useRef(null);

  const isFull = active === 'full';
  const isOpen = active !== 'full' && active !== 'none';

  useEffect(() => {
    const handler = () => setLayout(getLayout());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    // Default: hidden in landscape, always visible in portrait.
    if (layout.isPortrait) setLandscapeNavHidden(false);
    else setLandscapeNavHidden(true);
  }, [layout.isPortrait]);

  useEffect(() => {
    onFullModeChange?.(isFull);
  }, [isFull, onFullModeChange]);

  const wrapperClass = useMemo(() => {
    const orient = layout.isPortrait ? 'overlay--portrait' : 'overlay--landscape';
    const open = isOpen ? 'overlay--open' : 'overlay--closed';
    const full = isFull ? 'overlay--full' : 'overlay--panel';
    const nav = (!layout.isPortrait && landscapeNavHidden) ? 'overlay--nav-hidden' : 'overlay--nav-shown';
    return `overlay-shell ${orient} ${open} ${full} ${nav}`;
  }, [isFull, isOpen, layout.isPortrait, landscapeNavHidden]);

  const close = useCallback(() => setActive('full'), []);

  const onBackdrop = useCallback(() => {
    close();
  }, [close]);

  const onKey = useCallback((e) => {
    if (e.key === 'Escape') close();
  }, [close]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onKey]);

  return (
    <div className={wrapperClass}>
      <div className="overlay-nav">
        {SECTIONS.map((s) => (
          (s.id === 'full' && !layout.isPortrait) ? (
            <button
              key={s.id}
              className="overlay-nav-btn overlay-nav-btn--toggle"
              onClick={() => setLandscapeNavHidden(v => !v)}
              aria-label={landscapeNavHidden ? 'Show sidebar' : 'Hide sidebar'}
              title={landscapeNavHidden ? 'Show' : 'Hide'}
            >
              {landscapeNavHidden ? '‹' : '›'}
            </button>
          ) : (
            <button
              key={s.id}
              className={`overlay-nav-btn ${active === s.id ? 'overlay-nav-btn--active' : ''}`}
              onClick={() => setActive(s.id)}
            >
              {s.label}
            </button>
          )
        ))}
      </div>

      {isOpen && <div className="overlay-backdrop" onClick={onBackdrop} />}

      <aside className="overlay-panel" ref={panelRef} aria-hidden={!isOpen}>
        <div className="overlay-panel-inner">
          <button className="overlay-close" onClick={close}>CLOSE</button>
          {onRenderPanel?.(active)}
        </div>
      </aside>
    </div>
  );
}

