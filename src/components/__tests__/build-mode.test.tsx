import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GameState, ResourceType } from '@/types/catan';
import { createInitialState } from '@/lib/game/state/createInitialState';
import { redactStateFor } from '@/lib/server/redact';
import { edgeId, legalRoadEdges, legalSettlementNodes, buildStateFromGame } from '@/lib/game/helpers/buildLegality';
import { GameView } from '@/components/game/GameView';

/**
 * Build mode as the player experiences it: nothing on the board is clickable until a
 * piece is armed, arming one highlights exactly the legal targets, and there is always a
 * way back out.
 *
 * The expected highlight sets come from the selectors rather than from hand-written node
 * ids, so this stays a test of the wiring — that the board is shown what the selectors
 * say — and not a second, weaker copy of the placement rules.
 */

const PLENTY: Record<ResourceType, number> = { wood: 9, brick: 9, sheep: 9, wheat: 9, ore: 9 };

const buildGame = (patch: Partial<GameState> = {}) => {
  const initial = createInitialState();
  const node = initial.nodes.find(n =>
    n.neighbors.some(id => (initial.nodes.find(o => o.id === id)?.neighbors.length ?? 0) >= 2)
  )!;
  const neighbor = initial.nodes.find(n => n.id === node.neighbors[0])!;
  const far = neighbor.neighbors.find(id => id !== node.id)!;
  const road = (a: string, b: string) => ({
    [edgeId(a, b)]: { id: edgeId(a, b), playerId: 0, nodes: [a, b] as [string, string] },
  });

  const state: GameState = {
    ...initial,
    phase: 'main',
    setupActionRequired: 'none',
    currentPlayerIndex: 0,
    diceRoll: 6,
    settlements: { [node.id]: { nodeId: node.id, playerId: 0, isCity: false } },
    roads: { ...road(node.id, neighbor.id), ...road(neighbor.id, far) },
    players: initial.players.map(p => (p.id === 0 ? { ...p, resources: { ...PLENTY } } : p)),
    ...patch,
  };

  return state;
};

const renderGame = (state: GameState) => {
  const performAction = vi.fn();
  render(<GameView state={redactStateFor(state, 0)} performAction={performAction} onLeave={vi.fn()} />);
  return { performAction };
};

const highlighted = () => document.querySelectorAll('[data-legal-target="true"]');
const legalNodes = () => document.querySelectorAll('[data-cy=node][data-legal-target="true"]');
const legalEdges = () => document.querySelectorAll('[data-cy=edge][data-legal-target="true"]');
const buildOption = (kind: string) =>
  document.querySelector(`[data-cy=build-option][data-kind=${kind}]`) as HTMLButtonElement;

describe('build mode on the board', () => {
  it('highlights nothing until a piece is armed', () => {
    renderGame(buildGame());

    expect(highlighted()).toHaveLength(0);
  });

  it('highlights exactly the edges the selector calls legal when a road is armed', () => {
    const state = buildGame();
    renderGame(state);

    fireEvent.click(buildOption('road'));

    const expected = legalRoadEdges(buildStateFromGame(state), 0).map(([a, b]) => edgeId(a, b));
    const shown = Array.from(legalEdges()).map(el =>
      edgeId(el.getAttribute('data-node-1')!, el.getAttribute('data-node-2')!)
    );

    expect(shown.length).toBeGreaterThan(0);
    expect(shown.sort()).toEqual(expected.sort());
    // A road mode must not make settlement spots clickable.
    expect(legalNodes()).toHaveLength(0);
  });

  it('highlights exactly the nodes the selector calls legal when a settlement is armed', () => {
    const state = buildGame();
    renderGame(state);

    fireEvent.click(buildOption('settlement'));

    const expected = legalSettlementNodes(buildStateFromGame(state), 0);
    const shown = Array.from(legalNodes()).map(el => el.getAttribute('data-node-id')!);

    expect(shown.length).toBeGreaterThan(0);
    expect(shown.sort()).toEqual(expected.sort());
    expect(legalEdges()).toHaveLength(0);
  });

  it('offers only the player\'s own un-upgraded settlements for a city', () => {
    const state = buildGame();
    renderGame(state);

    fireEvent.click(buildOption('city'));

    const shown = Array.from(legalNodes()).map(el => el.getAttribute('data-node-id')!);
    expect(shown).toEqual(Object.keys(state.settlements));
  });

  it('builds on the target that was clicked, then disarms', () => {
    const state = buildGame();
    const { performAction } = renderGame(state);

    fireEvent.click(buildOption('settlement'));
    const target = legalNodes()[0] as SVGGElement;
    const nodeId = target.getAttribute('data-node-id');
    fireEvent.click(target);

    expect(performAction).toHaveBeenCalledWith({
      type: 'BUILD_SETTLEMENT',
      payload: { nodeId, playerId: 0 },
    });
    // The mode does not stay armed after the piece is placed.
    expect(highlighted()).toHaveLength(0);
  });

  it('ignores a click on a node that is not a legal target', () => {
    const state = buildGame();
    const { performAction } = renderGame(state);

    fireEvent.click(buildOption('settlement'));
    const illegal = document.querySelector('[data-cy=node]:not([data-legal-target])')!;
    fireEvent.click(illegal);

    expect(performAction).not.toHaveBeenCalled();
  });

  it('buys a development card immediately rather than arming the board', () => {
    const { performAction } = renderGame(buildGame());

    fireEvent.click(buildOption('devCard'));

    expect(performAction).toHaveBeenCalledWith({ type: 'BUY_DEV_CARD', payload: { playerId: 0 } });
    expect(highlighted()).toHaveLength(0);
  });

  describe('cancelling', () => {
    it('clears every highlight on Escape', () => {
      renderGame(buildGame());
      fireEvent.click(buildOption('road'));
      expect(highlighted().length).toBeGreaterThan(0);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(highlighted()).toHaveLength(0);
    });

    it('clears every highlight from the on-screen control', () => {
      renderGame(buildGame());
      fireEvent.click(buildOption('settlement'));
      expect(highlighted().length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(highlighted()).toHaveLength(0);
    });

    it('re-arming the same piece toggles it back off', () => {
      renderGame(buildGame());

      fireEvent.click(buildOption('road'));
      fireEvent.click(buildOption('road'));

      expect(highlighted()).toHaveLength(0);
    });
  });

  describe('phases that arm themselves', () => {
    it('highlights setup placements without anything being selected', () => {
      const state = buildGame({
        phase: 'setup1',
        setupActionRequired: 'settlement',
        settlements: {},
        roads: {},
      });
      renderGame(state);

      // The snake draft is a build mode the player never has to arm.
      expect(legalNodes()).toHaveLength(state.nodes.length);
    });

    it('highlights robber destinations instead of build targets when a 7 is rolled', () => {
      const state = buildGame({
        diceRoll: 7,
        pendingRobberAction: { status: 'moving' },
      });
      renderGame(state);

      const hexes = document.querySelectorAll('[data-cy=hex][data-legal-target="true"]');
      // Every hex but the one the robber already sits on.
      expect(hexes).toHaveLength(state.hexes.length - 1);
      expect(legalNodes()).toHaveLength(0);
      expect(legalEdges()).toHaveLength(0);
    });
  });
});
