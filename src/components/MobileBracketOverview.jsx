import { useRef, useEffect, useCallback } from 'react';
import Bracket from './Bracket';

export default function MobileBracketOverview(props) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  // All gesture state in refs to avoid stale closures
  const scaleRef = useRef({ base: 0.25, user: 1 });
  const translateRef = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map());
  const gestureStart = useRef(null);
  const lastTap = useRef(0);
  const hasInitialized = useRef(false);

  const applyTransform = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const { base, user } = scaleRef.current;
    const { x, y } = translateRef.current;
    const s = base * user;
    el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }, []);

  const recalc = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // Force natural sizing — prevent flex shrink from constraining width
    content.style.transform = 'scale(1)';
    content.style.transformOrigin = 'top left';
    content.style.width = 'max-content';
    const naturalWidth = content.scrollWidth;
    const naturalHeight = content.scrollHeight;
    content.style.width = '';
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Skip if container not visible yet
    if (containerWidth === 0 || naturalWidth === 0) return;

    // Fit bracket into the container (both width and height)
    const sx = containerWidth / naturalWidth;
    const sy = containerHeight / naturalHeight;
    const s = Math.min(1, sx, sy);
    scaleRef.current = { base: s, user: 1 };
    translateRef.current = { x: 0, y: 0 };
    hasInitialized.current = true;
    applyTransform();
  }, [applyTransform]);

  // Use IntersectionObserver + MutationObserver for robust init
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mutObserver;
    const tryInit = () => {
      if (hasInitialized.current) return;
      const content = contentRef.current;
      if (!content || content.scrollWidth < 100) return; // bracket not rendered yet
      recalc();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasInitialized.current) {
          // Try immediately, then watch for content changes
          tryInit();
          if (!hasInitialized.current) {
            mutObserver = new MutationObserver(tryInit);
            mutObserver.observe(container, { childList: true, subtree: true });
          }
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    const handleResize = () => {
      hasInitialized.current = false;
      recalc();
    };
    const handleOrientation = () => {
      // Layout needs time to update after orientation change
      setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      observer.disconnect();
      mutObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [recalc]);

  const getDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const getCenter = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    try { containerRef.current?.setPointerCapture(e.pointerId); } catch (_) {}

    // Double-tap to reset
    const now = Date.now();
    if (pointers.current.size === 1 && now - lastTap.current < 300) {
      scaleRef.current.user = 1;
      translateRef.current = { x: 0, y: 0 };
      applyTransform();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    // Store gesture starting state
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
  }, [applyTransform]);

  const onPointerMove = useCallback((e) => {
    if (!pointers.current.has(e.pointerId)) return;
    e.preventDefault();
    e.stopPropagation();
    // Store plain object, not the event (avoids stale synthetic event refs)
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
  }, [applyTransform]);

  const onPointerUp = useCallback((e) => {
    pointers.current.delete(e.pointerId);
    try { containerRef.current?.releasePointerCapture(e.pointerId); } catch (_) {}

    if (pointers.current.size === 1) {
      // Transitioning from pinch to pan — reset gestureStart with current state
      // and the remaining pointer's CURRENT position
      const [remaining] = [...pointers.current.values()];
      gestureStart.current = {
        center: { x: remaining.clientX, y: remaining.clientY },
        scale: scaleRef.current.user,
        translate: { ...translateRef.current },
      };
    } else if (pointers.current.size === 0) {
      gestureStart.current = null;
    }
  }, []);

  return (
    <div
      className="mobile-overview"
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="mobile-overview-inner"
        ref={contentRef}
        style={{ transformOrigin: 'top left' }}
      >
        <Bracket {...props} disableAutoZoom />
      </div>
    </div>
  );
}
