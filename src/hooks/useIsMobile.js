import { useState, useEffect } from 'react';

// mobile: phone portrait/landscape (short side <768px)
// tablet: 768-1099px — shows desktop bracket with auto-zoom
// desktop: 1100px+
function getMode() {
  // Keep desktop mode stable under browser zoom:
  // on non-touch devices, zoom should not force tablet/mobile mode.
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const zoomScale = window.visualViewport?.scale || 1;
  const effectiveWidth = window.innerWidth * zoomScale;
  const effectiveHeight = window.innerHeight * zoomScale;
  const shortSide = Math.min(effectiveWidth, effectiveHeight);

  if (!isCoarsePointer) return 'desktop';
  if (shortSide < 768) return 'mobile';
  if (effectiveWidth < 1100) return 'tablet';
  return 'desktop';
}

export default function useDeviceMode() {
  const [mode, setMode] = useState(getMode);

  useEffect(() => {
    const handler = () => setMode(getMode());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return mode;
}
