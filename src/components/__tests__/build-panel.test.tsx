import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GameState, ResourceType } from '@/types/catan';
import { createInitialState } from '@/lib/game/state/createInitialState';
import { redactStateFor } from '@/lib/server/redact';
import { edgeId } from '@/lib/game/helpers/buildLegality';
import { BuildPanel } from '@/components/build/BuildPanel';

/**
 * The panel is a rendering of `buildLegality`, so these tests are about what reaches the
 * screen — enabled or not, which reason, which missing resources — rather than about the
 * rules themselves, which build-legality.test.ts pins to the reducer.
 */

const NOTHING: Record<ResourceType, number> = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
const PLENTY: Record<ResourceType, number> = { wood: 9, brick: 9, sheep: 9, wheat: 9, ore: 9 };

/** A main-phase game where seat 0 has rolled and owns a settlement with two roads. */
const gameFor = (resources: Record<ResourceType, number>, patch: Partial<GameState> = {}) => {
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
    players: initial.players.map(p => (p.id === 0 ? { ...p, resources: { ...resources } } : p)),
    ...patch,
  };

  return redactStateFor(state, 0);
};

const renderPanel = (view: ReturnType<typeof gameFor>, onSelect = vi.fn()) => {
  render(<BuildPanel state={view} activeKind={null} onSelect={onSelect} />);
  return { onSelect };
};

const option = (kind: string) =>
  document.querySelector(`[data-cy=build-option][data-kind=${kind}]`) as HTMLButtonElement | null;

describe('BuildPanel', () => {
  it('lists every buildable item with its cost', () => {
    renderPanel(gameFor(PLENTY));

    expect(document.querySelectorAll('[data-cy=build-option]')).toHaveLength(4);
    expect(screen.getByText('Road')).toBeInTheDocument();
    expect(screen.getByText('Settlement')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('Development Card')).toBeInTheDocument();

    // A city is 3 ore and 2 wheat, drawn as two icons rather than five.
    const cityIcons = option('city')!.querySelectorAll('[data-cy=resource-icon]');
    expect(Array.from(cityIcons).map(el => el.getAttribute('data-resource'))).toEqual(['ore', 'wheat']);
  });

  it('enables everything a rich player can afford', () => {
    renderPanel(gameFor(PLENTY));

    for (const kind of ['road', 'settlement', 'city', 'devCard']) {
      expect(option(kind), kind).toHaveAttribute('data-allowed', 'true');
      expect(option(kind), kind).toBeEnabled();
    }
  });

  it('disables what the player cannot pay for, and shows what is missing', () => {
    renderPanel(gameFor({ ...NOTHING, wood: 1 }));

    const road = option('road')!;
    expect(road).toBeDisabled();
    expect(road).toHaveAttribute('data-blocker', 'insufficient-resources');

    // Wood is covered, brick is not, so only brick is reported.
    const missing = road.querySelector('[data-cy=build-option-missing]')!;
    expect(Array.from(missing.querySelectorAll('[data-cy=resource-icon]')).map(el =>
      el.getAttribute('data-resource')
    )).toEqual(['brick']);
  });

  it('shows the remaining supply for each piece', () => {
    renderPanel(gameFor(PLENTY));

    // One settlement and two roads are already on the board in this fixture.
    expect(option('road')).toHaveAttribute('data-pieces-remaining', '13');
    expect(option('settlement')).toHaveAttribute('data-pieces-remaining', '4');
    expect(option('city')).toHaveAttribute('data-pieces-remaining', '4');
  });

  it('reports the reason when it is not the player\'s turn', () => {
    renderPanel(gameFor(PLENTY, { currentPlayerIndex: 1 }));

    expect(option('road')).toHaveAttribute('data-blocker', 'not-your-turn');
    expect(screen.getAllByText('Not your turn').length).toBeGreaterThan(0);
  });

  it('asks the player to roll before building', () => {
    renderPanel(gameFor(PLENTY, { diceRoll: null }));

    expect(option('settlement')).toHaveAttribute('data-blocker', 'dice-not-rolled');
    expect(screen.getAllByText('Roll the dice first').length).toBeGreaterThan(0);
  });

  it('offers only the piece the setup draft is waiting for', () => {
    renderPanel(gameFor(NOTHING, { phase: 'setup1', setupActionRequired: 'settlement', settlements: {}, roads: {} }));

    // Free during setup, so an empty hand is no obstacle.
    expect(option('settlement')).toHaveAttribute('data-allowed', 'true');
    expect(option('road')).toHaveAttribute('data-blocker', 'setup-requires');
    expect(option('city')).toHaveAttribute('data-blocker', 'wrong-phase');
    expect(option('devCard')).toHaveAttribute('data-blocker', 'wrong-phase');
  });

  it('reports an empty development deck', () => {
    renderPanel(gameFor(PLENTY, { devCardDeck: [] }));

    expect(option('devCard')).toHaveAttribute('data-blocker', 'dev-deck-empty');
  });

  it('selects an item that can be built', () => {
    const { onSelect } = renderPanel(gameFor(PLENTY));

    fireEvent.click(option('road')!);
    expect(onSelect).toHaveBeenCalledWith('road');
  });

  it('cannot be used to attempt a build it shows as unavailable', () => {
    const { onSelect } = renderPanel(gameFor(NOTHING));

    fireEvent.click(option('city')!);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows a spectator nothing at all', () => {
    const initial = createInitialState();
    const { container } = render(
      <BuildPanel state={redactStateFor(initial, null)} activeKind={null} onSelect={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
