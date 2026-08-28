import { useMemo, useState } from 'react';
import { GameState, PlayerColor } from '@/types/catan';
import { HexTile } from './HexTile';
import { SettlementNode } from './SettlementNode';
import { RoadLayer } from './RoadLayer';
import { BOARD_BACKGROUND_IMAGE, HEX_SIZE } from '@/lib/constants';
import { Robber } from '@/components/ui/Robber';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { HarbourLayer } from './HarbourLayer';

interface GameBoardProps {
  state: GameState;
  pendingRoads?: [string, string][];
  isMovingRobber?: boolean;
  onHexClick?: (hexId: string) => void;
  onBuildSettlement: (nodeId: string) => void;
  onBuildRoad: (nodeId1: string, nodeId2: string) => void;
  onUpgradeSettlement: (nodeId: string) => void;
}

export function GameBoard({ 
  state: { hexes, nodes, settlements, roads, harbours, robberHexId, players },
  pendingRoads = [],
  isMovingRobber,
  onHexClick,
  onBuildSettlement,
  onBuildRoad,
  onUpgradeSettlement
}: GameBoardProps) {

  const [pendingUpgradeNode, setPendingUpgradeNode] = useState<string | null>(null);
  const [backgroundFailed, setBackgroundFailed] = useState(false);

  // Colour by the player's chosen colour, never by seat index.
  const playerColors = useMemo(
    () => Object.fromEntries(players.map(p => [p.id, p.color])) as Record<number, PlayerColor>,
    [players]
  );

  // Derived from actual geometry so any board shape (including the asymmetric 5-6 player
  // expansion board) is framed correctly. Padding leaves room for the harbour docks.
  const view = useMemo(() => {
    const pad = HEX_SIZE * 1.6;
    const xs = nodes.map(n => n.pixelPos.x);
    const ys = nodes.map(n => n.pixelPos.y);
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    return { minX, minY, w: Math.max(...xs) + pad - minX, h: Math.max(...ys) + pad - minY };
  }, [nodes]);

  const robberHex = hexes.find(h => h.id === robberHexId);

  const robberPos = robberHex ? { x: HEX_SIZE * Math.sqrt(3) * (robberHex.q + robberHex.r / 2), y: HEX_SIZE * 3 / 2 * robberHex.r } : null;

  const handleUpgradeConfirm = () => {
    if (pendingUpgradeNode) {
      onUpgradeSettlement(pendingUpgradeNode);
      setPendingUpgradeNode(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center">
      {/* Colour fallback sits underneath so a failed image load still leaves an ocean-ish
          backdrop instead of bare slate. */}
      <div className="absolute inset-0 bg-blue-950" data-cy="board-background-fallback" />
      {!backgroundFailed && (
        // eslint-disable-next-line @next/next/no-img-element -- needs a plain onError fallback, not next/image's opaque loader
        <img
          src={BOARD_BACKGROUND_IMAGE}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          data-cy="board-background-image"
          data-image-src={BOARD_BACKGROUND_IMAGE}
          onError={() => setBackgroundFailed(true)}
        />
      )}

      <svg
        viewBox={`${view.minX} ${view.minY} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-h-[85vh] drop-shadow-2xl"
        data-cy="game-board"
      >
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

        <HarbourLayer harbours={harbours} nodes={nodes} />

        {robberPos && <Robber x={robberPos.x} y={robberPos.y} />}
        
        <RoadLayer nodes={nodes} roads={roads} pendingRoads={pendingRoads} playerColors={playerColors} onBuildRoad={onBuildRoad} />
        
        <g id="node-layer">
          {nodes.map(node => (
            <SettlementNode 
              key={node.id} 
              node={node}
              owner={settlements[node.id]}
              ownerColor={settlements[node.id] ? playerColors[settlements[node.id].playerId] : undefined}
              onBuild={() => onBuildSettlement(node.id)}
              onUpgrade={() => setPendingUpgradeNode(node.id)} 
            />
          ))}
        </g>
      </svg>

      <ConfirmationModal 
        isOpen={!!pendingUpgradeNode}
        title="Upgrade to City?"
        message="Transform this settlement into a city for 3 Ore and 2 Wheat. Cities generate double resources."
        onConfirm={handleUpgradeConfirm}
        onCancel={() => setPendingUpgradeNode(null)}
      />
    </div>
  );
}