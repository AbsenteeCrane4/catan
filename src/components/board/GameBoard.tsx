'use client';

import { useMemo, useState } from 'react';
import { GameStateView, PlayerColor } from '@/types/catan';
import { HexTile } from './HexTile';
import { SettlementNode } from './SettlementNode';
import { RoadBodies, RoadLayer } from './RoadLayer';
import { HarbourLayer } from './HarbourLayer';
import { BoardPieces } from './BoardPieces';
import { Tabletop, WorldLayer } from './Tabletop';
import { boardView, islandPath } from '@/lib/board/geometry';
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
}

const NO_TARGETS: ReadonlySet<string> = new Set();

/** Height, shade and width of each pass over the built roads, bottom slice first. */
const ROAD_SLICES = [
  { z: 2.5, shade: 'side', width: 11 },
  { z: 6, shade: 'base', width: 10 },
  { z: 9, shade: 'top', width: 4.5 },
] as const;

/**
 * The Catan board as a physical object on a table.
 *
 * The board is a stack of layers in one CSS 3D scene rather than a single flat SVG: the
 * terrain and everything clickable lie on the board plane and foreshorten with it, the
 * roads sit on layers above it so they have thickness, and the pieces stand up as
 * billboards. See `Tabletop` for the scene itself.
 *
 * The renderer owns none of the game's truth. Every position here comes from the node and
 * hex coordinates the reducer already uses, and every affordance comes from the legality
 * selectors — so a piece cannot be drawn somewhere the engine disagrees with, and the
 * board cannot offer a build the reducer would reject.
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

  const preview =
    isNodeMode && hoveredNode !== null && legalNodes.has(hoveredNode)
      ? { nodeId: hoveredNode, kind: targetKind, color: previewColor }
      : null;

  const handleUpgradeConfirm = () => {
    if (pendingUpgradeNode) {
      onUpgradeSettlement(pendingUpgradeNode);
      setPendingUpgradeNode(null);
    }
  };

  return (
    <>
      <Tabletop
        view={view}
        hexes={hexes}
        ground={
          <>
            <WorldLayer z={0} interactive>
              <svg
                viewBox={box}
                className="h-full w-full overflow-visible"
                data-cy="game-board"
              >
                <defs>
                  {/* Soft directional light across the whole island, so the tiles read as
                      one lit object rather than nineteen separate pictures. */}
                  <linearGradient id="tt-island-light" x1="0.1" y1="0" x2="0.85" y2="1">
                    <stop offset="0%" stopColor="#fff4d6" stopOpacity="0.22" />
                    <stop offset="42%" stopColor="#ffffff" stopOpacity="0.02" />
                    <stop offset="100%" stopColor="#05172c" stopOpacity="0.32" />
                  </linearGradient>
                </defs>

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

                <path
                  d={surface}
                  fill="url(#tt-island-light)"
                  className="pointer-events-none"
                />
                <path
                  d={surface}
                  fill="none"
                  stroke="rgba(30, 21, 9, 0.55)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  className="pointer-events-none"
                />

                <RoadLayer
                  nodes={nodes}
                  roads={roads}
                  pendingRoads={pendingRoads}
                  legalEdges={targetKind === 'road' ? legalEdges : undefined}
                  previewColor={previewColor}
                  onBuildRoad={onBuildRoad}
                />

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
            </WorldLayer>

            <WorldLayer z={-18}>
              <svg viewBox={box} className="h-full w-full overflow-visible" aria-hidden>
                <HarbourLayer harbours={harbours} nodes={nodes} />
              </svg>
            </WorldLayer>

            {/* Roads, as three slices of one solid piece: sides, body, lit crown. */}
            {ROAD_SLICES.map(({ z, shade, width }) => (
              <WorldLayer key={z} z={z}>
                <svg viewBox={box} className="h-full w-full overflow-visible" aria-hidden>
                  <RoadBodies
                    nodes={nodes}
                    roads={roads}
                    playerColors={playerColors}
                    shade={shade}
                    width={width}
                  />
                </svg>
              </WorldLayer>
            ))}
          </>
        }
        pieces={
          <BoardPieces
            view={view}
            hexes={hexes}
            nodes={nodes}
            settlements={settlements}
            playerColors={playerColors}
            robberHexId={robberHexId}
            preview={preview}
          />
        }
      />

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
