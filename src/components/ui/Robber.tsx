import React from 'react';

interface RobberProps {
  x: number;
  y: number;
}

export const Robber: React.FC<RobberProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-none transition-all duration-500 ease-in-out">
      {/* Shadow */}
      <ellipse cx="0" cy="12" rx="12" ry="4" fill="black" fillOpacity="0.3" />
      {/* Body */}
      <path 
        d="M -10 15 L -6 -5 L -8 -8 L 0 -15 L 8 -8 L 6 -5 L 10 15 Z" 
        fill="#334155" 
        stroke="#0f172a" 
        strokeWidth="2"
      />
      {/* Head */}
      <circle cx="0" cy="-12" r="7" fill="#334155" stroke="#0f172a" strokeWidth="2" />
    </g>
  );
}