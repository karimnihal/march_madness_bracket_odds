import { useState, useEffect, useCallback } from 'react';

export default function useAutoZoom(contentRef, containerRef, disabled) {
  const [scale, setScale] = useState(1);

  const recalc = useCallback(() => {
    if (disabled) return;
    const content = contentRef.current;
    const container = containerRef.current;
    if (!content || !container) return;

    content.style.transform = 'scale(1)';
    content.style.transformOrigin = 'top center';
    const naturalWidth = content.scrollWidth;
    content.style.transform = '';

    const availableWidth = container.clientWidth;
    const s = Math.min(1, availableWidth / naturalWidth);
    setScale(s);
  }, [contentRef, containerRef, disabled]);

  useEffect(() => {
    if (disabled) { setScale(1); return; }
    recalc();
    let timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(recalc, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [recalc, disabled]);

  return scale;
}
