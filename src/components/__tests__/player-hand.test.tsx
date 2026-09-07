import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DevelopmentCardType, GameState, ResourceType } from '@/types/catan';
import { createInitialState } from '@/lib/game/state/createInitialState';
import { redactStateFor } from '@/lib/server/redact';
import { PlayerHand } from '@/components/hand/PlayerHand';

/**
 * The hand renders from a redacted view, so every fixture here is built by running a real
 * `GameState` through `redactStateFor` rather than by hand. A hand-written `GameStateView`
 * would let this suite keep passing after the wire shape changed underneath it — which is
 * exactly the failure the nullable hand fields exist to prevent.
 */
const viewFor = (
  seat: number | null,
  edit: (state: GameState) => GameState = s => s
) => redactStateFor(edit(createInitialState()), seat);

const withHand = (
  seat: number,
  resources: Partial<Record<ResourceType, number>>,
  devCards: Partial<GameState['players'][number]['devCards']> = {}
) => (state: GameState): GameState => ({
  ...state,
  players: state.players.map((p, i) =>
    i === seat
      ? {
          ...p,
          resources: { ...p.resources, ...resources },
          devCards: { ...p.devCards, ...devCards },
        }
      : p
  ),
});

const renderHand = (
  view: ReturnType<typeof viewFor>,
  onPlayDevCard = vi.fn(),
  onInitiateMapCard = vi.fn()
) => {
  render(
    <PlayerHand state={view} onPlayDevCard={onPlayDevCard} onInitiateMapCard={onInitiateMapCard} />
  );
  return { onPlayDevCard, onInitiateMapCard };
};

const cardFor = (resource: ResourceType) =>
  document.querySelector(`[data-cy=hand-resource-card][data-resource=${resource}]`);

const devCardFor = (type: DevelopmentCardType) =>
  document.querySelector(`[data-cy=hand-dev-card][data-card-type=${type}]`);

describe('PlayerHand', () => {
  describe('resource cards', () => {
    it('draws one card per resource type held, carrying the count', () => {
      renderHand(viewFor(0, withHand(0, { wood: 3, ore: 1 })));

      expect(document.querySelectorAll('[data-cy=hand-resource-card]')).toHaveLength(2);
      expect(cardFor('wood')).toHaveAttribute('data-count', '3');
      expect(cardFor('ore')).toHaveAttribute('data-count', '1');
    });

    it('does not draw an empty card for a resource the player has none of', () => {
      renderHand(viewFor(0, withHand(0, { wood: 2 })));

      expect(cardFor('brick')).toBeNull();
      expect(cardFor('sheep')).toBeNull();
    });

    it('shows the hand total, which is what the 7-card discard rule counts', () => {
      renderHand(viewFor(0, withHand(0, { wood: 3, ore: 1, sheep: 2 })));

      expect(document.querySelector('[data-cy=hand-total]')).toHaveAttribute('data-total', '6');
    });

    it('says so rather than showing nothing when the hand is empty', () => {
      renderHand(viewFor(0));

      expect(document.querySelectorAll('[data-cy=hand-resource-card]')).toHaveLength(0);
      expect(document.querySelector('[data-cy=hand-empty]')).not.toBeNull();
    });
  });

  describe('development cards', () => {
    it('offers a playable card, and plays it through PLAY_DEV_CARD', () => {
      const { onPlayDevCard } = renderHand(
        viewFor(0, withHand(0, {}, { playable: ['knight'] }))
      );

      expect(devCardFor('knight')).toHaveAttribute('data-playable', 'true');

      fireEvent.click(screen.getByRole('button', { name: /play knight/i }));
      expect(onPlayDevCard).toHaveBeenCalledWith('knight');
    });

    it('marks a card bought this turn unplayable, and says why', () => {
      renderHand(viewFor(0, withHand(0, {}, { boughtThisTurn: ['monopoly'] })));

      const card = devCardFor('monopoly');
      expect(card).toHaveAttribute('data-playable', 'false');
      expect(card).toHaveTextContent('Bought this turn');
      expect(card?.querySelector('[data-cy=play-dev-card-btn]')).toBeNull();
    });

    it('locks every card once one has been played this turn', () => {
      const view = viewFor(0, state => ({
        ...withHand(0, {}, { playable: ['knight'] })(state),
        hasPlayedDevCardThisTurn: true,
      }));
      renderHand(view);

      expect(devCardFor('knight')).toHaveTextContent('One card per turn');
    });

    it('locks cards when it is not the viewer\'s turn', () => {
      const view = viewFor(1, state => ({
        ...withHand(1, {}, { playable: ['knight'] })(state),
        currentPlayerIndex: 0,
      }));
      renderHand(view);

      expect(devCardFor('knight')).toHaveTextContent('Not your turn');
    });

    it('shows a Victory Point card with no play action, since it is never played', () => {
      renderHand(viewFor(0, withHand(0, {}, { playable: ['victoryPoint'] })));

      const card = devCardFor('victoryPoint');
      expect(card).not.toBeNull();
      expect(card).toHaveAttribute('data-playable', 'false');
      expect(card).toHaveAttribute('data-locked', 'false');
      expect(card?.querySelector('[data-cy=play-dev-card-btn]')).toBeNull();
    });

    it('sends a road building card to the board rather than playing it outright', () => {
      const { onPlayDevCard, onInitiateMapCard } = renderHand(
        viewFor(0, withHand(0, {}, { playable: ['roadBuilding'] }))
      );

      fireEvent.click(screen.getByRole('button', { name: /play road building/i }));

      expect(onInitiateMapCard).toHaveBeenCalledWith('roadBuilding');
      expect(onPlayDevCard).not.toHaveBeenCalled();
    });
  });

  it('renders nothing at all for a spectator', () => {
    const { container } = render(
      <PlayerHand state={viewFor(null)} onPlayDevCard={vi.fn()} onInitiateMapCard={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
