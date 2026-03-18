import { useEffect, useRef, useState } from 'react';

export default function ControlsDropdown({ fillRandomRound, fillRandomBracket, reset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  return (
    <div className="export-wrapper" ref={ref}>
      <button className="download-btn download-btn--inverted" onClick={() => setOpen(!open)}>
        CONTROLS
      </button>
      {open && (
        <div className="export-dropdown export-dropdown--left">
          <button
            className="export-option"
            onClick={() => {
              setOpen(false);
              fillRandomRound?.();
            }}
          >
            RANDOM ROUND
          </button>
          <button
            className="export-option"
            onClick={() => {
              setOpen(false);
              fillRandomBracket?.();
            }}
          >
            RANDOM BRACKET
          </button>
          <button
            className="export-option"
            onClick={() => {
              setOpen(false);
              reset?.();
            }}
          >
            RESET
          </button>
        </div>
      )}
    </div>
  );
}

