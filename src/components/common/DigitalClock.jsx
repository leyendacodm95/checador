import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function DigitalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = time.toLocaleDateString('es-ES', options);
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="flex items-center justify-center gap-1.5 md:gap-3">
      <div className="text-center md:text-right">
        <div className="flex items-center justify-center md:justify-end gap-1 md:gap-1.5 font-mono text-base md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-wider">
          <Clock className="w-4 h-4 md:w-6 md:h-6 animate-pulse text-blue-500 hidden sm:inline-block" />
          <span>{hours}:{minutes}:{seconds}</span>
        </div>
        <div className="text-[9px] md:text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-tight md:leading-normal">
          {capitalizedDate}
        </div>
      </div>
    </div>
  );
}
