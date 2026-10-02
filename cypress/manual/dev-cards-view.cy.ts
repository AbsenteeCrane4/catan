// Manual: shows every development card type in the hand bar and leaves it on screen.
// Needs the dev server up. The preview page 404s in a production build.
//   unset ELECTRON_RUN_AS_NODE
//   npx cypress run --headed --no-exit --browser electron \
//     --config specPattern=cypress/manual/dev-cards-view.cy.ts --spec cypress/manual/dev-cards-view.cy.ts
const TYPES = ['knight', 'victoryPoint', 'monopoly', 'roadBuilding', 'yearOfPlenty'];

describe('Development cards — leave on screen', () => {
  it('draws all five card types', () => {
    cy.viewport(1600, 900);
    cy.visit('/dev/dev-cards');
    cy.get('[data-cy=dev-card-gallery]').should('be.visible');

    TYPES.forEach(type =>
      cy.get(`[data-cy=dev-card-gallery] [data-cy=hand-dev-card][data-card-type=${type}]`).should('exist')
    );
    cy.get('[data-cy=hand-dev-card][data-card-type=knight][data-playable=true]')
      .first()
      .should('have.attr', 'data-count', '3');
    cy.wait(1000);
  });
});
