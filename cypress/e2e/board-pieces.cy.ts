/**
 * The three.js piece layer (issue #55).
 *
 * The pieces are drawn on a canvas over the board, so they cannot be asserted on
 * directly. What can be asserted is everything that has to be true around them:
 *
 * - the 3D layer actually starts, and the flat stand-ins step aside when it does
 * - the canvas never intercepts the pointer, which is what keeps every board
 *   interaction and every other spec working exactly as before
 * - the pieces are placed from the game's own coordinates
 *
 * The shape and size of the meshes themselves are covered by `pieces3d.test.ts`, which
 * measures them without needing a graphics context.
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

  it('renders the pieces in 3D and stands the flat fallback down', () => {
    cy.get('[data-cy=piece-canvas]').should('have.attr', 'data-webgl', 'on');
    cy.get('[data-cy=piece-fallback]').should('not.be.visible');

    // The drawing buffer has to match the board region, or the pieces land off the board.
    cy.get('[data-cy=piece-canvas]').then($canvas => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      const box = canvas.getBoundingClientRect();
      cy.get('[data-cy=tabletop-scene]').then($scene => {
        const scene = $scene[0].getBoundingClientRect();
        expect(Math.round(box.width)).to.equal(Math.round(scene.width));
        expect(Math.round(box.height)).to.equal(Math.round(scene.height));
      });
      expect(canvas.width).to.be.greaterThan(0);
      expect(canvas.height).to.be.greaterThan(0);
    });
  });

  it('never lets the piece canvas take a click away from the board', () => {
    cy.get('[data-cy=piece-canvas]').should('have.css', 'pointer-events', 'none');

    // The proof that matters: a settlement can still be placed with the canvas on top.
    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
    cy.get('[data-cy=node][data-legal-target=true]').first().click({ force: true });
    cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 1);
  });

  it('stands the robber on the hex the game says it is on', () => {
    // A piece's board coordinate and a hex's are the same coordinate system — the one
    // the reducer uses. The tokens and the numbered hexes are the same hexes in the same
    // order, so pairing them gives the fixed offset between board and view space, and
    // that offset has to be the same for every one of them.
    cy.get('[data-cy=hex][data-token]').then($hexes => {
      cy.get('[data-cy=number-token]').then($tokens => {
        expect($tokens.length, 'a token per numbered hex').to.equal($hexes.length);

        const offsets = Array.from($tokens).map((token, i) => {
          const [hx, hy] = translation($hexes[i]);
          const el = token as HTMLElement;
          return [hx - parseFloat(el.style.left), hy - parseFloat(el.style.top)] as const;
        });

        const [dx, dy] = offsets[0];
        for (const [ox, oy] of offsets) {
          expect(ox, 'one board-to-view offset for the whole board').to.be.closeTo(dx, 0.5);
          expect(oy).to.be.closeTo(dy, 0.5);
        }

        cy.get('[data-cy=hex][data-resource=desert]').then($desert => {
          const [desertX, desertY] = translation($desert[0]);

          cy.get('[data-cy=robber]').then($robber => {
            const robber = $robber[0] as HTMLElement;
            expect(parseFloat(robber.style.left) + dx, 'robber x').to.be.closeTo(desertX, 0.5);
            expect(parseFloat(robber.style.top) + dy, 'robber y').to.be.closeTo(desertY, 0.5);
          });
        });
      });
    });
  });

  it('adds a piece for every settlement and road the game records', () => {
    cy.get('[data-cy=board-piece]').should('have.length', 0);

    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
    cy.placeSettlementAndRoad(0);

    cy.get('[data-cy=board-piece]').should('have.length', 1);
    cy.get('[data-cy=board-piece]').should('have.attr', 'data-piece', 'settlement');

    cy.task('botPlaySetupTurn', { id: 'bob' });
    cy.get('[data-cy=board-piece]').should('have.length', 2);
  });
});
