/**
 * The robber, as a hooded figure with a heavy silhouette (`docs/DESIGN.md` §15).
 *
 * Shape only, drawn around the origin with its base on y = 12 — the board stands it up
 * as a billboard on whichever hex it occupies and casts its contact shadow separately,
 * so this component knows nothing about board coordinates.
 */
const STONE = { top: '#6a7b93', base: '#3c4a5e', side: '#212a38', edge: '#0d131c' };

export function RobberIcon() {
  return (
    <g>
      <path
        d="M-9.5 12 L-6 -0.5 Q-5.4 -5.6 0 -7.2 Q5.4 -5.6 6 -0.5 L9.5 12 Z"
        fill={STONE.base}
      />
      <path d="M-9.5 12 L-6 -0.5 Q-5.4 -5.6 0 -7.2 L0 12 Z" fill={STONE.top} opacity="0.75" />
      <path d="M0 -7.2 Q5.4 -5.6 6 -0.5 L9.5 12 L0 12 Z" fill={STONE.side} />

      <circle cx="0" cy="-10.4" r="5.3" fill={STONE.base} />
      <path d="M-5.3 -10.4 A5.3 5.3 0 0 1 0 -15.7 L0 -5.1 Z" fill={STONE.top} opacity="0.75" />
      <path d="M0 -15.7 A5.3 5.3 0 0 1 5.3 -10.4 A5.3 5.3 0 0 1 0 -5.1 Z" fill={STONE.side} />
      {/* The shadow under the hood is what makes it read as a figure and not a bollard. */}
      <ellipse cx="0" cy="-9.6" rx="3.1" ry="2.5" fill={STONE.edge} opacity="0.8" />

      <path
        d="M-9.5 12 L-6 -0.5 Q-5.4 -5.6 0 -7.2 Q5.4 -5.6 6 -0.5 L9.5 12 Z"
        fill="none"
        stroke={STONE.edge}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="0" cy="-10.4" r="5.3" fill="none" stroke={STONE.edge} strokeWidth="1.2" />
    </g>
  );
}
