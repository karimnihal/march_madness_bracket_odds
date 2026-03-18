import html2canvas from 'html2canvas';

export default function DownloadButton() {
  const handleDownload = async () => {
    const el = document.getElementById('bracket-root');
    document.body.classList.add('capture-mode');
    try {
      const canvas = await html2canvas(el, { backgroundColor: '#000000', scale: 2 });
      const link = document.createElement('a');
      link.download = 'mm2026-bracket.png';
      link.href = canvas.toDataURL();
      link.click();
    } finally {
      document.body.classList.remove('capture-mode');
    }
  };

  return (
    <button className="download-btn" onClick={handleDownload}>
      DOWNLOAD BRACKET
    </button>
  );
}
