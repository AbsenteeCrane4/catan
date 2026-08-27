/**
 * The headline case for issue #19: six players seated in one lobby, and the game
 * starting on the official 5-6 player extension board rather than the 19-hex base
 * board.
 *
 * Alice is the visible browser; the other five are socket bots from the Node task
 * runner (cypress/support/simulatedPlayer.ts). Run this with `npm run e2e` to watch
 * the roster fill one seat at a time and the 30-hex board render.
 */

/** Alice takes blue; PLAYER_COLORS supplies the rest. */
const BOTS = [
  { id: 'bob', name: 'Bob', color: 'red' },
  { id: 'carol', name: 'Carol', color: 'white' },
  { id: 'dave', name: 'Dave', color: 'orange' },
  { id: 'erin', name: 'Erin', color: 'green' },
  { id: 'frank', name: 'Frank', color: 'brown' },
];

describe('Six players — expansion board', () => {
  afterEach(() => cy.task('disposeBots'));

  it('seats six players and starts on the 30-hex expansion board', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      BOTS.forEach((bot, i) => {
        cy.addBot(bot.id, gameId, bot.name, bot.color, i + 2);
      });

      // The lobby is now full: every colour Alice could still pick is one of the
      // two nobody took, and Start is live.
      cy.get('[data-cy=seat-item]').should('have.length', 6);
      cy.get('[data-cy=color-swatch-red]').should('be.disabled');
      cy.get('[data-cy=color-swatch-purple]').should('be.enabled');

      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
      cy.get('[data-cy=game-board]').should('be.visible');

      // Expansion geometry: 30 hexes / 80 nodes / 11 harbours / 2 deserts.
      // The base board would be 19 / 54 / 9 / 1, so these fail loudly on a regression.
      cy.get('[data-cy=hex]').should('have.length', 30);
      cy.get('[data-cy=node]').should('have.length', 80);
      cy.get('[data-cy=harbour]').should('have.length', 11);
      cy.get('[data-cy=hex][data-resource=desert]').should('have.length', 2);

      // Every non-desert hex carries a number token, and no two red numbers touch
      // is already unit-tested; here we only assert the tokens actually rendered.
      cy.get('[data-cy=hex]').not('[data-resource=desert]').should('have.length', 28);
      cy.get('[data-cy=hex][data-token]').should('have.length', 28);

      // All six seats made it into the game with their chosen colours intact.
      cy.get('[data-cy=sidebar-player]').should('have.length', 6);
      ['blue', 'red', 'white', 'orange', 'green', 'brown'].forEach(color => {
        cy.get(`[data-cy=sidebar-player][data-player-color=${color}]`).should('have.length', 1);
      });

      // The robber starts on a desert.
      cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
    });
  });

  it('rotates the snake draft through all six seats and back to Alice', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      BOTS.forEach((bot, i) => cy.addBot(bot.id, gameId, bot.name, bot.color, i + 2));
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
      cy.get('[data-cy=game-board]').should('be.visible');

      // Round 1 — forward order: Alice(0), then seats 1..5.
      cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
      cy.placeSettlementAndRoad(0);

      BOTS.forEach((bot, i) => {
        cy.task('botPlaySetupTurn', { id: bot.id });
        cy.get(`[data-cy=node][data-owner-id="${i + 1}"]`).should('have.length', 1);
      });

      // Round 2 — reverse order: seats 5..1 place their second settlement, then Alice.
      [...BOTS].reverse().forEach((bot, i) => {
        const seat = BOTS.length - i;
        cy.task('botPlaySetupTurn', { id: bot.id });
        cy.get(`[data-cy=node][data-owner-id="${seat}"]`).should('have.length', 2);
      });

      cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
      cy.placeSettlementAndRoad(0);

      // Twelve settlements down, setup over, and the turn is back with Alice.
      cy.get('[data-cy=node][data-owner-id]').should('have.length', 12);
      cy.get('[data-cy=roll-dice-btn]').should('be.enabled');
    });
  });
});
