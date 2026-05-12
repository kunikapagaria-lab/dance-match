import { useState, useEffect } from 'react';

export default function MotivationalMessage({ message, msgKey }) {
  const [show, setShow] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!message || msgKey === 0) return;
    setText(message);
    setShow(true);
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, [msgKey]);

  if (!show) return null;

  return (
    <div className="motiv-message">
      {text}
    </div>
  );
}
