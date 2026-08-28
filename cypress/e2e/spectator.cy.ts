/**
 * Covers the "game already in progress" screen for a client with no seat: it must
 * offer both a way back to the home page (existing behaviour) and a way to watch the
 * live game read-only (new). Both seats are bots so the one real browser is free to
 * play the late-arriving spectator, the scenario this feature actually targets.
 */
describe('Spectator mode', () => {
  afterEach(() => cy.task('disposeBots'));

  it('offers Back to home instead of spectating', () => {
    const gameId = `spec-home-${Date.now()}`;
    cy.task('botSpawn', { id: 'alice', gameId, name: 'Alice', color: 'blue' });
    cy.task('botSpawn', { id: 'bob', gameId, name: 'Bob', color: 'red' });
    cy.task('botStart', { id: 'alice' });

    cy.visit(`/game/${gameId}`);
    cy.get('[data-cy=already-started-message]').should('be.visible');
    cy.contains('Game already in progress').should('be.visible');

    cy.get('[data-cy=back-home-btn]').click();
    cy.url().should('eq', `${Cypress.config().baseUrl}/`);
  });

  it('lets a seatless client spectate a live game read-only', () => {
    const gameId = `spec-watch-${Date.now()}`;
    cy.task('botSpawn', { id: 'alice', gameId, name: 'Alice', color: 'blue' });
    cy.task('botSpawn', { id: 'bob', gameId, name: 'Bob', color: 'red' });
    cy.task('botStart', { id: 'alice' });

    cy.visit(`/game/${gameId}`);
    cy.get('[data-cy=already-started-message]').should('be.visible');
    cy.get('[data-cy=spectate-btn]').click();

    // Read-only board renders exactly as it would for a seated player.
    cy.get('[data-cy=game-board]').should('be.visible');
    cy.get('[data-cy=hex]').should('have.length', 19);
    cy.get('[data-cy=node]').should('have.length', 54);
    cy.get('[data-cy=spectator-panel]').should('be.visible');
    cy.get('[data-cy=turn-indicator]').should('be.visible').and('not.contain.text', 'Your Turn');

    // Never their turn, so the seated-only controls stay inert.
    cy.get('[data-cy=roll-dice-btn]').should('be.disabled');

    // Live updates: bots play the setup snake draft (0,1,1,0) and the spectator's DOM
    // reflects each placement without any reload or re-navigation.
    cy.task('botPlaySetupTurn', { id: 'alice' });
    cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 1);

    cy.task('botPlaySetupTurn', { id: 'bob' });
    cy.get('[data-cy=node][data-owner-id="1"]').should('have.length', 1);

    cy.task('botPlaySetupTurn', { id: 'bob' });
    cy.get('[data-cy=node][data-owner-id="1"]').should('have.length', 2);

    cy.task('botPlaySetupTurn', { id: 'alice' });
    cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 2);

    // Setup is over; still spectating, still unable to act.
    cy.get('[data-cy=roll-dice-btn]').should('be.disabled');

    cy.get('[data-cy=stop-spectating-btn]').click();
    cy.url().should('eq', `${Cypress.config().baseUrl}/`);
  });
});
