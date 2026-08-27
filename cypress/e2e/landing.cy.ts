describe('Landing page', () => {
  beforeEach(() => cy.visit('/'));

  it('creates a new game and lands in an empty lobby as host', () => {
    cy.get('[data-cy=create-game-btn]').click();

    cy.url().should('match', /\/game\/[A-Z0-9]{6}$/);
    cy.contains('h1', 'Game Lobby').should('be.visible');
    cy.get('[data-cy=game-id-display]').invoke('text').should('match', /^[A-Z0-9]{6}$/);
    cy.contains('Nobody has joined yet.').should('be.visible');
  });

  it('only enables Join once a plausible game id is typed', () => {
    cy.get('[data-cy=join-game-btn]').should('be.disabled');

    cy.get('[data-cy=join-game-input]').type('ab');
    cy.get('[data-cy=join-game-btn]').should('be.disabled');

    cy.get('[data-cy=join-game-input]').clear().type('abcdef');
    cy.get('[data-cy=join-game-btn]').should('be.enabled');

    cy.get('[data-cy=join-game-btn]').click();
    // The route normalises to uppercase.
    cy.url().should('include', '/game/ABCDEF');
  });
});
