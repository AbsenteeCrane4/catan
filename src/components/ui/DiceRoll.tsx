'use client';
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

export function DiceRoll({ value }: { value: number | null }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (value && value !== displayValue) {
      setIsRolling(true);
      
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2);
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        setDisplayValue(value);
        setIsRolling(false);
      }, 1000);
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  if (!displayValue) return null;

  return (
    <div className={clsx(
      "w-20 h-20 bg-white text-slate-900 rounded-2xl flex items-center justify-center text-4xl font-black shadow-2xl border-b-4 border-slate-300 transition-all",
      isRolling ? "animate-bounce scale-110 rotate-12" : "scale-100 rotate-0"
    )}>
      {displayValue}
    </div>
  );
}