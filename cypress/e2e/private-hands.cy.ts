/**
 * Hands must be private on the wire, not just on the screen.
 *
 * Before per-seat redaction the server broadcast one `SYNC_STATE` to the whole socket
 * room, so every client held every hand and the UI merely declined to draw them. A DOM
 * assertion alone cannot tell that apart from a real fix, so each test here checks both
 * sides: what the browser renders, and what a second seated client actually received
 * over its own socket (`botState`).
 *
 * The full snake draft is played first on purpose — setup phase 2 pays out starting
 * resources, so the hands under test are non-empty and the assertions are not passing
 * for the trivial reason.
 */
describe('Private hands', () => {
  afterEach(() => cy.task('disposeBots'));

  /** Alice (browser, seat 0) and Bob (bot, seat 1) both finish setup holding cards. */
  const playSetupDraft = () => {
    cy.get('[data-cy=game-board]').should('be.visible');

    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
    cy.placeSettlementAndRoad(0);

    cy.task('botPlaySetupTurn', { id: 'bob' });
    cy.get('[data-cy=node][data-owner-id="1"]').should('have.length', 1);

    cy.task('botPlaySetupTurn', { id: 'bob' });
    cy.get('[data-cy=node][data-owner-id="1"]').should('have.length', 2);

    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
    cy.placeSettlementAndRoad(0);
    cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 2);

    cy.get('[data-cy=roll-dice-btn]').should('be.enabled');
  };

  it('renders own cards as card faces and an opponent as a face-down count', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.addBot('bob', gameId, 'Bob', 'red', 2);
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();

      playSetupDraft();

      // Alice's own hand, in the bottom HUD: a card face per resource type she actually
      // holds, and a total that agrees with the counts on those cards.
      cy.get('[data-cy=player-hand]').should('be.visible');
      cy.get('[data-cy=hand-resource-card]')
        .should('have.length.greaterThan', 0)
        .then($cards => {
          const counts = Cypress._.map($cards.toArray(), el => Number(el.getAttribute('data-count')));
          // A card is only drawn for a resource actually held, never as an empty slot.
          counts.forEach(count => expect(count, 'cards on a face').to.be.greaterThan(0));

          const total = counts.reduce((sum, n) => sum + n, 0);
          cy.get('[data-cy=hand-total]').should('have.attr', 'data-total', String(total));
        });

      // Bob's seat: a count, and not one word about what the cards are.
      cy.get('[data-cy=sidebar-player][data-player-id="1"] [data-cy=own-resource]')
        .should('not.exist');
      cy.get('[data-cy=sidebar-player][data-player-id="1"] [data-cy=hand-resource-card]')
        .should('not.exist');
      cy.get('[data-cy=sidebar-player][data-player-id="1"]')
        .find('[data-resource]')
        .should('not.exist');
      cy.get('[data-cy=sidebar-player][data-player-id="1"] [data-cy=hidden-resource-count]')
        .invoke('text')
        .then(text => expect(Number(text), "opponent's card count").to.be.greaterThan(0));
    });
  });

  it('never puts an opponent\'s resource types in the socket payload', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.addBot('bob', gameId, 'Bob', 'red', 2);
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();

      playSetupDraft();

      // Bob's own socket, not the browser's: what seat 1 was actually sent.
      cy.task('botState', { id: 'bob' }).then(payload => {
        const state = payload as {
          viewerSeatIndex: number | null;
          devCardDeckCount: number;
          players: {
            resources: Record<string, number> | null;
            devCards: unknown | null;
            resourceCount: number;
          }[];
        };

        expect(state.viewerSeatIndex, 'seat the view was built for').to.equal(1);

        // Alice is an opponent from here: counts only.
        expect(state.players[0].resources, "Alice's resources").to.equal(null);
        expect(state.players[0].devCards, "Alice's dev cards").to.equal(null);
        expect(state.players[0].resourceCount, "Alice's card count").to.be.greaterThan(0);

        // Bob's own hand is intact, so the redaction is not simply blanking everything.
        expect(state.players[1].resources, "Bob's own resources").to.not.equal(null);
        expect(state.players[1].devCards, "Bob's own dev cards").to.not.equal(null);

        // The ordered deck would reveal every future draw; only its size travels.
        expect(state, 'dev card deck').to.not.have.property('devCardDeck');
        expect(state.devCardDeckCount).to.be.greaterThan(0);
      });
    });
  });

  it('restores the correct private hand after a refresh', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.addBot('bob', gameId, 'Bob', 'red', 2);
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();

      playSetupDraft();

      // A refresh comes back through the `room:enter` ack rather than a broadcast, which
      // is a second place the state can escape unredacted. The seat is recovered from the
      // localStorage clientId, so the hand that returns must still be Alice's.
      cy.reload();

      cy.get('[data-cy=hand-resource-card]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=sidebar-player][data-player-id="1"] [data-cy=hidden-hand]')
        .should('exist');
      cy.get('[data-cy=sidebar-player][data-player-id="1"] [data-cy=own-resource]')
        .should('not.exist');
    });
  });

  it('shows a spectator no hands at all', () => {
    // Kept short: isValidGameId caps ids at 24 characters.
    const gameId = `priv-${Date.now()}`;
    cy.task('botSpawn', { id: 'alice', gameId, name: 'Alice', color: 'blue' });
    cy.task('botSpawn', { id: 'bob', gameId, name: 'Bob', color: 'red' });
    cy.task('botStart', { id: 'alice' });

    cy.visit(`/game/${gameId}`);
    cy.get('[data-cy=spectate-btn]').click();
    cy.get('[data-cy=game-board]').should('be.visible');

    // Both bots play out setup so both seats are holding cards.
    cy.task('botPlaySetupTurn', { id: 'alice' });
    cy.task('botPlaySetupTurn', { id: 'bob' });
    cy.task('botPlaySetupTurn', { id: 'bob' });
    cy.task('botPlaySetupTurn', { id: 'alice' });
    cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 2);

    // No seat is "you", so no hand is ever revealed — and nothing crashes rendering it.
    cy.get('[data-cy=sidebar-player]').should('have.length', 2);
    cy.get('[data-cy=own-resource]').should('not.exist');
    cy.get('[data-cy=player-hand]').should('not.exist');
    cy.get('[data-cy=hidden-hand]').should('have.length', 2);
    cy.get('[data-cy=spectator-panel]').should('be.visible');
  });
});
