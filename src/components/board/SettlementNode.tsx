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
  /** Drives the hover preview, which `PieceLayer` draws. */
  onHover?: (hovering: boolean) => void;
}

/**
 * A settlement spot on the board: the click target and the legal-target marker.
 *
 * The piece itself is drawn by `PieceLayer`, which ignores the pointer, so this element
 * is always what a click on the spot reaches.
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
