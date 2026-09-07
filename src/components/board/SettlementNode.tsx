// components/board/SettlementNode.tsx
import { GameNode, PlayerColor } from "@/types/catan";
import { SettlementIcon } from "@/components/ui/SettlementIcon";
import { CityIcon } from "@/components/ui/CityIcon";

interface SettlementNodeProps {
  node: GameNode;
  owner?: { playerId: number; isCity: boolean } | null;
  /** The owning player's chosen colour. Supplied by GameBoard, never derived from seat index. */
  ownerColor?: PlayerColor;
  /**
   * Whether this node is a legal target for the build mode currently armed. Decided by
   * `buildLegality`, not here — a node is clickable only when the reducer would accept it.
   */
  isLegalTarget?: boolean;
  /** What clicking would place, drawn as a hover preview in the player's own colour. */
  previewKind?: 'settlement' | 'city';
  previewColor?: PlayerColor;
  onSelect?: () => void;
}

export function SettlementNode({
  node,
  owner,
  ownerColor,
  isLegalTarget = false,
  previewKind,
  previewColor,
  onSelect,
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
      className={isLegalTarget ? "cursor-pointer group" : undefined}
      data-cy="node"
      data-node-id={node.id}
      data-x={node.pixelPos.x}
      data-y={node.pixelPos.y}
      data-owner-id={owner ? owner.playerId : undefined}
      data-is-city={owner?.isCity ? 'true' : undefined}
      data-legal-target={isLegalTarget ? 'true' : undefined}
    >
      {/* Existing piece. A city preview sits on top of the settlement it replaces. */}
      {owner && (
        owner.isCity ? (
          <CityIcon color={ownerColor ?? 'white'} />
        ) : (
          <SettlementIcon color={ownerColor ?? 'white'} />
        )
      )}

      {isLegalTarget && (
        <>
          {/* The shared "you may click this" marker, identical for nodes, edges and hexes. */}
          <circle
            r="10"
            fill="rgba(251,191,36,0.25)"
            stroke="#fbbf24"
            strokeWidth="4"
            className="legal-target-pulse drop-shadow-[0_0_3px_rgba(251,191,36,0.9)] group-hover:opacity-0"
            data-cy="legal-node-marker"
          />

          {/* Hover preview: the actual piece, in the player's own colour. */}
          <g className="opacity-0 transition-opacity group-hover:opacity-90" data-cy="node-preview">
            {previewKind === 'city' ? (
              <CityIcon color={previewColor ?? 'white'} />
            ) : (
              <SettlementIcon color={previewColor ?? 'white'} />
            )}
          </g>
        </>
      )}
    </g>
  );
}
