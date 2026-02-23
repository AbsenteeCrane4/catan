// components/board/icons/SettlementIcon.tsx
export function SettlementIcon({ color }: { color: string }) {
  return (
    <path
      d="M -8 6 L -8 -2 L 0 -9 L 8 -2 L 8 6 Z"
    //   d="M -8 4 L -8 -2 L 0 -8 L 8 -2 L 8 4 Z" Older, smaller settlement shape
      fill={color}
      stroke="white"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="drop-shadow-md transition-all duration-300"
    />
  );
}