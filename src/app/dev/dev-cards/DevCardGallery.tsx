'use client';

import type { GameState } from '@/types/catan';
import { createInitialState } from '@/lib/game/state/createInitialState';
import { redactStateFor } from '@/lib/server/redact';
import { PlayerHand } from '@/components/hand/PlayerHand';

/** A hand holding every card type: stacks, a Victory Point total, and a fresh purchase. */
const hand = (state: GameState): GameState => ({
  ...state,
  phase: 'main',
  currentPlayerIndex: 0,
  diceRoll: 6,
  players: state.players.map(p =>
    p.id === 0
      ? {
          ...p,
          resources: { wood: 2, brick: 1, sheep: 3, wheat: 2, ore: 1 },
          devCards: {
            playable: ['knight', 'knight', 'knight', 'monopoly', 'roadBuilding', 'yearOfPlenty', 'victoryPoint'],
            boughtThisTurn: ['knight', 'victoryPoint', 'monopoly'],
            played: [],
          },
        }
      : p
  ),
});

const Bar = ({ label, view }: { label: string; view: ReturnType<typeof redactStateFor> }) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-[13px] font-bold uppercase tracking-[0.13em] text-hs-mute">{label}</h2>
    <div className="hs-bar flex items-center border border-[rgba(110,160,220,0.16)] px-[22px] py-3">
      <PlayerHand state={view} onPlayDevCard={() => {}} onInitiateMapCard={() => {}} />
    </div>
  </section>
);

export function DevCardGallery() {
  const mine = hand(createInitialState());
  const yours = redactStateFor(mine, 0);
  // Same cards, seen on someone else's turn: everything locks.
  const waiting = redactStateFor({ ...mine, currentPlayerIndex: 1 }, 0);
  const used = redactStateFor({ ...mine, hasPlayedDevCardThisTurn: true }, 0);

  return (
    <main data-cy="dev-card-gallery" className="flex min-h-screen flex-col gap-8 bg-hs-abyss p-8 font-hud text-hs-text">
      <Bar label="Your turn — playable, plus bought this turn" view={yours} />
      <Bar label="Someone else's turn" view={waiting} />
      <Bar label="After playing a card this turn" view={used} />
    </main>
  );
}
