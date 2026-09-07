'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnyCardArgs, DevelopmentCardType, GameAction, GameStateView } from '@/types/catan';
import { ownHand } from '@/lib/game/helpers/playerView';
import {
  buildStateFromView,
  edgeId,
  isPlaceable,
  legalTargets,
  type BuildKind,
  type PlaceableKind,
} from '@/lib/game/helpers/buildLegality';
import { BuildPanel } from '@/components/build/BuildPanel';
import { clsx } from 'clsx';
import { GameBoard } from '@/components/board/GameBoard';
import { PlayerSidebar } from '@/components/ui/PlayerSidebar';
import { PlayerHand } from '@/components/hand/PlayerHand';
import { TradeUI } from '@/components/ui/TradeUI';
import { StealModal } from '@/components/ui/StealModal';
import { GameOverModal } from '@/components/ui/GameOverModal';

const BUILD_MODE_PROMPTS: Record<PlaceableKind, string> = {
  road: 'Choose where to build your road',
  settlement: 'Choose where to build your settlement',
  city: 'Choose a settlement to upgrade',
};

/** The one banner for "the board is waiting for you to pick a target". */
function BoardModeBanner({
  tone,
  message,
  onCancel,
}: {
  tone: 'amber' | 'blue';
  message: string;
  onCancel?: () => void;
}) {
  return (
    <div
      data-cy="board-mode-banner"
      className={clsx(
        "absolute top-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border px-5 py-2.5 font-bold text-white shadow-xl",
        tone === 'amber'
          ? "border-amber-400/60 bg-amber-500/90 text-slate-900 shadow-amber-900/40"
          : "border-blue-400 bg-blue-600 shadow-blue-900/50"
      )}
    >
      <span className="text-sm">{message}</span>
      {onCancel && (
        <button
          type="button"
          data-cy="cancel-build-btn"
          onClick={onCancel}
          className={clsx(
            "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors",
            tone === 'amber'
              ? "bg-slate-900/80 text-amber-200 hover:bg-slate-900"
              : "bg-blue-900/70 text-blue-100 hover:bg-blue-900"
          )}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

interface GameViewProps {
  state: GameStateView;
  performAction: (action: GameAction) => void;
  onLeave: () => void;
}

export function GameView({ state, performAction, onLeave }: GameViewProps) {
  // The seat comes from the payload, not from a prop threaded down beside it. The same
  // server function decides `viewerSeatIndex` and what to reveal, so the seat we render
  // as "you" can never disagree with the hand we were sent. null = spectator.
  const myPlayerIndex = state.viewerSeatIndex;
  const myHand = ownHand(state);

  const [activeMapAction, setActiveMapAction] = useState<'none' | 'roadBuilding' | 'knight'>('none');
  const [pendingRoadBuildingRoads, setPendingRoadBuildingRoads] = useState<[string, string][]>([]);
  /** Which piece the player has armed from the build panel. Local presentation state. */
  const [buildMode, setBuildMode] = useState<PlaceableKind | null>(null);

  const isMyTurn = myPlayerIndex !== null && state.currentPlayerIndex === myPlayerIndex;
  const isMovingRobber = state.pendingRobberAction?.status === 'moving' && isMyTurn;
  const isStealing = state.pendingRobberAction?.status === 'stealing' && isMyTurn;
  const inSetup = state.phase !== 'main';

  /**
   * What the board is currently accepting.
   *
   * The snake draft and the Road Building card are not special cases with their own
   * click handling: they arm the same target mode the build panel does, which is what
   * makes one highlighting system cover all three.
   */
  const boardTarget: PlaceableKind | null = useMemo(() => {
    if (!isMyTurn || isMovingRobber) return null;
    if (activeMapAction === 'roadBuilding') return 'road';
    if (inSetup) return state.setupActionRequired === 'road' ? 'road' : 'settlement';
    return buildMode;
  }, [isMyTurn, isMovingRobber, activeMapAction, inSetup, state.setupActionRequired, buildMode]);

  /**
   * The legal targets for that mode, straight from the shared selectors.
   *
   * The pending free road is folded into the state first, because `applyRoadBuilding`
   * validates the second road against a board that already holds the first — so without
   * this the second selection would highlight a set the reducer disagrees with.
   */
  const legal = useMemo(() => {
    if (boardTarget === null || myPlayerIndex === null) {
      return { nodes: new Set<string>(), edges: new Set<string>() };
    }

    const base = buildStateFromView(state);
    const withPending = pendingRoadBuildingRoads.reduce((acc, [a, b]) => ({
      ...acc,
      roads: { ...acc.roads, [edgeId(a, b)]: { id: edgeId(a, b), playerId: myPlayerIndex, nodes: [a, b] as [string, string] } },
    }), base);

    const targets = legalTargets(withPending, myPlayerIndex, boardTarget);
    return {
      nodes: new Set(targets.nodes),
      edges: new Set(targets.edges.map(([a, b]) => edgeId(a, b))),
    };
  }, [boardTarget, myPlayerIndex, state, pendingRoadBuildingRoads]);

  const cancelBuildMode = useCallback(() => {
    setBuildMode(null);
    setActiveMapAction('none');
    setPendingRoadBuildingRoads([]);
  }, []);

  // Escape always drops whatever is armed. The robber is deliberately excluded: a 7 has
  // been rolled and it has to be placed, so there is nothing to cancel.
  useEffect(() => {
    if (buildMode === null && activeMapAction === 'none') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelBuildMode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [buildMode, activeMapAction, cancelBuildMode]);

  /**
   * Nothing stays armed outside the player's own turn. Derived rather than reset in an
   * effect, so there is no render where the panel and the board disagree about it.
   */
  const activeBuildMode = isMyTurn ? buildMode : null;

  const handleBuildSelect = (kind: BuildKind) => {
    if (myPlayerIndex === null) return;
    if (!isPlaceable(kind)) {
      performAction({ type: 'BUY_DEV_CARD', payload: { playerId: myPlayerIndex } });
      return;
    }
    setBuildMode(current => (current === kind ? null : kind));
  };

  // Intercept road building clicks before they hit performAction
  const handleEdgeClick = (n1: string, n2: string) => {
    if (myPlayerIndex === null) return;
    if (activeMapAction === 'none') {
      performAction({ type: 'BUILD_ROAD', payload: { nodeId1: n1, nodeId2: n2, playerId: myPlayerIndex } });
      setBuildMode(null);
    } else if (activeMapAction === 'roadBuilding') {
      const newRoad: [string, string] = [n1, n2];
      const updatedPending = [...pendingRoadBuildingRoads, newRoad];

      if (updatedPending.length === 1) {
        setPendingRoadBuildingRoads(updatedPending);
      } else if (updatedPending.length === 2) {
        performAction({
          type: 'PLAY_DEV_CARD',
          payload: {
            playerId: myPlayerIndex,
            cardType: 'roadBuilding',
            cardArgs: { road1: updatedPending[0], road2: updatedPending[1] }
          }
        });
        setActiveMapAction('none');
        setPendingRoadBuildingRoads([]);
      }
    }
  };

  const handleHexClick = (hexId: string) => {
    if (myPlayerIndex === null) return;
    if (isMovingRobber) {
      performAction({ type: 'MOVE_ROBBER', payload: { hexId, playerId: myPlayerIndex } });
    }
  };

  const playDevCard = (cardType: DevelopmentCardType, cardArgs?: AnyCardArgs) => {
    if (myPlayerIndex === null) return;
    performAction({ type: 'PLAY_DEV_CARD', payload: { playerId: myPlayerIndex, cardType, cardArgs } });
  };

  const initiateMapCard = (cardType: 'roadBuilding') => {
    setActiveMapAction(cardType);
    if (cardType === 'roadBuilding') setPendingRoadBuildingRoads([]);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-white">
      <div className="flex min-h-0 flex-1">
        {/* Left HUD: build actions above the turn and player information (DESIGN.md §19). */}
        <div className="flex min-h-0 w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-700 bg-slate-800/90 backdrop-blur">
          <div className="p-3 pb-0">
            <BuildPanel state={state} activeKind={activeBuildMode} onSelect={handleBuildSelect} />
          </div>

          <PlayerSidebar
            players={state.players}
            currentPlayerIndex={state.currentPlayerIndex}
            myPlayerIndex={myPlayerIndex}
            diceRoll={state.diceRoll}
            longestRoad={state.longestRoad}
            onRoll={() => performAction({ type: 'ROLL_DICE' })}
            onEndTurn={() => {
              performAction({ type: 'END_TURN' });
              cancelBuildMode();
            }}
          />
        </div>

        {/* Center: The Map */}
        <main className="flex-1 relative flex items-center justify-center overflow-hidden">
          {activeMapAction === 'roadBuilding' && (
            <BoardModeBanner
              tone="blue"
              message={pendingRoadBuildingRoads.length === 0
                ? "Select an edge for your 1st free road"
                : "Select an edge for your 2nd free road"}
              onCancel={cancelBuildMode}
            />
          )}

          {/* Armed from the build panel. Cancelling here or with Escape clears every
              highlight, so there is always a way out of a build mode. */}
          {activeBuildMode !== null && activeMapAction === 'none' && !inSetup && (
            <BoardModeBanner
              tone="amber"
              message={BUILD_MODE_PROMPTS[activeBuildMode]}
              onCancel={cancelBuildMode}
            />
          )}

          {isMovingRobber && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-full font-bold shadow-xl shadow-purple-900/50 animate-pulse z-20 border border-purple-400">
              Select a tile to place the Robber
            </div>
          )}

          <GameBoard
            state={state}
            pendingRoads={pendingRoadBuildingRoads}
            isMovingRobber={isMovingRobber}
            onHexClick={handleHexClick}
            targetKind={boardTarget}
            legalNodes={legal.nodes}
            legalEdges={legal.edges}
            previewColor={myPlayerIndex === null ? undefined : state.players[myPlayerIndex]?.color}
            onBuildSettlement={(nodeId) => {
              if (myPlayerIndex === null) return;
              performAction({ type: 'BUILD_SETTLEMENT', payload: { nodeId, playerId: myPlayerIndex } });
              setBuildMode(null);
            }}
            onBuildRoad={handleEdgeClick}
            onUpgradeSettlement={(nodeId) => {
              if (myPlayerIndex === null) return;
              performAction({ type: 'UPGRADE_SETTLEMENT', payload: { nodeId, playerId: myPlayerIndex } });
              setBuildMode(null);
            }}
          />
        </main>

        {/* Right Sidebar: Trading & Logs */}
        <aside className="w-80 bg-slate-900/50 border-l border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/30">
            {myPlayerIndex !== null && myHand ? (
              <TradeUI
                localPlayerId={myPlayerIndex}
                currentPlayerIndex={state.currentPlayerIndex}
                localPlayer={myHand}
                players={state.players}
                currentTradeOffer={state.currentTradeOffer}
                onTradeWithBank={(offerResource, requestResource) => performAction({ type: 'TRADE_WITH_BANK', payload: { playerId: myPlayerIndex, offerResource, requestResource } })}
                onProposeTrade={(offer) => performAction({ type: 'PROPOSE_TRADE', payload: { offer } })}
                onAcceptTrade={() => performAction({ type: 'ACCEPT_TRADE', payload: { acceptorId: myPlayerIndex } })}
                onCancelTrade={() => performAction({ type: 'CANCEL_TRADE' })}
              />
            ) : (
              <div data-cy="spectator-panel" className="p-4 text-center border border-dashed border-slate-700 rounded-xl">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-3">You are spectating</p>
                <button
                  onClick={onLeave}
                  data-cy="stop-spectating-btn"
                  className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  Leave
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4">Event Log</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {[...state.gameLog].map((log, i) => (
                <div key={i} className="text-[10px] font-mono text-slate-500 border-l border-slate-800 pl-2 leading-relaxed animate-in fade-in slide-in-from-left-1">
                  <span className="text-slate-700">#</span> {log}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* The player's own cards: bottom-anchored, a sibling of the board row rather than
          an overlay, so it can never cover the board it sits under. */}
      <PlayerHand
        state={state}
        onPlayDevCard={playDevCard}
        onInitiateMapCard={initiateMapCard}
      />

      {isStealing && myPlayerIndex !== null && state.pendingRobberAction?.validVictims && (
        <StealModal
          victims={state.pendingRobberAction.validVictims}
          players={state.players}
          onSelect={(victimId) => performAction({ type: 'STEAL_RESOURCE', payload: { thiefId: myPlayerIndex, victimId } })}
        />
      )}

      {state.isGameOver && state.winnerId !== null && (
        <GameOverModal
          winnerId={state.winnerId}
          players={state.players}
          onLeaveRoom={onLeave}
        />
      )}
    </div>
  );
}
