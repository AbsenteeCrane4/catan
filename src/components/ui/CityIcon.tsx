// components/board/icons/CityIcon.tsx
export function CityIcon({ color }: { color: string }) {
  return (
    <path
      d="M -12 8 L -12 -2 L -6 -2 L -6 -10 L 6 -10 L 6 8 Z"
      // d="M -10 6 L -10 -2 L -5 -2 L -5 -8 L 5 -8 L 5 6 Z" Older, smaller city shape
      fill={color}
      stroke="white"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="drop-shadow-lg transition-all duration-300"
    />
  );
}