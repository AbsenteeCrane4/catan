/**
 * The piece layer on the flat board.
 *
 * Pieces are SVG drawn over the board and never take the pointer, so what matters is:
 *
 * - every board interaction still reaches the spot underneath a piece
 * - the pieces are placed from the game's own coordinates
 * - a piece appears for every settlement the game records
 */

const startGame = () =>
  cy.createGameAsHost('Alice', 'blue').then(gameId => {
    cy.addBot('bob', gameId, 'Bob', 'red', 2);
    cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
    cy.get('[data-cy=game-board]').should('be.visible');
  });

/** Board coordinates of an SVG group placed with `translate(x, y)`. */
const translation = (el: Element): [number, number] => {
  const match = (el.getAttribute('transform') ?? '').match(/translate\((-?[\d.]+),\s*(-?[\d.]+)\)/);
  expect(match, 'element is placed with a translate').to.not.equal(null);
  return [Number(match![1]), Number(match![2])];
};

describe('Board pieces', () => {
  afterEach(() => cy.task('disposeBots'));
  beforeEach(startGame);

  it('never lets a piece take a click away from the board', () => {
    cy.get('[data-cy=board-piece]').should('have.length', 0);
    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');

    // A real (unforced) click at the node's on-screen position: if anything were drawn
    // over it and took the pointer, this would hit that instead.
    cy.get('[data-cy=node][data-legal-target=true]').first().click();
    cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 1);
    cy.get('[data-cy=board-piece]').should('have.css', 'pointer-events', 'none');

    // The road from it goes down the same way, with the settlement standing beside it.
    // A sloped edge: Cypress treats a vertical SVG line's zero-width box as invisible.
    const x = (nodeId: string) => nodeId.split('-').filter(Boolean)[1];
    cy.get('[data-cy=edge][data-legal-target=true]')
      .filter((_, el) => x(el.getAttribute('data-node-1')!) !== x(el.getAttribute('data-node-2')!))
      .first()
      .click();
    cy.get('[data-cy=edge][data-owner-id="0"]').should('have.length', 1);
  });

  it('stands the robber on the hex the game says it is on', () => {
    cy.get('[data-cy=hex][data-resource=desert]').then($desert => {
      const [x, y] = translation($desert[0]);
      cy.get('[data-cy=robber]').should('have.attr', 'data-x', String(x)).and('have.attr', 'data-y', String(y));
    });
  });

  it('puts each number token on its hex', () => {
    cy.get('[data-cy=hex][data-token]').then($hexes => {
      cy.get('[data-cy=number-token]').then($tokens => {
        expect($tokens.length, 'a token per numbered hex').to.equal($hexes.length);
        Array.from($tokens).forEach((token, i) => {
          expect(translation(token)).to.deep.equal(translation($hexes[i]));
        });
      });
    });
  });

  it('adds a piece for every settlement the game records', () => {
    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
    cy.placeSettlementAndRoad(0);

    cy.get('[data-cy=board-piece]').should('have.length', 1);
    cy.get('[data-cy=board-piece]').should('have.attr', 'data-piece', 'settlement');

    cy.task('botPlaySetupTurn', { id: 'bob' });
    cy.get('[data-cy=board-piece]').should('have.length', 2);
  });
});
