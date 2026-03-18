import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { triggerToast } from './Toast';

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function captureCanvas() {
  const source = document.getElementById('bracket-root');
  if (!source) throw new Error('Could not find bracket root for export');

  const sandbox = document.createElement('div');
  sandbox.className = 'capture-sandbox';
  sandbox.style.position = 'fixed';
  sandbox.style.left = '-100000px';
  sandbox.style.top = '0';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.opacity = '0';

  const clone = source.cloneNode(true);
  clone.id = 'bracket-root-capture';
  clone.classList.add('capture-fixed');
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    await nextFrame();
    await nextFrame();

    const width = Math.ceil(clone.scrollWidth);
    const height = Math.ceil(clone.scrollHeight);
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.min(3, Math.max(2, dpr));

    return await html2canvas(clone, {
      backgroundColor: '#000000',
      scale,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
    });
  } finally {
    sandbox.remove();
  }
}

export default function DownloadButton({ getShareURL }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const copyToClipboard = async () => {
    setOpen(false);
    const canvas = await captureCanvas();
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        triggerToast('Image copied!');
      } catch {
        triggerToast('Copy failed');
      }
    });
  };

  const exportPNG = async () => {
    setOpen(false);
    const canvas = await captureCanvas();
    const link = document.createElement('a');
    link.download = 'mm2026-bracket.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportPDF = async () => {
    setOpen(false);
    const canvas = await captureCanvas();
    const imgData = canvas.toDataURL('image/png');
    const w = canvas.width;
    const h = canvas.height;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'px', format: [w, h] });
    pdf.addImage(imgData, 'PNG', 0, 0, w, h);
    pdf.save('mm2026-bracket.pdf');
  };

  const shareImage = async () => {
    setOpen(false);
    const canvas = await captureCanvas();
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'mm2026-bracket.png', { type: 'image/png' });
      try {
        await navigator.share({ files: [file] });
      } catch { /* user cancelled */ }
    });
  };

  const canShare = typeof navigator !== 'undefined' && navigator.share && navigator.canShare;

  const copyLink = async () => {
    setOpen(false);
    try {
      const url = typeof getShareURL === 'function' ? getShareURL() : window.location.href;
      await navigator.clipboard.writeText(url);
      triggerToast('Link copied!');
    } catch {
      triggerToast('Copy failed');
    }
  };

  return (
    <div className="export-wrapper" ref={ref}>
      <button className="download-btn" onClick={() => setOpen(!open)}>
        EXPORT
      </button>
      {open && (
        <div className="export-dropdown">
          <button className="export-option" onClick={copyLink}>COPY LINK</button>
          <button className="export-option" onClick={copyToClipboard}>COPY IMAGE</button>
          <button className="export-option" onClick={exportPNG}>SAVE PNG</button>
          <button className="export-option" onClick={exportPDF}>SAVE PDF</button>
          {canShare && <button className="export-option" onClick={shareImage}>SHARE</button>}
        </div>
      )}
    </div>
  );
}
