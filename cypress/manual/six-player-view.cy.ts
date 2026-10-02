// Temporary: plays six players through setup and leaves the main game on screen.
const BOTS = [
  { id: 'bob', name: 'Bob', color: 'red' },
  { id: 'carol', name: 'Carol', color: 'white' },
  { id: 'dave', name: 'Dave', color: 'orange' },
  { id: 'erin', name: 'Erin', color: 'green' },
  { id: 'frank', name: 'Frank', color: 'brown' },
];

describe('Six players — leave on screen', () => {
  it('plays setup and stops at the main game', () => {
    cy.viewport(1600, 900);
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      BOTS.forEach((bot, i) => cy.addBot(bot.id, gameId, bot.name, bot.color, i + 2));
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
      cy.get('[data-cy=game-board]').should('be.visible');
      cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
      cy.placeSettlementAndRoad(0);
      BOTS.forEach(bot => cy.task('botPlaySetupTurn', { id: bot.id }));
      [...BOTS].reverse().forEach(bot => cy.task('botPlaySetupTurn', { id: bot.id }));
      cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
      cy.placeSettlementAndRoad(0);
      cy.get('[data-cy=roll-dice-btn]').should('be.enabled');
      cy.wait(1000);
    });
  });
});
