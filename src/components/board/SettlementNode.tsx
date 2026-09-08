// components/board/SettlementNode.tsx
import { GameNode } from "@/types/catan";

interface SettlementNodeProps {
  node: GameNode;
  owner?: { playerId: number; isCity: boolean } | null;
  /**
   * Whether this node is a legal target for the build mode currently armed. Decided by
   * `buildLegality`, not here — a node is clickable only when the reducer would accept it.
   */
  isLegalTarget?: boolean;
  onSelect?: () => void;
  /** Drives the hover preview, which stands up in the piece layer rather than here. */
  onHover?: (hovering: boolean) => void;
}

/**
 * A settlement spot on the board plane: the click target, the legal-target marker and
 * the piece's contact shadow.
 *
 * The piece itself is not drawn here. It stands upright in the billboard layer, so this
 * element stays flat on the board where the pointer geometry and every `data-cy` the
 * specs rely on already live.
 */
export function SettlementNode({
  node,
  owner,
  isLegalTarget = false,
  onSelect,
  onHover,
}: SettlementNodeProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Illegal targets are inert: with no build mode armed, nothing on the board is
    // clickable, so a build the panel shows as unavailable cannot be attempted at all.
    if (!isLegalTarget) return;
    onSelect?.();
  };

  return (
    <g
      transform={`translate(${node.pixelPos.x}, ${node.pixelPos.y})`}
      onClick={handleClick}
      onPointerEnter={isLegalTarget ? () => onHover?.(true) : undefined}
      onPointerLeave={isLegalTarget ? () => onHover?.(false) : undefined}
      className={isLegalTarget ? "cursor-pointer" : undefined}
      data-cy="node"
      data-node-id={node.id}
      data-x={node.pixelPos.x}
      data-y={node.pixelPos.y}
      data-owner-id={owner ? owner.playerId : undefined}
      data-is-city={owner?.isCity ? 'true' : undefined}
      data-legal-target={isLegalTarget ? 'true' : undefined}
    >
      {/* Where the standing piece meets the board. Grounding a billboard is the whole
          job of this ellipse — without it the piece looks pasted on. */}
      {owner && (
        <ellipse
          rx={owner.isCity ? 17 : 14}
          ry={owner.isCity ? 7.5 : 6}
          cy="1"
          fill="rgba(12, 8, 3, 0.42)"
          className="pointer-events-none"
          data-cy="piece-shadow"
        />
      )}

      {isLegalTarget && (
        // A ring rather than a disc: an upgrade target already has a settlement standing
        // on it, and the marker has to stay visible around its feet.
        <circle
          r="11"
          fill="rgba(251, 191, 36, 0.22)"
          stroke="#fbbf24"
          strokeWidth="4"
          className="legal-target-pulse pointer-events-none drop-shadow-[0_0_3px_rgba(251,191,36,0.9)]"
          data-cy="legal-node-marker"
        />
      )}

      {/* Constant hit area, so the node has stable bounds whether or not it is armed. */}
      <circle r="13" fill="transparent" pointerEvents={isLegalTarget ? 'all' : 'none'} />
    </g>
  );
}
