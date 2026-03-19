import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Bracket from './Bracket';
import MobileFinalFour from './MobileFinalFour';
import MobileRound from './MobileRound';
import OddsTracker from './OddsTracker';
import DownloadButton from './DownloadButton';
import OverlayPanelShell from './overlay/OverlayPanelShell';
import ControlsDropdown from './ControlsDropdown';
import { triggerToast } from './Toast';

function getShowMobileUI() {
  // Use viewport-based media queries so mobile UI shows immediately on phones,
  // regardless of whether the Full tab (with measurable container) is mounted yet.
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return coarse && shortSide < 800;
}

export default function ResponsiveOverview(props) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const rootRef = useRef(null);
  const [showMobileUI, setShowMobileUI] = useState(() => getShowMobileUI());
  const [isFullMode, setIsFullMode] = useState(true);

  const isMobileLike = showMobileUI;

  // All gesture state in refs to avoid stale closures
  const scaleRef = useRef({ base: 1, user: 1 });
  const translateRef = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map());
  const gestureStart = useRef(null);
  const lastTap = useRef(0);

  const applyTransform = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    if (!isMobileLike || !isFullMode) {
      el.style.transform = 'none';
      return;
    }
    const { base, user } = scaleRef.current;
    const { x, y } = translateRef.current;
    const s = base * user;
    el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }, [isMobileLike, isFullMode]);

  const recalc = useCallback(() => {
    if (!isMobileLike || !isFullMode) {
      scaleRef.current = { base: 1, user: 1 };
      translateRef.current = { x: 0, y: 0 };
      applyTransform();
      return;
    }
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    content.style.transform = 'scale(1)';
    content.style.transformOrigin = 'top left';
    content.style.width = 'max-content';
    const naturalWidth = content.scrollWidth;
    const naturalHeight = content.scrollHeight;
    content.style.width = '';

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || naturalWidth === 0) return;

    const sx = cw / naturalWidth;
    const sy = ch / naturalHeight;
    const s = Math.min(1, sx, sy);
    scaleRef.current = { base: s, user: 1 };
    translateRef.current = { x: 0, y: 0 };
    applyTransform();
  }, [applyTransform, isMobileLike, isFullMode]);

  useEffect(() => {
    const coarseMq = window.matchMedia?.('(pointer: coarse)');
    const handler = () => setShowMobileUI(getShowMobileUI());

    handler();
    coarseMq?.addEventListener?.('change', handler);
    window.addEventListener('resize', handler);
    return () => {
      coarseMq?.removeEventListener?.('change', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  useEffect(() => {
    const updateOffset = () => {
      const root = rootRef.current;
      if (!root) return;

      // Prefer the visible sticky header on desktop; fall back to 0 if missing.
      const header = root.querySelector('.bracket-header--sticky');
      if (!header) {
        root.style.setProperty('--overlayTop', '0px');
        return;
      }

      const h = Math.ceil(header.getBoundingClientRect().height);
      root.style.setProperty('--overlayTop', `${h}px`);
    };

    updateOffset();

    const root = rootRef.current;
    const header = root?.querySelector('.bracket-header--sticky');
    const ro = (header && typeof ResizeObserver !== 'undefined')
      ? new ResizeObserver(updateOffset)
      : null;
    if (ro && header) ro.observe(header);

    window.addEventListener('resize', updateOffset);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, []);

  useEffect(() => {
    // Recompute base scale when mobile-like flips or content changes size.
    recalc();
  }, [recalc, isMobileLike, isFullMode]);

  const getDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const getCenter = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

  const onPointerDown = useCallback((e) => {
    if (!isMobileLike || !isFullMode) return;
    e.preventDefault();
    e.stopPropagation();
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    try { containerRef.current?.setPointerCapture(e.pointerId); } catch (_) {}

    const now = Date.now();
    if (pointers.current.size === 1 && now - lastTap.current < 300) {
      scaleRef.current.user = 1;
      translateRef.current = { x: 0, y: 0 };
      applyTransform();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gestureStart.current = {
        dist: getDist(a, b),
        center: getCenter(a, b),
        scale: scaleRef.current.user,
        translate: { ...translateRef.current },
      };
    } else if (pointers.current.size === 1) {
      gestureStart.current = {
        center: { x: e.clientX, y: e.clientY },
        scale: scaleRef.current.user,
        translate: { ...translateRef.current },
      };
    }
  }, [applyTransform, isMobileLike, isFullMode]);

  const onPointerMove = useCallback((e) => {
    if (!isMobileLike || !isFullMode) return;
    if (!pointers.current.has(e.pointerId)) return;
    e.preventDefault();
    e.stopPropagation();
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if (!gestureStart.current) return;

    if (pointers.current.size === 2 && gestureStart.current.dist) {
      const [a, b] = [...pointers.current.values()];
      const newDist = getDist(a, b);
      const newCenter = getCenter(a, b);
      const scaleDelta = newDist / gestureStart.current.dist;
      scaleRef.current.user = Math.min(Math.max(gestureStart.current.scale * scaleDelta, 0.5), 5);
      translateRef.current = {
        x: gestureStart.current.translate.x + (newCenter.x - gestureStart.current.center.x),
        y: gestureStart.current.translate.y + (newCenter.y - gestureStart.current.center.y),
      };
      applyTransform();
    } else if (pointers.current.size === 1) {
      translateRef.current = {
        x: gestureStart.current.translate.x + (e.clientX - gestureStart.current.center.x),
        y: gestureStart.current.translate.y + (e.clientY - gestureStart.current.center.y),
      };
      applyTransform();
    }
  }, [applyTransform, isMobileLike, isFullMode]);

  const onPointerUp = useCallback((e) => {
    if (!isMobileLike || !isFullMode) return;
    pointers.current.delete(e.pointerId);
    try { containerRef.current?.releasePointerCapture(e.pointerId); } catch (_) {}

    if (pointers.current.size === 1) {
      const [remaining] = [...pointers.current.values()];
      gestureStart.current = {
        center: { x: remaining.clientX, y: remaining.clientY },
        scale: scaleRef.current.user,
        translate: { ...translateRef.current },
      };
    } else if (pointers.current.size === 0) {
      gestureStart.current = null;
    }
  }, [isMobileLike, isFullMode]);

  const { odds, fillRandomRound, fillRandomBracket, reset, getShareURL } = props;

  return (
    <div
      ref={rootRef}
      className={`responsive-root ${isMobileLike ? 'responsive-root--mobile' : 'responsive-root--desktop'} ${isFullMode ? 'responsive-root--full' : ''}`}
    >
      <div className="mobile-header">
        <div className="mobile-header-row">
          <div className="mobile-header-left">
            <ControlsDropdown fillRandomRound={fillRandomRound} fillRandomBracket={fillRandomBracket} reset={reset} />
          </div>
          <h1 className="mobile-title">MM 2026</h1>
          <div className="mobile-header-right">
            <DownloadButton getShareURL={getShareURL} />
          </div>
        </div>
        <OddsTracker odds={odds} />
      </div>

      <div className="responsive-bracket-layer">
        <Bracket {...props} disableAutoZoom />
      </div>

      <OverlayPanelShell
        onFullModeChange={setIsFullMode}
        onRenderPanel={(section) => {
          if (section === 'r64') return <MobileRound roundTab="R64" picks={props.picks} onPick={props.makePick} getGameTeams={props.getGameTeams} gameTree={props.gameTree} />;
          if (section === 'r32') return <MobileRound roundTab="R32" picks={props.picks} onPick={props.makePick} getGameTeams={props.getGameTeams} gameTree={props.gameTree} />;
          if (section === 's16') return <MobileRound roundTab="S16" picks={props.picks} onPick={props.makePick} getGameTeams={props.getGameTeams} gameTree={props.gameTree} />;
          if (section === 'e8') return <MobileRound roundTab="E8" picks={props.picks} onPick={props.makePick} getGameTeams={props.getGameTeams} gameTree={props.gameTree} />;
          if (section === 'championship') {
              return <MobileFinalFour picks={props.picks} makePick={props.makePick} getGameTeams={props.getGameTeams} gameTree={props.gameTree} teamsById={props.teamsById} odds={props.odds} />;
          }
          return null;
        }}
      />
    </div>
  );
}

