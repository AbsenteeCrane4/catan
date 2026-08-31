/**
 * Full robber lifecycle, made deterministic via the server's test-only dice/steal
 * queue (src/lib/game/helpers/testDice.ts) rather than relying on lucky rolls or
 * lucky board layouts: play out the setup phase, force a 7, place the robber on a
 * hex the victim has settled, assert the exact resource moves from victim to thief,
 * then force that exact hex's number again and assert production stays blocked.
 * Both seats are bots (Alice always acts first in the main phase); the one real
 * browser spectates and asserts the live DOM reacts correctly over the wire.
 */

interface NodeLike {
  id: string;
  hexIds: string[];
}

interface HexLike {
  id: string;
  resource: string;
  numberToken: number | null;
}

interface StateLike {
  robberHexId: string;
  pendingRobberAction: { status: string; validVictims?: number[] } | null;
  gameLog: string[];
  diceRoll: number | null;
  nodes: NodeLike[];
  hexes: HexLike[];
  settlements: Record<string, { playerId: number }>;
  players: { resources: Record<string, number> }[];
}

interface RobberTarget {
  hexId: string;
  resource: string;
  token: number;
  /**
   * How many OTHER hexes Bob also touches share this exact (token, resource) pair.
   * A settlement can straddle several hexes with duplicate tokens (2 and 12 are the
   * only truly unique tokens on the board), so re-rolling `token` after the robber
   * moves can still legitimately pay out from one of these — the "blocked" assertion
   * expects exactly this many extra units, not zero.
   */
  otherProducers: number;
}

/** Matches the fixed key order every resources object is created with (createInitialState.ts). */
const RESOURCE_ORDER = ['wood', 'brick', 'sheep', 'wheat', 'ore'] as const;

/**
 * executeSteal() flattens the victim's hand via Object.entries(resources) — in
 * RESOURCE_ORDER, since that's the object's own key order — into one array and picks
 * a card by index. This returns the index of the first card of `resource`, so queuing
 * it via botQueueStealIndex forces that exact resource to be the one stolen.
 */
function stealIndexFor(resources: Record<string, number>, resource: string): number {
  let index = 0;
  for (const res of RESOURCE_ORDER) {
    if (res === resource) return index;
    index += resources[res];
  }
  throw new Error(`"${resource}" is not a known resource type`);
}

function assertResourceCell($cells: JQuery<HTMLElement>, resource: string, expected: number) {
  const cell = [...$cells].find(el => el.getAttribute('data-resource') === resource);
  if (!cell) throw new Error(`resource cell for "${resource}" not found`);
  expect(cell.textContent).to.contain(String(expected));
}

function playSetup() {
  cy.task('botPlaySetupTurn', { id: 'alice' });
  cy.task('botPlaySetupTurn', { id: 'bob' });
  cy.task('botPlaySetupTurn', { id: 'bob' });
  cy.task('botPlaySetupTurn', { id: 'alice' });
  cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 2);
  cy.get('[data-cy=node][data-owner-id="1"]').should('have.length', 2);
}

describe('Robber lifecycle', () => {
  afterEach(() => cy.task('disposeBots'));

  it('moves the robber, steals a resource from the victim, and blocks that hex from producing again', () => {
    const gameId = `rsteal-${Date.now().toString(36)}`;

    cy.task('botSpawn', { id: 'alice', gameId, name: 'Alice', color: 'blue' });
    cy.task('botSpawn', { id: 'bob', gameId, name: 'Bob', color: 'red' });
    cy.task('botResetDiceQueue', { id: 'alice' });
    cy.task('botStart', { id: 'alice' });

    cy.visit(`/game/${gameId}`);
    cy.get('[data-cy=already-started-message]').should('be.visible');
    cy.get('[data-cy=spectate-btn]').click();
    cy.get('[data-cy=game-board]').should('be.visible');

    playSetup();

    let target: RobberTarget;

    // Pick any non-desert hex Bob touches — no need to rely on the 2nd settlement's
    // starting-resource grant (it can legitimately be zero if that settlement only
    // touches the desert), since the next forced roll grants it explicitly instead.
    cy.task('botGetState', { id: 'alice' }).then((state: unknown) => {
      const s = state as StateLike;
      const nodesById = new Map(s.nodes.map(n => [n.id, n]));
      const hexesById = new Map(s.hexes.map(h => [h.id, h]));

      // Deduped by hex id: two settlements can share a corner hex, which must count
      // once, not as two competing hexes.
      const touchingById = new Map<string, HexLike>();
      Object.entries(s.settlements)
        .filter(([, st]) => st.playerId === 1)
        .forEach(([nodeId]) => {
          nodesById.get(nodeId)?.hexIds.forEach(hexId => {
            const hex = hexesById.get(hexId);
            if (hex && hex.resource !== 'desert') touchingById.set(hex.id, hex);
          });
        });
      const touching = [...touchingById.values()];
      const victimHex = touching[0];
      if (!victimHex) throw new Error('Bob has no non-desert hex to be robbed on');

      // Rather than requiring no other hex share this (token, resource) pair — which
      // some boards just won't have — count them, so the "blocked" assertion later
      // expects exactly that many extra units instead of assuming zero.
      const otherProducers = touching.filter(
        h => h.id !== victimHex.id && h.numberToken === victimHex.numberToken && h.resource === victimHex.resource
      ).length;

      target = {
        hexId: victimHex.id,
        resource: victimHex.resource,
        token: victimHex.numberToken!,
        otherProducers,
      };
    });

    // Force a production roll of the target hex's own number FIRST, guaranteeing Bob
    // holds at least one of its resource before the robber ever gets there — no need
    // to depend on (and hope for) the setup-phase starting-resource grant.
    cy.then(() => cy.task('botQueueDice', { id: 'alice', total: target.token }));
    cy.then(() => cy.task('botAction', { id: 'alice', action: { type: 'ROLL_DICE' } }));

    cy.task('botGetState', { id: 'alice' }).then((state: unknown) => {
      const heldResources = (state as StateLike).players[1].resources;
      // Force the steal to take exactly this resource, not a random card from Bob's hand.
      const stealIndex = stealIndexFor(heldResources, target.resource);
      cy.task('botQueueStealIndex', { id: 'alice', index: stealIndex });
    });

    // Force the roll to total 7 — Alice (seat 0) always acts first in the main phase.
    cy.then(() => cy.task('botQueueDice', { id: 'alice', total: 7 }));
    cy.then(() => cy.task('botAction', { id: 'alice', action: { type: 'ROLL_DICE' } })).then((state: unknown) => {
      const s = state as StateLike;
      expect(s.diceRoll).to.equal(7);
      expect(s.pendingRobberAction).to.deep.include({ status: 'moving' });
    });

    let victimResourceBefore = 0;
    let thiefResourceBefore = 0;

    cy.task('botGetState', { id: 'alice' }).then((state: unknown) => {
      const s = state as StateLike;
      victimResourceBefore = s.players[1].resources[target.resource];
      thiefResourceBefore = s.players[0].resources[target.resource];
    });

    // Alice places the robber on Bob's hex — the only victim in a 2-player game, so
    // this auto-steals immediately, no StealModal selection step.
    cy.then(() =>
      cy.task('botAction', {
        id: 'alice',
        action: { type: 'MOVE_ROBBER', payload: { hexId: target.hexId, playerId: 0 } },
      })
    ).then((state: unknown) => {
      const s = state as StateLike;
      expect(s.robberHexId).to.equal(target.hexId);
      expect(s.pendingRobberAction).to.equal(null);
      expect(s.gameLog[0]).to.match(/stole a resource/i);
      expect(s.players[1].resources[target.resource]).to.equal(victimResourceBefore - 1);
      expect(s.players[0].resources[target.resource]).to.equal(thiefResourceBefore + 1);
    });

    // The spectating browser sees the same thing live over the socket.
    cy.then(() => target).then(t => {
      cy.get('[data-cy=robber]').should('have.attr', 'data-hex-id').and('match', new RegExp(`^${t.hexId}$`));
    });
    cy.get('[data-cy=sidebar-player][data-player-id="0"]')
      .find('[data-cy=resource-count][data-resource]')
      .then($cells => assertResourceCell($cells, target.resource, thiefResourceBefore + 1));
    cy.get('[data-cy=sidebar-player][data-player-id="1"]')
      .find('[data-cy=resource-count][data-resource]')
      .then($cells => assertResourceCell($cells, target.resource, victimResourceBefore - 1));

    // Force that exact hex's number again — production must stay blocked while the
    // robber sits there, even though the token still matches.
    let victimResourceAfterSteal = 0;
    cy.task('botGetState', { id: 'alice' }).then((state: unknown) => {
      victimResourceAfterSteal = (state as StateLike).players[1].resources[target.resource];
    });

    cy.then(() => cy.task('botQueueDice', { id: 'alice', total: target.token }));
    cy.then(() => cy.task('botAction', { id: 'alice', action: { type: 'ROLL_DICE' } })).then((state: unknown) => {
      const s = state as StateLike;
      expect(s.diceRoll).to.equal(target.token); // sanity: the forced roll landed
      expect(s.robberHexId).to.equal(target.hexId);
      // The robbed hex contributes nothing; any OTHER hex Bob touches with the same
      // (token, resource) still pays out normally, which is not a blocking failure.
      const expected = victimResourceAfterSteal + target.otherProducers;
      expect(s.players[1].resources[target.resource]).to.equal(expected);
    });

    cy.get('[data-cy=sidebar-player][data-player-id="1"]')
      .find('[data-cy=resource-count][data-resource]')
      .then($cells => assertResourceCell($cells, target.resource, victimResourceAfterSteal + target.otherProducers));
  });

  it('moves the robber to an unoccupied hex and steals from nobody', () => {
    const gameId = `rempty-${Date.now().toString(36)}`;

    cy.task('botSpawn', { id: 'alice', gameId, name: 'Alice', color: 'blue' });
    cy.task('botSpawn', { id: 'bob', gameId, name: 'Bob', color: 'red' });
    cy.task('botResetDiceQueue', { id: 'alice' });
    cy.task('botStart', { id: 'alice' });

    cy.visit(`/game/${gameId}`);
    cy.get('[data-cy=spectate-btn]').click();
    cy.get('[data-cy=game-board]').should('be.visible');

    playSetup();

    let emptyHexId: string;

    cy.task('botGetState', { id: 'alice' }).then((state: unknown) => {
      const s = state as StateLike;
      const touched = new Set<string>();
      Object.keys(s.settlements).forEach(nodeId => {
        s.nodes.find(n => n.id === nodeId)?.hexIds.forEach(id => touched.add(id));
      });
      const empty = s.hexes.find(h => h.resource !== 'desert' && !touched.has(h.id) && h.id !== s.robberHexId);
      if (!empty) throw new Error('no unclaimed hex found on the base board');
      emptyHexId = empty.id;
    });

    cy.then(() => cy.task('botQueueDice', { id: 'alice', total: 7 }));
    cy.then(() => cy.task('botAction', { id: 'alice', action: { type: 'ROLL_DICE' } }));

    cy.then(() =>
      cy.task('botAction', {
        id: 'alice',
        action: { type: 'MOVE_ROBBER', payload: { hexId: emptyHexId, playerId: 0 } },
      })
    ).then((state: unknown) => {
      const s = state as StateLike;
      expect(s.robberHexId).to.equal(emptyHexId);
      expect(s.pendingRobberAction).to.equal(null);
      expect(s.gameLog[0]).to.match(/nobody was there to rob/i);
    });

    cy.get('[data-cy=robber]').should('have.attr', 'data-hex-id').and('match', /.+/).then(hexId => {
      expect(hexId).to.eq(emptyHexId);
    });
  });
});
