/**
 * Drives extra players entirely from the Node task runner (see
 * cypress/support/simulatedPlayer.ts) while the browser under test stays a single,
 * real human seat. This is the point: you watch the visible browser's lobby list,
 * colour swatches and Start button react live to a socket peer it never opened a
 * tab for — the same thing a second real player would trigger.
 */
describe('Lobby — multiple players', () => {
  afterEach(() => cy.task('disposeBots'));

  it('shows a second player joining live and unlocks Start once there are two seats', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.get('[data-cy=seat-item]').should('have.length', 1);
      cy.get('[data-cy=start-game-btn]').should('be.disabled');
      cy.contains('Need at least 2 players to start.').should('be.visible');

      // No reload, no re-query trigger — this is the live lobby:state broadcast
      // landing in the already-open browser.
      cy.addBot('bob', gameId, 'Bob', 'red', 2);

      cy.get('[data-cy=start-game-btn]').should('be.enabled');
      // A colour Bob took is now disabled in Alice's own swatch grid.
      cy.get('[data-cy=color-swatch-red]').should('be.disabled');
    });
  });

  it('starts the game once two seats are filled and shows the board to the host', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.addBot('bob', gameId, 'Bob', 'red', 2);

      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();

      cy.get('[data-cy=game-board]').should('be.visible');
      cy.get('[data-cy=turn-indicator]').should('be.visible');
      cy.contains('place your first settlement', { matchCase: false }).should('exist');

      // Two players stay on the 19-hex base board.
      cy.get('[data-cy=hex]').should('have.length', 19);
      cy.get('[data-cy=node]').should('have.length', 54);
    });
  });

  it('removes a seat live when a player disconnects', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.addBot('bob', gameId, 'Bob', 'red', 2);
      cy.get('[data-cy=start-game-btn]').should('be.enabled');

      cy.task('botDisconnect', { id: 'bob' });

      cy.get('[data-cy=seat-item]').should('have.length', 1);
      cy.get('[data-cy=start-game-btn]').should('be.disabled');
      // Bob's colour is selectable again now that his seat is gone.
      cy.get('[data-cy=color-swatch-red]').should('be.enabled');
    });
  });
});
