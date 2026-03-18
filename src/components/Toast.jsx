import { useState, useEffect, useCallback } from 'react';

let showToastGlobal = null;

export function triggerToast(message) {
  if (showToastGlobal) showToastGlobal(message);
}

export default function Toast() {
  const [message, setMessage] = useState(null);

  const show = useCallback((msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  }, []);

  useEffect(() => {
    showToastGlobal = show;
    return () => { showToastGlobal = null; };
  }, [show]);

  if (!message) return null;

  return <div className="toast">{message}</div>;
}
