import { useEffect, useRef, useState } from 'react';

interface ExamTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
}

export default function ExamTimer({ totalSeconds, onTimeUp }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isWarning = remaining <= 300;

  return (
    <div
      className={`text-center font-mono text-xl font-bold px-4 py-2 rounded-md border ${
        isWarning
          ? 'border-destructive text-destructive bg-destructive/10'
          : 'border-border text-foreground bg-muted'
      }`}
    >
      残り {display}
    </div>
  );
}
