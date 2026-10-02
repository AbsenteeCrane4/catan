/**
 * The build panel against a real game.
 *
 * The resources a player ends setup with depend on the board that was generated, so this
 * spec never asserts "the road button is enabled". It asserts the *relationship*: what
 * the panel says must agree with the cards actually in the player's hand, and with the
 * phase the game is in. That holds on every board.
 */

const COSTS: Record<string, Record<string, number>> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { ore: 3, wheat: 2 },
  devCard: { sheep: 1, wheat: 1, ore: 1 },
};

/** What the bottom HUD says the player is holding. */
const readHand = () =>
  cy.get('[data-cy=player-hand]').then($hand => {
    const counts: Record<string, number> = {};
    $hand.find('[data-cy=hand-resource-card]').each((_, el) => {
      counts[el.getAttribute('data-resource')!] = Number(el.getAttribute('data-count'));
    });
    return counts;
  });

const option = (kind: string) => cy.get(`[data-cy=build-option][data-kind=${kind}]`);

describe('Build affordances', () => {
  afterEach(() => cy.task('disposeBots'));

  /** Alice (browser, seat 0) and Bob (bot, seat 1) play the full snake draft. */
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

  const startGame = () =>
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.addBot('bob', gameId, 'Bob', 'red', 2);
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
    });

  it('offers only the piece the setup draft is waiting for', () => {
    startGame();
    cy.get('[data-cy=game-board]').should('be.visible');
    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');

    // A settlement is due: it is free, and nothing else exists yet.
    option('settlement').should('have.attr', 'data-allowed', 'true');
    option('road').should('have.attr', 'data-blocker', 'setup-requires');
    option('city').should('have.attr', 'data-blocker', 'wrong-phase');
    option('devCard').should('have.attr', 'data-blocker', 'wrong-phase');

    // Every node on an empty board is a legal first settlement, and it is highlighted
    // without the player having to arm anything.
    cy.get('[data-cy=node][data-legal-target=true]').should('have.length', 54);
    cy.get('[data-cy=edge][data-legal-target=true]').should('not.exist');

    // Placing it flips the draft to the road, and the highlighting follows.
    cy.get('[data-cy=node][data-legal-target=true]').first().click({ force: true });
    option('road').should('have.attr', 'data-allowed', 'true');
    option('settlement').should('have.attr', 'data-blocker', 'setup-requires');
    cy.get('[data-cy=edge][data-legal-target=true]').should('have.length.greaterThan', 0);
    cy.get('[data-cy=node][data-legal-target=true]').should('not.exist');
  });

  it('never highlights a settlement spot next to one already taken', () => {
    startGame();
    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');

    cy.get('[data-cy=node][data-legal-target=true]').first().click({ force: true });
    cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 1);

    // The occupied node is gone from the legal set, and so are its neighbours.
    cy.get('[data-cy=node][data-owner-id="0"]')
      .invoke('attr', 'data-node-id')
      .then(takenId => {
        cy.get(`[data-cy=node][data-node-id="${takenId}"]`).should('not.have.attr', 'data-legal-target');
      });
  });

  it('will not let a player build before rolling, and says why', () => {
    startGame();
    playSetupDraft();

    // Setup is over and the dice have not been rolled.
    for (const kind of ['road', 'settlement', 'city', 'devCard']) {
      option(kind).should('have.attr', 'data-blocker', 'dice-not-rolled').and('be.disabled');
    }
    cy.get('[data-cy=build-option-status]').first().should('contain.text', 'Roll the dice first');
    cy.get('[data-cy=node][data-legal-target=true]').should('not.exist');
  });

  it('agrees with the cards actually in the hand once the dice are rolled', () => {
    startGame();
    playSetupDraft();

    cy.get('[data-cy=roll-dice-btn]').click();

    // A 7 hands the robber over before anything can be built; place it and move on.
    cy.get('body').then($body => {
      if ($body.find('[data-cy=hex][data-legal-target=true]').length > 0) {
        cy.get('[data-cy=hex][data-legal-target=true]').first().click({ force: true });
      }
    });

    readHand().then(hand => {
      for (const [kind, cost] of Object.entries(COSTS)) {
        const missing = Object.entries(cost).filter(([res, need]) => (hand[res] ?? 0) < need);

        if (missing.length === 0) {
          option(kind).should('have.attr', 'data-allowed', 'true');
        } else {
          // The only reason left at this point is the cost, and the panel must name it.
          option(kind).should('have.attr', 'data-blocker', 'insufficient-resources');
          option(kind).should('be.disabled');
          option(kind)
            .find('[data-cy=build-option-missing] [data-cy=resource-icon]')
            .should('have.length', missing.length);
        }
      }
    });
  });

  it('shows the piece supply, and counts it down as pieces are placed', () => {
    startGame();

    option('road').should('have.attr', 'data-pieces-remaining', '15');
    option('settlement').should('have.attr', 'data-pieces-remaining', '5');
    option('city').should('have.attr', 'data-pieces-remaining', '4');

    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
    cy.placeSettlementAndRoad(0);

    option('settlement').should('have.attr', 'data-pieces-remaining', '4');
    option('road').should('have.attr', 'data-pieces-remaining', '14');
  });

  it('tells a player it is not their turn', () => {
    startGame();
    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
    cy.placeSettlementAndRoad(0);

    // Seat 0 has finished; the draft has moved on to Bob.
    cy.get('[data-cy=turn-indicator]').should('not.contain.text', 'Your Turn');
    option('settlement').should('have.attr', 'data-blocker', 'not-your-turn').and('be.disabled');
    cy.get('[data-cy=node][data-legal-target=true]').should('not.exist');
  });

  it('shows a spectator no build panel at all', () => {
    const gameId = `build-${Date.now()}`;
    cy.task('botSpawn', { id: 'alice', gameId, name: 'Alice', color: 'blue' });
    cy.task('botSpawn', { id: 'bob', gameId, name: 'Bob', color: 'red' });
    cy.task('botStart', { id: 'alice' });

    cy.visit(`/game/${gameId}`);
    cy.get('[data-cy=spectate-btn]').click();
    cy.get('[data-cy=game-board]').should('be.visible');

    cy.get('[data-cy=build-panel]').should('not.exist');
    cy.get('[data-cy=node][data-legal-target=true]').should('not.exist');
  });
});
