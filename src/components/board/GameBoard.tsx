'use client';

import { useMemo, useState } from 'react';
import { GameStateView, PlayerColor } from '@/types/catan';
import { HexTile } from './HexTile';
import { SettlementNode } from './SettlementNode';
import { RoadLayer } from './RoadLayer';
import { HarbourLayer } from './HarbourLayer';
import { NumberTokens, PieceDefs, PieceLayer } from './PieceLayer';
import { HEX_POLYGON_POINTS, boardView, islandPath } from '@/lib/board/geometry';
import { BOARD_BACKGROUND_IMAGE } from '@/lib/constants';
import { hexToPixel } from '@/lib/hex-utils';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface GameBoardProps {
  state: GameStateView;
  pendingRoads?: [string, string][];
  isMovingRobber?: boolean;
  /**
   * What the player is currently placing, or null when nothing is armed. With nothing
   * armed the board is inert — every affordance below is driven by this plus the legal
   * target sets, which come from `buildLegality`.
   */
  targetKind?: 'settlement' | 'city' | 'road' | null;
  /** Node ids the reducer would accept for `targetKind`. */
  legalNodes?: ReadonlySet<string>;
  /** Edge ids the reducer would accept for `targetKind`. */
  legalEdges?: ReadonlySet<string>;
  /** The viewing player's colour, used for every placement preview. */
  previewColor?: PlayerColor;
  onHexClick?: (hexId: string) => void;
  onBuildSettlement: (nodeId: string) => void;
  onBuildRoad: (nodeId1: string, nodeId2: string) => void;
  onUpgradeSettlement: (nodeId: string) => void;
  /** Pixels on each side covered by floating HUD panels; the board is fitted between them. */
  insetX?: number;
}

const NO_TARGETS: ReadonlySet<string> = new Set();

/**
 * The Catan board, flat and seen from directly above, on a sea background.
 *
 * One SVG in board units holds everything: terrain, harbours, number tokens, the pieces
 * (drawn in isometric projection so they still read as objects) and, on top, the click
 * targets. There is no camera, so a click lands exactly where it looks like it does.
 *
 * The renderer owns none of the game's truth. Every position comes from the node and hex
 * coordinates the reducer already uses, and every affordance from the legality selectors,
 * so the board cannot offer a build the reducer would reject.
 */
export function GameBoard({
  state: { hexes, nodes, settlements, roads, harbours, robberHexId, players },
  pendingRoads = [],
  isMovingRobber,
  targetKind = null,
  legalNodes = NO_TARGETS,
  legalEdges = NO_TARGETS,
  previewColor,
  onHexClick,
  onBuildSettlement,
  onBuildRoad,
  onUpgradeSettlement,
  insetX = 0,
}: GameBoardProps) {
  const [pendingUpgradeNode, setPendingUpgradeNode] = useState<string | null>(null);
  /** Which legal spot the pointer is over, so the piece can be previewed standing on it. */
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Colour by the player's chosen colour, never by seat index.
  const playerColors = useMemo(
    () => Object.fromEntries(players.map(p => [p.id, p.color])) as Record<number, PlayerColor>,
    [players]
  );

  // Derived from actual geometry so any board shape (including the asymmetric 5-6 player
  // expansion board) is framed correctly. Padding leaves room for the harbour docks.
  const view = useMemo(() => boardView(nodes), [nodes]);
  const surface = useMemo(() => islandPath(hexes), [hexes]);
  const box = `${view.minX} ${view.minY} ${view.w} ${view.h}`;

  // Nodes only accept clicks while a node-shaped piece is armed; a road mode must not
  // make settlement spots clickable.
  const isNodeMode = targetKind === 'settlement' || targetKind === 'city';

  const previewNode =
    isNodeMode && hoveredNode !== null && legalNodes.has(hoveredNode) ? hoveredNode : null;

  const handleUpgradeConfirm = () => {
    if (pendingUpgradeNode) {
      onUpgradeSettlement(pendingUpgradeNode);
      setPendingUpgradeNode(null);
    }
  };

  return (
    <>
      <div className="relative flex-1 overflow-hidden" data-cy="tabletop">
        <Ocean />

        <div
          className="absolute inset-y-0 flex items-center justify-center py-2.5"
          style={{ left: insetX, right: insetX }}
        >
          <svg
            viewBox={box}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full drop-shadow-[0_26px_46px_rgba(2,8,20,0.55)]"
            data-cy="game-board"
          >
            <defs>
              <PieceDefs />
              {/* Soft directional light across the whole island, so the tiles read as
                  one lit object rather than nineteen separate pictures. */}
              <linearGradient id="island-light" x1="0.1" y1="0" x2="0.85" y2="1">
                <stop offset="0%" stopColor="#fff4d6" stopOpacity="0.18" />
                <stop offset="42%" stopColor="#ffffff" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#05172c" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            {/* The shore: a parchment rim just outside the tiles. */}
            <g className="pointer-events-none">
              {hexes.map(hex => {
                const { x, y } = hexToPixel(hex.q, hex.r);
                return (
                  <polygon
                    key={hex.id}
                    points={HEX_POLYGON_POINTS}
                    transform={`translate(${x}, ${y}) scale(1.15)`}
                    fill="#e0c894"
                    opacity={0.55}
                  />
                );
              })}
            </g>

            <g id="hex-layer">
              {hexes.map(hex => (
                <HexTile
                  key={hex.id}
                  hex={hex}
                  isSelectable={isMovingRobber && hex.id !== robberHexId}
                  onClick={() => isMovingRobber && onHexClick?.(hex.id)}
                />
              ))}
            </g>

            <path d={surface} fill="url(#island-light)" className="pointer-events-none" />

            <HarbourLayer harbours={harbours} nodes={nodes} />

            <NumberTokens hexes={hexes} />

            <RoadLayer
              nodes={nodes}
              roads={roads}
              pendingRoads={pendingRoads}
              legalEdges={targetKind === 'road' ? legalEdges : undefined}
              previewColor={previewColor}
              onBuildRoad={onBuildRoad}
            />

            <PieceLayer
              hexes={hexes}
              nodes={nodes}
              settlements={settlements}
              roads={roads}
              playerColors={playerColors}
              robberHexId={robberHexId}
              preview={
                previewNode === null
                  ? null
                  : { nodeId: previewNode, kind: targetKind === 'city' ? 'city' : 'settlement', color: previewColor }
              }
            />

            {/* Last, so the legal-target rings and click targets sit above the pieces. */}
            <g id="node-layer">
              {nodes.map(node => (
                <SettlementNode
                  key={node.id}
                  node={node}
                  owner={settlements[node.id]}
                  isLegalTarget={isNodeMode && legalNodes.has(node.id)}
                  onHover={hovering => setHoveredNode(hovering ? node.id : null)}
                  onSelect={() =>
                    targetKind === 'city'
                      ? setPendingUpgradeNode(node.id)
                      : onBuildSettlement(node.id)
                  }
                />
              ))}
            </g>
          </svg>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!pendingUpgradeNode}
        title="Upgrade to City?"
        message="Transform this settlement into a city for 3 Ore and 2 Wheat. Cities generate double resources."
        onConfirm={handleUpgradeConfirm}
        onCancel={() => setPendingUpgradeNode(null)}
      />
    </>
  );
}

/**
 * The sea around the board: the texture at full strength under one radial vignette that
 * darkens toward the page ground, so the edges recede behind the HUD panels.
 */
function Ocean() {
  const [textureFailed, setTextureFailed] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#071528]" data-cy="board-background-fallback" />

      {!textureFailed && (
        // eslint-disable-next-line @next/next/no-img-element -- needs a plain onError fallback, not next/image's opaque loader
        <img
          src={BOARD_BACKGROUND_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          data-cy="board-background-image"
          data-image-src={BOARD_BACKGROUND_IMAGE}
          onError={() => setTextureFailed(true)}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(6,14,28,0) 0%, rgba(6,14,28,0.55) 100%)',
        }}
      />
    </div>
  );
}
