/**
 * Plays a full 2-player snake-draft setup phase: the visible browser is Alice
 * (host), and Bob is a bot driven straight from the Node task runner (see
 * cypress/support/simulatedPlayer.ts). Alice's moves go through the real UI;
 * Bob's land over the socket exactly the way a second tab's would, so watching
 * this run in `cypress open` shows a genuine two-client setup phase — Alice
 * places, the board updates live as Bob places, and it ends in phase:'main'
 * with Roll Dice enabled for Alice.
 */
describe('Setup phase — snake draft across two real clients', () => {
  afterEach(() => cy.task('disposeBots'));

  it('reaches the main phase after both players place two settlements and two roads', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.addBot('bob', gameId, 'Bob', 'red', 2);
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
      cy.get('[data-cy=game-board]').should('be.visible');

      // Setup 1: Alice places first, then Bob.
      cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
      cy.placeSettlementAndRoad(0);

      cy.task('botPlaySetupTurn', { id: 'bob' });
      cy.get('[data-cy=node][data-owner-id="1"]').should('have.length', 1);

      // Setup 2: reverse snake order — Bob goes again immediately, then Alice.
      cy.task('botPlaySetupTurn', { id: 'bob' });
      cy.get('[data-cy=node][data-owner-id="1"]').should('have.length', 2);

      cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
      cy.placeSettlementAndRoad(0);
      cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 2);

      // Setup is complete; the main phase starts with Alice, who goes first.
      cy.get('[data-cy=roll-dice-btn]').should('be.enabled');
      cy.get('[data-cy=end-turn-btn]').should('not.exist');
    });
  });
});
