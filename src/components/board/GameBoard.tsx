'use client';

import { useMemo, useState } from 'react';
import { GameStateView, PlayerColor } from '@/types/catan';
import { HexTile } from './HexTile';
import { SettlementNode } from './SettlementNode';
import { RoadLayer } from './RoadLayer';
import { HarbourLayer } from './HarbourLayer';
import { FallbackPieces, NumberTokens } from './BoardPieces';
import { Tabletop, WorldLayer } from './Tabletop';
import { boardEdges, boardView, islandPath } from '@/lib/board/geometry';
import { ScenePiece } from '@/lib/board/pieceScene';
import { hexToPixel } from '@/lib/hex-utils';
import { pieceShades } from '@/lib/constants';
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

/** Dark turned wood — the one piece on the board that is nobody's colour. */
const ROBBER_COLOR = '#2b2320';

/**
 * The Catan board: a flat board seen from an elevated angle, with the game pieces
 * standing on it as three.js meshes.
 *
 * The two layers have a deliberate division of labour. The board is DOM — terrain,
 * harbours, legal-target markers and every click target are SVG on a CSS-transformed
 * plane, so the pointer and the specs work exactly as they did when it was flat. The
 * pieces are 3D, drawn on a canvas above it from the list assembled here.
 *
 * The renderer owns none of the game's truth either way. Every position comes from the
 * node and hex coordinates the reducer already uses, and every affordance comes from the
 * legality selectors — so a piece cannot be drawn somewhere the engine disagrees with,
 * and the board cannot offer a build the reducer would reject.
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

  const previewNode =
    isNodeMode && hoveredNode !== null && legalNodes.has(hoveredNode) ? hoveredNode : null;

  /**
   * Every piece on the board, for the 3D layer.
   *
   * Ids are stable and derived from the node or edge the piece occupies, so a settlement
   * that is already standing is left alone rather than rebuilt and dropped again when
   * something else on the board changes.
   */
  const meshes = useMemo<ScenePiece[]>(() => {
    const list: ScenePiece[] = [];

    for (const node of nodes) {
      const settlement = settlements[node.id];
      if (!settlement) continue;
      list.push({
        id: `piece:${node.id}`,
        kind: settlement.isCity ? 'city' : 'settlement',
        x: node.pixelPos.x,
        y: node.pixelPos.y,
        color: pieceShades(playerColors[settlement.playerId]).base,
      });
    }

    for (const edge of boardEdges(nodes)) {
      const road = roads[edge.id];
      if (!road) continue;
      list.push({
        id: `road:${edge.id}`,
        kind: 'road',
        x: edge.a.pixelPos.x,
        y: edge.a.pixelPos.y,
        x2: edge.b.pixelPos.x,
        y2: edge.b.pixelPos.y,
        color: pieceShades(playerColors[road.playerId]).base,
      });
    }

    const robberHex = hexes.find(h => h.id === robberHexId);
    if (robberHex) {
      const { x, y } = hexToPixel(robberHex.q, robberHex.r);
      list.push({ id: 'robber', kind: 'robber', x, y, color: ROBBER_COLOR });
    }

    // Placement previews are the same meshes, ghosted — so what the player sees hovering
    // is literally the piece that will land there.
    const ghost = pieceShades(previewColor).top;

    if (previewNode !== null) {
      const node = nodes.find(n => n.id === previewNode);
      if (node) {
        list.push({
          id: 'ghost:node',
          kind: targetKind === 'city' ? 'city' : 'settlement',
          x: node.pixelPos.x,
          y: node.pixelPos.y,
          color: ghost,
          ghost: true,
        });
      }
    }

    // The first of the two free Road Building roads, held until the second is chosen.
    for (const [a, b] of pendingRoads) {
      const from = nodes.find(n => n.id === a);
      const to = nodes.find(n => n.id === b);
      if (!from || !to) continue;
      list.push({
        id: `ghost:road:${a}-${b}`,
        kind: 'road',
        x: from.pixelPos.x,
        y: from.pixelPos.y,
        x2: to.pixelPos.x,
        y2: to.pixelPos.y,
        color: ghost,
        ghost: true,
      });
    }

    return list;
  }, [
    nodes,
    settlements,
    roads,
    hexes,
    robberHexId,
    playerColors,
    previewNode,
    targetKind,
    previewColor,
    pendingRoads,
  ]);

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
        meshes={meshes}
        ground={
          <WorldLayer z={0} interactive>
            <svg viewBox={box} className="h-full w-full overflow-visible" data-cy="game-board">
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

              <path d={surface} fill="url(#tt-island-light)" className="pointer-events-none" />
              <path
                d={surface}
                fill="none"
                stroke="rgba(30, 21, 9, 0.55)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="pointer-events-none"
              />

              <HarbourLayer harbours={harbours} nodes={nodes} />

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
        }
        billboards={<NumberTokens view={view} hexes={hexes} />}
        fallbackPieces={
          <FallbackPieces
            view={view}
            hexes={hexes}
            nodes={nodes}
            settlements={settlements}
            roads={roads}
            playerColors={playerColors}
            robberHexId={robberHexId}
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
