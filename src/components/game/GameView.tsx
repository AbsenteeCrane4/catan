'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
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
import { TopBar } from '@/components/hud/TopBar';
import { PlayersPanel } from '@/components/hud/PlayersPanel';
import { TradePanel } from '@/components/hud/TradePanel';
import { ActivityLog } from '@/components/hud/ActivityLog';
import { HandBar } from '@/components/hud/HandBar';
import { StealModal } from '@/components/ui/StealModal';
import { GameOverModal } from '@/components/ui/GameOverModal';

/** A floating HUD column. Widths and the board inset below must agree. */
const PANEL_COLUMN =
  "hs-scroll pointer-events-none absolute top-4 bottom-4 z-10 flex w-[280px] flex-col gap-3.5 overflow-y-auto xl:w-[330px] [&>*]:pointer-events-auto";

const WIDE = '(min-width: 1280px)';

/** Panel width plus its 16px margin, per breakpoint — what the board is fitted between. */
function usePanelInset(): number {
  // matchMedia is absent in jsdom; treat that like the server render, a wide screen.
  const wide = useSyncExternalStore(
    onChange => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mq = window.matchMedia(WIDE);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => typeof window.matchMedia !== 'function' || window.matchMedia(WIDE).matches,
    () => true
  );
  return wide ? 346 : 296;
}

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
  const panelInset = usePanelInset();

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
    <div className="flex h-screen flex-col overflow-hidden bg-hs-abyss font-hud text-hs-text">
      <TopBar state={state} onLeave={onLeave} />

      {/* The board region: the sea fills it edge to edge, and the HUD panels float
          over its sides as glass cards rather than sitting in flush sidebars. */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <main className="absolute inset-0 flex">
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
            insetX={panelInset}
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

        {/* The columns ignore the pointer so the board can still be dragged in the gaps
            between panels; the panels themselves take it back. */}
        <div className={clsx(PANEL_COLUMN, "left-4")}>
          <BuildPanel state={state} activeKind={activeBuildMode} onSelect={handleBuildSelect} />
          <PlayersPanel state={state} />
        </div>

        <div className={clsx(PANEL_COLUMN, "right-4")}>
          {myPlayerIndex !== null && myHand ? (
            <TradePanel
              state={state}
              me={myHand}
              onTradeWithBank={(offerResource, requestResource) => performAction({ type: 'TRADE_WITH_BANK', payload: { playerId: myPlayerIndex, offerResource, requestResource } })}
              onProposeTrade={(offer) => performAction({ type: 'PROPOSE_TRADE', payload: { offer } })}
              onAcceptTrade={() => performAction({ type: 'ACCEPT_TRADE', payload: { acceptorId: myPlayerIndex } })}
              onCancelTrade={() => performAction({ type: 'CANCEL_TRADE' })}
            />
          ) : (
            <div data-cy="spectator-panel" className="hs-panel flex shrink-0 flex-col items-center gap-3 px-4 py-5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-hs-mute">You are spectating</p>
              <button
                onClick={onLeave}
                data-cy="stop-spectating-btn"
                className="cursor-pointer rounded-[7px] border border-[rgba(110,160,220,0.2)] bg-[rgba(20,40,68,0.6)] px-4 py-2 text-[13px] font-semibold text-hs-dim transition-colors hover:text-hs-text"
              >
                Leave
              </button>
            </div>
          )}

          <ActivityLog log={state.gameLog} players={state.players} />
        </div>
      </div>

      <HandBar
        state={state}
        onRoll={() => performAction({ type: 'ROLL_DICE' })}
        onEndTurn={() => {
          performAction({ type: 'END_TURN' });
          cancelBuildMode();
        }}
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
